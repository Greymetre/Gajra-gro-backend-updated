/*
 * One-time cleanup: remove diacritics from city names (Mānvi -> Manvi, Mālūr -> Malur),
 * merge the duplicate city documents this produces, and update every place that stores
 * a city name as a string.
 *
 * Usage (from the backend folder, with .env containing DB_URL):
 *   node scripts/normalize-city-names.js            # dry run: only prints what would change
 *   node scripts/normalize-city-names.js --apply    # writes a backup JSON, then applies changes
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_URL = process.env.DB_URL;

// Collections / fields that hold a city name (string or array of strings).
const REFERENCES = [
  { collection: 'customers', fields: ['address.city'] },
  { collection: 'users', fields: ['address.city', 'workingArea'] },
  { collection: 'beats', fields: ['city'] },
  { collection: 'beatschedules', fields: ['cities', 'visitedcities'] },
  { collection: 'loyaltyschemes', fields: ['cities'] },
  { collection: 'packinglists', fields: ['city'] },
  { collection: 'warranties', fields: ['city'] },
];

const stripDiacritics = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const hasDiacritics = (s) => typeof s === 'string' && stripDiacritics(s) !== s;
const keyOf = (c) =>
  [c.cityName, c.state, c.country].map((v) => stripDiacritics(v || '').toLowerCase()).join('|');

const getPath = (doc, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);

async function main() {
  if (!DB_URL) throw new Error('DB_URL not set (.env)');
  const client = await MongoClient.connect(DB_URL);
  const db = client.db();
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  console.log(`DB: ${db.databaseName}  mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const backup = { takenAt: new Date(), cities: [], references: {} };

  // ---- 1. cities: group by normalized (name, state, country) ----
  const cities = await db.collection('cities').find({}).sort({ createdAt: 1, _id: 1 }).toArray();
  const groups = new Map();
  for (const c of cities) {
    const k = keyOf(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }

  const renameMap = new Map(); // old name -> new name, used for references
  const conflicting = new Set();
  const addRename = (from, to) => {
    if (from === to || conflicting.has(from)) return;
    if (renameMap.has(from) && renameMap.get(from) !== to) {
      conflicting.add(from);
      renameMap.delete(from);
      return;
    }
    renameMap.set(from, to);
  };

  const cityOps = [];
  let renamed = 0, deleted = 0;
  for (const group of groups.values()) {
    // Keep a doc that already has a clean name if possible, otherwise the oldest.
    const keep = group.find((c) => !hasDiacritics(c.cityName)) || group[0];
    if (typeof keep.cityName !== 'string') continue;
    const finalName = stripDiacritics(keep.cityName);
    const dups = group.filter((c) => c !== keep);
    const needsChange = keep.cityName !== finalName || dups.length > 0;
    if (!needsChange) continue;

    group.forEach((c) => addRename(c.cityName, finalName));
    backup.cities.push(...group);

    const pincodes = [...new Set(group.flatMap((c) => c.pincode || []).filter(Boolean))];
    const active = group.some((c) => c.active !== false);
    cityOps.push({
      updateOne: {
        filter: { _id: keep._id },
        update: { $set: { cityName: finalName, pincode: pincodes, active } },
      },
    });
    if (dups.length) cityOps.push({ deleteMany: { filter: { _id: { $in: dups.map((d) => d._id) } } } });
    if (keep.cityName !== finalName) renamed++;
    deleted += dups.length;

    console.log(
      `city: ${group.map((c) => `"${c.cityName}"`).join(', ')}  [${keep.state}]  -> "${finalName}"` +
        (dups.length ? `  (merged ${dups.length} duplicate)` : ''),
    );
  }
  console.log(`\ncities: ${renamed} renamed, ${deleted} duplicates to delete\n`);
  if (conflicting.size) {
    console.log(`WARNING: skipped reference rename for ambiguous names: ${[...conflicting].join(', ')}\n`);
  }

  // ---- 2. references: any stored city value with diacritics ----
  const newValue = (v) => (renameMap.has(v) ? renameMap.get(v) : stripDiacritics(v));
  const refOps = {};
  for (const { collection, fields } of REFERENCES) {
    if (!existing.has(collection)) continue;
    const coll = db.collection(collection);
    const ops = [];
    const nonAscii = /[^\x00-\x7F]/;
    const docs = await coll
      .find({ $or: fields.map((f) => ({ [f]: nonAscii })) }, { projection: Object.fromEntries(fields.map((f) => [f, 1])) })
      .toArray();

    for (const doc of docs) {
      const set = {};
      for (const f of fields) {
        const val = getPath(doc, f);
        if (Array.isArray(val)) {
          if (!val.some(hasDiacritics)) continue;
          set[f] = [...new Set(val.map((v) => (typeof v === 'string' ? newValue(v) : v)))];
        } else if (hasDiacritics(val)) {
          set[f] = newValue(val);
        }
      }
      if (Object.keys(set).length) {
        ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
        (backup.references[collection] ||= []).push(doc);
      }
    }
    refOps[collection] = ops;
    console.log(`${collection}: ${ops.length} documents to update`);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write changes.');
    await client.close();
    return;
  }

  const backupFile = path.join(__dirname, `city-normalize-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${backupFile}`);

  if (cityOps.length) await db.collection('cities').bulkWrite(cityOps, { ordered: true });
  for (const [collection, ops] of Object.entries(refOps)) {
    if (ops.length) await db.collection(collection).bulkWrite(ops, { ordered: false });
  }
  console.log('Done.');
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
