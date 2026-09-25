import axios from 'axios';
import { Model, Types } from 'mongoose';
import { CountryDocument } from '../../entities/country.entity';
import { StateDocument } from '../../entities/state.entity';
import { DistrictDocument } from '../../entities/district.entity';
import { CityDocument } from '../../entities/city.entity';
import { sfaRequestConfig, sfaUrl } from './sfa-client';

export interface SfaLocationSyncDeps {
  countryModel: Model<CountryDocument>;
  stateModel: Model<StateDocument>;
  districtModel: Model<DistrictDocument>;
  cityModel: Model<CityDocument>;
}

export type LocationType = 'countries' | 'states' | 'districts' | 'cities' | 'pincodes';
export const LOCATION_TYPES: LocationType[] = ['countries', 'states', 'districts', 'cities', 'pincodes'];

const PAGE_SIZE = 1000;
const WRITE_BATCH = 500;

// SFA server time of the last successful pull; { full: false } only pulls rows changed since then
let lastServerTime: string | null = null;
let running = false;

const key = (value: any) => String(value ?? '').trim().toLowerCase();

async function fetchAll(type: LocationType, updatedAfter: string | null) {
  const rows: any[] = [];
  let afterId = 0;
  let serverTime: string | null = null;
  for (;;) {
    const params: Record<string, any> = { type, after_id: afterId, limit: PAGE_SIZE };
    if (updatedAfter) {
      params.updated_after = updatedAfter;
    }
    const response = await axios.get(sfaUrl('locationsToGajraGro'), sfaRequestConfig(params));
    if (response?.data?.status !== 'success') {
      throw new Error(`SFA ${type}: ${response?.data?.message || 'bad response'}`);
    }
    serverTime = serverTime || response.data.server_time;
    rows.push(...(response.data.data || []));
    if (!response.data.has_more) {
      break;
    }
    afterId = response.data.next_after_id;
  }
  return { rows, serverTime };
}

async function writeOps(model: Model<any>, ops: any[], label: string) {
  let failed = 0;
  for (let i = 0; i < ops.length; i += WRITE_BATCH) {
    try {
      await model.bulkWrite(ops.slice(i, i + WRITE_BATCH), { ordered: false });
    } catch (error) {
      // ordered: false keeps going; only the conflicting rows (e.g. a duplicate name) fail
      const errors = error?.writeErrors || [];
      failed += errors.length || 1;
      console.error(`SFA ${label} sync: ${errors.length || 1} rows failed`, errors[0]?.errmsg || error?.message);
    }
  }
  return failed;
}

async function loadIndex(model: Model<any>, fields: string, nameKeyOf: (doc: any) => string) {
  const docs = await model.find({}).select(fields).lean().exec();
  const bySfaId = new Map<number, any>();
  const byName = new Map<string, any>();
  for (const doc of docs) {
    if (doc.sfaId) {
      bySfaId.set(Number(doc.sfaId), doc);
    }
    const k = nameKeyOf(doc);
    // Keep the first match when Gajra Gro already has duplicates
    if (k && !byName.has(k)) {
      byName.set(k, doc);
    }
  }
  return { bySfaId, byName };
}

/**
 * Builds the insert / update for one SFA row. The Gajra Gro record is matched on sfaId first, then on
 * its name (and parent), so records that already exist in Gajra Gro are updated and linked, not duplicated.
 * Returns the previous copy too, so renames can be passed on to child records.
 */
function planUpsert(
  row: any,
  idx: { bySfaId: Map<number, any>; byName: Map<string, any> },
  nameKey: string,
  set: Record<string, any>,
  insertOnly: Record<string, any> = {},
): { previous: any; op: any } {
  const existing = idx.bySfaId.get(row.sfaId) || idx.byName.get(nameKey);
  const now = new Date();
  if (existing) {
    const doc = { ...existing, ...set, sfaId: row.sfaId };
    idx.bySfaId.set(row.sfaId, doc);
    idx.byName.set(nameKey, doc);
    return {
      previous: existing,
      op: { updateOne: { filter: { _id: existing._id }, update: { $set: { ...set, sfaId: row.sfaId, updatedAt: now } } } },
    };
  }
  const _id = new Types.ObjectId();
  const doc = { _id, ...set, sfaId: row.sfaId };
  idx.bySfaId.set(row.sfaId, doc);
  idx.byName.set(nameKey, doc);
  return {
    previous: null,
    op: { insertOne: { document: { _id, ...insertOnly, ...set, sfaId: row.sfaId, createdAt: now, updatedAt: now } } },
  };
}

// SFA deletes rows for real, so a deleted row is switched off here (customers keep their text values)
async function deactivateBySfaId(model: Model<any>, sfaIds: number[]) {
  if (!sfaIds.length) return 0;
  const res: any = await model.updateMany({ sfaId: { $in: sfaIds } }, { $set: { active: false, updatedAt: new Date() } }).exec();
  return res?.modifiedCount ?? res?.nModified ?? 0;
}

/**
 * Upserts one type of SFA rows (from the pull or from an SFA push) into Gajra Gro.
 * Only the location masters are written; customer records are never touched.
 * fullSnapshot = the rows are every SFA row of that type (full pull): for pincodes, SFA pincodes that are no
 * longer sent are removed from their city.
 */
export function applyLocationRows(
  deps: SfaLocationSyncDeps,
  type: LocationType,
  rows: any[],
  deletedIds: number[] = [],
  fullSnapshot = false,
) {
  return serialize(() => applyLocationRowsNow(deps, type, rows, deletedIds, fullSnapshot));
}

// SFA pushes and the pull can arrive together; run one apply at a time (pincodes are read-modify-write)
let applyChain: Promise<any> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = applyChain.then(fn, fn);
  applyChain = next.catch(() => undefined);
  return next;
}

async function applyLocationRowsNow(
  deps: SfaLocationSyncDeps,
  type: LocationType,
  rows: any[],
  deletedIds: number[],
  fullSnapshot: boolean,
) {
  rows = (rows || []).filter((r) => r && r.sfaId && String(r.name ?? '').trim());
  deletedIds = (deletedIds || []).map(Number).filter(Boolean);
  const result = { received: rows.length, deleted: deletedIds.length, failed: 0 };

  if (type === 'countries') {
    const idx = await loadIndex(deps.countryModel, '_id countryName sfaId', (d) => key(d.countryName));
    const plans = rows.map((r) => planUpsert(r, idx, key(r.name), { countryName: r.name, active: r.active }));
    result.failed = await writeOps(deps.countryModel, plans.map((p) => p.op), 'country');
    // Country renamed in SFA: districts / cities keep the country as text
    for (const p of plans) {
      const oldName = p.previous?.countryName;
      const newName = p.op.updateOne?.update.$set.countryName;
      if (oldName && newName && oldName !== newName) {
        await deps.districtModel.updateMany({ country: oldName, sfaId: { $exists: true } }, { $set: { country: newName } }).exec();
        await deps.cityModel.updateMany({ country: oldName, sfaId: { $exists: true } }, { $set: { country: newName } }).exec();
      }
    }
    await deactivateBySfaId(deps.countryModel, deletedIds);
    return result;
  }

  if (type === 'states') {
    const countryIdx = await loadIndex(deps.countryModel, '_id countryName sfaId', (d) => key(d.countryName));
    // stateName is unique in Gajra Gro, so matched on sfaId, else stateName
    const idx = await loadIndex(deps.stateModel, '_id stateName countryid sfaId', (d) => key(d.stateName));
    const plans = rows.map((r) => {
      const country = countryIdx.bySfaId.get(Number(r.countryId)) || countryIdx.byName.get(key(r.countryName));
      return planUpsert(r, idx, key(r.name), {
        stateName: r.name,
        active: r.active,
        ...(country ? { countryid: country._id } : {}),
      });
    });
    result.failed = await writeOps(deps.stateModel, plans.map((p) => p.op), 'state');
    // State renamed in SFA: pass the new name to its districts and their cities
    for (const p of plans) {
      const oldName = p.previous?.stateName;
      const newName = p.op.updateOne?.update.$set.stateName;
      if (oldName && newName && oldName !== newName) {
        const districtIds = await deps.districtModel.find({ stateid: p.previous._id }).distinct('_id').exec();
        await deps.districtModel.updateMany({ stateid: p.previous._id }, { $set: { state: newName } }).exec();
        await deps.cityModel.updateMany({ districtid: { $in: districtIds } }, { $set: { state: newName } }).exec();
      }
    }
    await deactivateBySfaId(deps.stateModel, deletedIds);
    return result;
  }

  if (type === 'districts') {
    const stateIdx = await loadIndex(deps.stateModel, '_id stateName sfaId', (d) => key(d.stateName));
    const idx = await loadIndex(deps.districtModel, '_id districtName state sfaId', (d) => `${key(d.districtName)}|${key(d.state)}`);
    const plans = rows.map((r) => {
      const state = stateIdx.bySfaId.get(Number(r.stateId)) || stateIdx.byName.get(key(r.stateName));
      const stateName = state?.stateName || r.stateName || '';
      return planUpsert(r, idx, `${key(r.name)}|${key(stateName)}`, {
        districtName: r.name,
        state: stateName,
        country: r.countryName || '',
        active: r.active,
        ...(state ? { stateid: state._id } : {}),
      });
    });
    result.failed = await writeOps(deps.districtModel, plans.map((p) => p.op), 'district');
    // District renamed in SFA: pass the new name to its cities
    for (const p of plans) {
      const oldName = p.previous?.districtName;
      const newName = p.op.updateOne?.update.$set.districtName;
      if (oldName && newName && oldName !== newName) {
        await deps.cityModel.updateMany({ districtid: p.previous._id }, { $set: { district: newName } }).exec();
      }
    }
    await deactivateBySfaId(deps.districtModel, deletedIds);
    return result;
  }

  if (type === 'cities') {
    const stateIdx = await loadIndex(deps.stateModel, '_id stateName sfaId', (d) => key(d.stateName));
    const districtIdx = await loadIndex(deps.districtModel, '_id districtName sfaId', () => '');
    // Matched on sfaId, else cityName + state. Existing pincodes are left as they are.
    const idx = await loadIndex(deps.cityModel, '_id cityName state sfaId', (d) => `${key(d.cityName)}|${key(d.state)}`);
    const ops = rows.map((r) => {
      const state = stateIdx.bySfaId.get(Number(r.stateId)) || stateIdx.byName.get(key(r.stateName));
      const district = districtIdx.bySfaId.get(Number(r.districtId));
      const stateName = state?.stateName || r.stateName || '';
      return planUpsert(
        r,
        idx,
        `${key(r.name)}|${key(stateName)}`,
        {
          cityName: r.name,
          state: stateName,
          country: r.countryName || '',
          district: district?.districtName || r.districtName || '',
          active: r.active,
          ...(district ? { districtid: district._id } : {}),
        },
        { pincode: [], sfaPincodes: [] },
      ).op;
    });
    result.failed = await writeOps(deps.cityModel, ops, 'city');
    await deactivateBySfaId(deps.cityModel, deletedIds);
    return result;
  }

  if (type === 'pincodes') {
    result.failed = await applyPincodes(deps, rows, deletedIds, fullSnapshot);
    return result;
  }

  throw new Error(`Unknown location type ${type}`);
}

/**
 * Gajra Gro keeps pincodes as a string list on each city (city.pincode, used by the app and CRM).
 * city.sfaPincodes remembers which of them came from SFA ({ sfaId, pincode, active }), so an SFA pincode
 * that is edited, moved to another city, switched off or deleted is updated there, while pincodes added
 * in Gajra Gro itself are kept.
 */
async function applyPincodes(deps: SfaLocationSyncDeps, rows: any[], deletedIds: number[], fullSnapshot: boolean) {
  const cities = await deps.cityModel.find({}).select('_id sfaId pincode sfaPincodes').lean().exec();
  const bySfaCity = new Map<number, any>();
  const pinOwner = new Map<number, any>();
  const originalSfaPins = new Map<string, Set<string>>();
  for (const city of cities as any[]) {
    city.sfaPincodes = Array.isArray(city.sfaPincodes) ? city.sfaPincodes : [];
    originalSfaPins.set(String(city._id), new Set(city.sfaPincodes.map((p: any) => String(p.pincode))));
    if (city.sfaId) bySfaCity.set(Number(city.sfaId), city);
    for (const p of city.sfaPincodes) pinOwner.set(Number(p.sfaId), city);
  }

  const dirty = new Set<any>();
  const removePin = (sfaId: number) => {
    const owner = pinOwner.get(sfaId);
    if (owner) {
      owner.sfaPincodes = owner.sfaPincodes.filter((p: any) => Number(p.sfaId) !== sfaId);
      pinOwner.delete(sfaId);
      dirty.add(owner);
    }
  };

  let failed = 0;
  const received = new Set<number>();
  for (const r of rows) {
    const sfaId = Number(r.sfaId);
    received.add(sfaId);
    const target = bySfaCity.get(Number(r.cityId));
    removePin(sfaId);
    if (!target) {
      // The city is not in Gajra Gro yet; the next city sync / nightly full sync adds it
      failed++;
      continue;
    }
    target.sfaPincodes.push({ sfaId, pincode: String(r.name).trim(), active: !!r.active });
    pinOwner.set(sfaId, target);
    dirty.add(target);
  }
  for (const sfaId of deletedIds) {
    removePin(sfaId);
  }
  if (fullSnapshot) {
    for (const sfaId of Array.from(pinOwner.keys())) {
      if (!received.has(sfaId)) removePin(sfaId);
    }
  }

  const ops = Array.from(dirty).map((city: any) => {
    const wasSfa = originalSfaPins.get(String(city._id)) || new Set<string>();
    const own = (Array.isArray(city.pincode) ? city.pincode : []).map(String).filter((p: string) => !wasSfa.has(p));
    const fromSfa = city.sfaPincodes.filter((p: any) => p.active).map((p: any) => p.pincode);
    const pincode = Array.from(new Set([...own, ...fromSfa]));
    return { updateOne: { filter: { _id: city._id }, update: { $set: { pincode, sfaPincodes: city.sfaPincodes, updatedAt: new Date() } } } };
  });
  failed += await writeOps(deps.cityModel, ops, 'pincode');
  return failed;
}

/**
 * Pulls countries, states, districts, cities and pincodes from GG SFA (nightly full sync and the CRM
 * "Sync from GG SFA" button). Day to day changes arrive right away through the SFA push (sfa-sync/locations).
 * full = false only pulls rows changed since the last pull.
 */
export async function syncLocationsFromSfa(deps: SfaLocationSyncDeps, full = true) {
  if (running) {
    return { skipped: true };
  }
  running = true;
  const updatedAfter = full ? null : lastServerTime;
  const result: Record<string, any> = { mode: updatedAfter ? 'incremental' : 'full' };
  try {
    let serverTime: string | null = null;
    for (const type of LOCATION_TYPES) {
      const pulled = await fetchAll(type, updatedAfter);
      serverTime = serverTime || pulled.serverTime;
      result[type] = await applyLocationRows(deps, type, pulled.rows, [], !updatedAfter);
    }
    // Only move the cursor forward once every type went through
    if (serverTime) {
      lastServerTime = serverTime;
    }
  } catch (error) {
    result.error = error?.response?.data || error?.message;
    console.error('SFA location sync failed', result.error);
  } finally {
    running = false;
  }
  return result;
}
