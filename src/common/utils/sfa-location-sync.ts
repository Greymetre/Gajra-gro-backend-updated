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

type LocationType = 'countries' | 'states' | 'districts' | 'cities';

const PAGE_SIZE = 1000;
const WRITE_BATCH = 500;

// SFA server time of the last successful run; the next run only pulls rows changed since then.
// Kept in memory, so after a restart the first run is a full sync.
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

/**
 * Builds the insert / update for one SFA row. The Gajra Gro record is matched on sfaId first, then on
 * its name (and parent), so records that already exist in Gajra Gro are updated and linked, not duplicated.
 */
function planUpsert(
  row: any,
  bySfaId: Map<number, any>,
  byName: Map<string, any>,
  nameKey: string,
  set: Record<string, any>,
  insertOnly: Record<string, any> = {},
) {
  const existing = bySfaId.get(row.sfaId) || byName.get(nameKey);
  const now = new Date();
  if (existing) {
    const doc = { ...existing, ...set, sfaId: row.sfaId };
    bySfaId.set(row.sfaId, doc);
    byName.set(nameKey, doc);
    return { updateOne: { filter: { _id: existing._id }, update: { $set: { ...set, sfaId: row.sfaId, updatedAt: now } } } };
  }
  const _id = new Types.ObjectId();
  const doc = { _id, ...set, sfaId: row.sfaId };
  bySfaId.set(row.sfaId, doc);
  byName.set(nameKey, doc);
  return { insertOne: { document: { _id, ...insertOnly, ...set, sfaId: row.sfaId, createdAt: now, updatedAt: now } } };
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
 * Pulls countries, states, districts and cities from GG SFA and upserts them into Gajra Gro.
 * Only the location masters are written; customer records (their city / state / country text) are never touched.
 * full = true ignores the last run time and re-syncs everything.
 */
export async function syncLocationsFromSfa(deps: SfaLocationSyncDeps, full = false) {
  if (running) {
    return { skipped: true };
  }
  running = true;
  const updatedAfter = full ? null : lastServerTime;
  const result: Record<string, any> = { mode: updatedAfter ? 'incremental' : 'full' };
  try {
    let serverTime: string | null = null;

    // Countries: matched on sfaId, else countryName
    const countries = await fetchAll('countries', updatedAfter);
    serverTime = countries.serverTime;
    const countryIdx = await loadIndex(deps.countryModel, '_id countryName sfaId', (d) => key(d.countryName));
    const countryOps = countries.rows
      .filter((r) => r.name)
      .map((r) => planUpsert(r, countryIdx.bySfaId, countryIdx.byName, key(r.name), { countryName: r.name, active: r.active }));
    result.countries = { received: countries.rows.length, failed: await writeOps(deps.countryModel, countryOps, 'country') };

    const countryOf = (sfaCountryId: any, countryName: any) =>
      countryIdx.bySfaId.get(Number(sfaCountryId)) || countryIdx.byName.get(key(countryName));

    // States: stateName is unique in Gajra Gro, so matched on sfaId, else stateName
    const states = await fetchAll('states', updatedAfter);
    const stateIdx = await loadIndex(deps.stateModel, '_id stateName countryid sfaId', (d) => key(d.stateName));
    const stateOps = states.rows
      .filter((r) => r.name)
      .map((r) => {
        const country = countryOf(r.countryId, r.countryName);
        return planUpsert(r, stateIdx.bySfaId, stateIdx.byName, key(r.name), {
          stateName: r.name,
          active: r.active,
          ...(country ? { countryid: country._id } : {}),
        });
      });
    result.states = { received: states.rows.length, failed: await writeOps(deps.stateModel, stateOps, 'state') };

    const stateOf = (sfaStateId: any, stateName: any) =>
      stateIdx.bySfaId.get(Number(sfaStateId)) || stateIdx.byName.get(key(stateName));

    // Districts: matched on sfaId, else districtName + state
    const districts = await fetchAll('districts', updatedAfter);
    const districtIdx = await loadIndex(deps.districtModel, '_id districtName state sfaId', (d) => `${key(d.districtName)}|${key(d.state)}`);
    const districtOps = districts.rows
      .filter((r) => r.name)
      .map((r) => {
        const state = stateOf(r.stateId, r.stateName);
        const stateName = state?.stateName || r.stateName || '';
        return planUpsert(r, districtIdx.bySfaId, districtIdx.byName, `${key(r.name)}|${key(stateName)}`, {
          districtName: r.name,
          state: stateName,
          country: r.countryName || '',
          active: r.active,
          ...(state ? { stateid: state._id } : {}),
        });
      });
    result.districts = { received: districts.rows.length, failed: await writeOps(deps.districtModel, districtOps, 'district') };

    const districtOf = (sfaDistrictId: any) => districtIdx.bySfaId.get(Number(sfaDistrictId));

    // Cities: matched on sfaId, else cityName + state. Existing pincodes are left as they are.
    const cities = await fetchAll('cities', updatedAfter);
    const cityIdx = await loadIndex(deps.cityModel, '_id cityName state sfaId', (d) => `${key(d.cityName)}|${key(d.state)}`);
    const cityOps = cities.rows
      .filter((r) => r.name)
      .map((r) => {
        const state = stateOf(r.stateId, r.stateName);
        const district = districtOf(r.districtId);
        const stateName = state?.stateName || r.stateName || '';
        return planUpsert(
          r,
          cityIdx.bySfaId,
          cityIdx.byName,
          `${key(r.name)}|${key(stateName)}`,
          {
            cityName: r.name,
            state: stateName,
            country: r.countryName || '',
            district: district?.districtName || r.districtName || '',
            active: r.active,
            ...(district ? { districtid: district._id } : {}),
          },
          { pincode: [] },
        );
      });
    result.cities = { received: cities.rows.length, failed: await writeOps(deps.cityModel, cityOps, 'city') };

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
