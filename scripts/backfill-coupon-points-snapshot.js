/*
 * One-time backfill: freeze the CURRENT scheme points into every coupon batch line (couponprofiles.couponInfo)
 * that has no pointsSnapshot yet, so coupons already in the market keep paying these points after a scheme
 * changes. Only Regular (base) schemes are frozen; Booster/promo schemes are not. Run it while the schemes still hold the old points (e.g. 500), then change the scheme (e.g. to 300).
 * Lines that already have a snapshot are never touched, so it is safe to run again.
 *
 * Usage (from the backend folder, with .env containing DB_URL):
 *   node scripts/backfill-coupon-points-snapshot.js            # dry run: only prints what would change
 *   node scripts/backfill-coupon-points-snapshot.js --apply    # writes the snapshots
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_URL = process.env.DB_URL;

// Same rules as src/common/utils/loyalty.helper.ts (schemeDateFor, isCategoryScheme, buildPointsSnapshot)
function schemeDateFor(date) {
  const indiaDate = new Date(date.getTime() + 330 * 60 * 1000);
  return new Date(Date.UTC(indiaDate.getUTCFullYear(), indiaDate.getUTCMonth(), indiaDate.getUTCDate()));
}
const isCategoryScheme = (scheme) =>
  scheme.basedOn === 'Percentage' && Array.isArray(scheme.categoryPercentages) && scheme.categoryPercentages.length > 0;
// Only Regular (base) schemes are frozen; Booster/promo schemes keep paying at scan time while active
const isFrozenScheme = (scheme) => scheme.schemeTag === 'Regular' && !isCategoryScheme(scheme);

function buildPointsSnapshot(schemes, productid, mrp) {
  const snapshot = [];
  for (const scheme of schemes) {
    if (!isFrozenScheme(scheme)) continue;
    const detail = (scheme.schemeDetail || []).find((d) =>
      Array.isArray(d.products) && d.products.some((id) => String(id) === String(productid))
    );
    const value = Number((detail && detail.points) || 0);
    const points = scheme.basedOn === 'Percentage' ? Math.round((value / 100) * Number(mrp || 0)) : value;
    if (points > 0) snapshot.push({ schemeid: scheme._id, schemeName: scheme.schemeName, customerType: scheme.customerType || [], points });
  }
  return snapshot;
}

async function main() {
  if (!DB_URL) throw new Error('DB_URL not set (.env)');
  const client = await MongoClient.connect(DB_URL);
  const db = client.db();

  const schemeDate = schemeDateFor(new Date());
  const schemes = await db.collection('loyaltyschemes')
    .find({ startedAt: { $lte: schemeDate }, endedAt: { $gte: schemeDate }, active: true })
    .project({ schemeName: 1, schemeTag: 1, schemeDetail: 1, basedOn: 1, categoryPercentages: 1, customerType: 1 })
    .toArray();
  console.log('Active schemes:');
  for (const s of schemes) {
    console.log(`  ${s.schemeName} | tag: ${s.schemeTag || '(none)'} | ${(s.customerType || []).join('/')} | ${isFrozenScheme(s) ? 'FREEZE' : 'not frozen'}`);
  }
  if (!schemes.some(isFrozenScheme)) {
    await client.close();
    throw new Error('No active Regular scheme today, nothing to freeze (set schemeTag "Regular" on the base schemes)');
  }

  const mrpCache = new Map();
  const productMrp = async (productid) => {
    const key = String(productid);
    if (!mrpCache.has(key)) {
      const product = await db.collection('products').findOne({ _id: productid }, { projection: { productDetail: 1 } });
      mrpCache.set(key, product && product.productDetail && product.productDetail[0] ? product.productDetail[0].mrp : 0);
    }
    return mrpCache.get(key);
  };

  const profiles = db.collection('couponprofiles').find(
    { couponInfo: { $elemMatch: { pointsSnapshot: { $exists: false } } } },
    { projection: { profileName: 1, couponInfo: 1 } }
  );

  const ops = [];
  let lines = 0;
  let withoutPoints = 0;
  for await (const profile of profiles) {
    for (const info of profile.couponInfo || []) {
      if (info.pointsSnapshot !== undefined) continue;
      const snapshot = buildPointsSnapshot(schemes, info.productid, await productMrp(info.productid));
      lines++;
      if (!snapshot.length) withoutPoints++;
      ops.push({
        updateOne: {
          filter: { _id: profile._id },
          update: { $set: { 'couponInfo.$[line].pointsSnapshot': snapshot } },
          arrayFilters: [{ 'line._id': info._id, 'line.pointsSnapshot': { $exists: false } }],
        },
      });
      if (!APPLY && lines <= 20) {
        console.log(`  ${profile.profileName} / product ${info.productid}: ${snapshot.map((s) => `${s.schemeName} [${s.customerType.join('/')}] = ${s.points}`).join(', ')}`);
      }
    }
  }

  console.log(`Batch lines to freeze: ${lines} (${withoutPoints} with no scheme points, these keep using current scheme points)`);
  if (APPLY && ops.length) {
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
  console.error(e);
  process.exit(1);
});
