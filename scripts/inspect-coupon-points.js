/*
 * Read-only: shows where a coupon's points come from - its batch line snapshot, the product master points,
 * the current Regular scheme points, its own scan transactions, and the points history of its product.
 *
 * Usage (from the backend folder, with .env containing DB_URL):
 *   node scripts/inspect-coupon-points.js XLYPDCDR
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const CODE = process.argv[2];
const DB_URL = process.env.DB_URL;

async function main() {
  if (!CODE) throw new Error('Usage: node scripts/inspect-coupon-points.js <COUPON>');
  if (!DB_URL) throw new Error('DB_URL not set (.env)');
  const client = await MongoClient.connect(DB_URL);
  const db = client.db();

  const coupon = await db.collection('coupons').findOne({ coupon: CODE });
  if (!coupon) throw new Error(`Coupon ${CODE} not found`);
  const profile = await db.collection('couponprofiles').findOne({ _id: coupon.couponProfileid });
  const line = (profile?.couponInfo || []).find((i) => String(i._id) === String(coupon.couponInfoId));
  const product = line && await db.collection('products').findOne({ _id: line.productid }, { projection: { productNo: 1, name: 1, points: 1 } });

  console.log('Coupon       :', CODE, '| type:', coupon.customerType);
  console.log('Batch        :', profile?.profileName, '| created:', profile?.createdAt, '| id:', String(profile?._id));
  console.log('Batch line id:', String(line?._id));
  console.log('Product      :', product?.productNo, '|', product?.name, '| master points:', product?.points);
  console.log('Snapshot     :', JSON.stringify(line?.pointsSnapshot));

  const schemes = await db.collection('loyaltyschemes')
    .find({ active: true, schemeTag: 'Regular', 'schemeDetail.products': line?.productid })
    .project({ schemeName: 1, customerType: 1, startedAt: 1, endedAt: 1, schemeDetail: 1 }).toArray();
  for (const s of schemes) {
    const d = s.schemeDetail.find((x) => (x.products || []).some((id) => String(id) === String(line.productid)));
    console.log('Regular scheme:', s.schemeName, `[${(s.customerType || []).join('/')}]`, '=', d?.points, '| id:', String(s._id));
  }

  const own = await db.collection('transactions').find({ coupon: CODE })
    .project({ points: 1, pointType: 1, schemeid: 1, createdAt: 1, customerType: 1 }).toArray();
  console.log('\nScans of this coupon:');
  for (const t of own) console.log(' ', t.createdAt, '|', t.customerType, '|', t.pointType, '|', t.points);

  // When did this product's points change? One row per points value per scheme, with first/last scan date
  const history = await db.collection('transactions').aggregate([
    { $match: { productid: line?.productid, transactionType: 'Cr' } },
    { $group: { _id: { points: '$points', pointType: '$pointType', customerType: '$customerType' }, first: { $min: '$createdAt' }, last: { $max: '$createdAt' }, scans: { $sum: 1 } } },
    { $sort: { first: 1 } },
  ]).toArray();
  console.log('\nPoints history of this product (all coupons):');
  for (const h of history) {
    console.log(' ', h._id.customerType, '|', h._id.pointType, '| points', h._id.points, '| scans', h.scans, '|', h.first?.toISOString().slice(0, 10), '->', h.last?.toISOString().slice(0, 10));
  }

  await client.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
