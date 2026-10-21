/*
 * One-time fix: the snapshot backfill froze TODAY's scheme points, so a product whose Regular scheme points were
 * changed before the backfill (e.g. GGC81 500 -> 300) got the new value frozen into its old batches as well.
 * For every batch line printed before --before, this compares each frozen row with the points that scheme last
 * actually paid for that product (scan transactions before --before) and restores that value where they differ.
 *
 * Usage (from the backend folder, with .env containing DB_URL):
 *   node scripts/restore-snapshot-from-history.js --before=2026-10-21                     # dry run: lists every change
 *   node scripts/restore-snapshot-from-history.js --before=2026-10-21 --products=GGC81     # only these product numbers
 *   node scripts/restore-snapshot-from-history.js --before=2026-10-21 --apply              # writes (backup JSON first)
 *
 * --before: date (YYYY-MM-DD, IST) the scheme points were changed. Only batches created before it are touched, and
 *           only scans before it count as history, so scans already paid at the new points are ignored.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_URL = process.env.DB_URL;
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
const BEFORE = arg('before');
const PRODUCTS = (arg('products') || '').split(',').map((s) => s.trim()).filter(Boolean);

async function main() {
  if (!DB_URL) throw new Error('DB_URL not set (.env)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(BEFORE || '')) throw new Error('Pass --before=YYYY-MM-DD (the day the points were changed)');
  // start of that day in IST
  const cutoff = new Date(`${BEFORE}T00:00:00+05:30`);
  const client = await MongoClient.connect(DB_URL);
  const db = client.db();

  const productFilter = PRODUCTS.length ? { productNo: { $in: PRODUCTS } } : {};
  const products = await db.collection('products').find(productFilter).project({ productNo: 1 }).toArray();
  const productNo = new Map(products.map((p) => [String(p._id), p.productNo]));
  if (PRODUCTS.length && !products.length) throw new Error(`No product found for ${PRODUCTS.join(', ')}`);

  // last points each scheme actually paid per product before the cutoff
  const lastPaid = new Map();
  const paid = await db.collection('transactions').aggregate([
    { $match: { transactionType: 'Cr', createdAt: { $lt: cutoff }, schemeid: { $exists: true }, productid: { $exists: true }, ...(PRODUCTS.length ? { productid: { $in: products.map((p) => p._id) } } : {}) } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: { productid: '$productid', schemeid: '$schemeid' }, points: { $first: '$points' }, at: { $first: '$createdAt' } } },
  ], { allowDiskUse: true }).toArray();
  for (const p of paid) lastPaid.set(`${p._id.productid}|${p._id.schemeid}`, p);

  const profiles = await db.collection('couponprofiles')
    .find({ createdAt: { $lt: cutoff }, 'couponInfo.pointsSnapshot.0': { $exists: true } })
    .project({ profileName: 1, couponInfo: 1 }).toArray();

  const ops = [];
  const backup = [];
  const summary = new Map();
  for (const profile of profiles) {
    for (const info of profile.couponInfo || []) {
      if (!Array.isArray(info.pointsSnapshot) || !productNo.has(String(info.productid))) continue;
      let changed = false;
      const fixed = info.pointsSnapshot.map((row) => {
        const last = lastPaid.get(`${info.productid}|${row.schemeid}`);
        const lastPoints = last ? Number(last.points) : null;
        if (lastPoints === null || !(lastPoints > 0) || lastPoints === Number(row.points)) return row;
        changed = true;
        const key = `${productNo.get(String(info.productid))} | ${row.schemeName} | ${row.points} -> ${lastPoints} (last paid ${last.at.toISOString().slice(0, 10)})`;
        summary.set(key, (summary.get(key) || 0) + 1);
        return { ...row, points: lastPoints };
      });
      if (!changed) continue;
      backup.push({ profileId: profile._id, lineId: info._id, pointsSnapshot: info.pointsSnapshot });
      ops.push({
        updateOne: {
          filter: { _id: profile._id },
          update: { $set: { 'couponInfo.$[line].pointsSnapshot': fixed } },
          arrayFilters: [{ 'line._id': info._id }],
        },
      });
    }
  }

  console.log(`Batches created before ${BEFORE}: ${profiles.length}`);
  console.log('Changes (product | scheme | frozen -> last paid | batch lines):');
  for (const [key, count] of [...summary.entries()].sort()) console.log(`  ${key} | ${count} lines`);
  console.log(`Batch lines to fix: ${ops.length}`);

  if (APPLY && ops.length) {
    const file = path.join(__dirname, `snapshot-backup-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup));
    console.log(`Backup written: ${file}`);
    for (let i = 0; i < ops.length; i += 500) {
      await db.collection('couponprofiles').bulkWrite(ops.slice(i, i + 500), { ordered: false });
    }
    console.log('Applied.');
  } else if (!APPLY) {
    console.log('Dry run, nothing written. Re-run with --apply.');
  }
  await client.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
