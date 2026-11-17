/*
 * One-time fix for a mechanic who was paid twice through Cashfree for the same points:
 *  - the second payout is in Cashfree (DEBIT) but its CRM redemption is "Rejected";
 *  - this marks that redemption "Success" (UTR / payment date from the Cashfree transfer, if found)
 *  - and credits the same points to the mechanic ("Double Payment Adjustment"), so the balance stays the same
 *    (earned and redeemed both go up by the same points).
 * No notification is sent. Safe to run more than once: a second run finds nothing to do.
 *
 * Usage (from the backend folder, on the server, .env with DB_URL):
 *   node scripts/fix-double-payment.js 9914543289 2600           # dry run: shows what would change
 *   node scripts/fix-double-payment.js 9914543289 2600 --apply   # makes the change
 * Optional: --refno=16172 to pick one redemption when the mechanic has more than one rejected entry of these points.
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const [mobile, pointsArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const refnoArg = (process.argv.find((a) => a.startsWith('--refno=')) || '').split('=')[1];
const POINT_TYPE = 'Double Payment Adjustment';

const istDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-');

async function main() {
  const points = Number(pointsArg);
  if (!/^\d{10}$/.test(String(mobile || '')) || !(points > 0)) {
    throw new Error('Usage: node scripts/fix-double-payment.js <10 digit mobile> <points> [--refno=N] [--apply]');
  }

  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const db = client.db();
    const customers = await db.collection('customers').find({ mobile }, { projection: { _id: 1, firmName: 1, customerType: 1 } }).toArray();
    if (customers.length !== 1) throw new Error(`Expected 1 customer with this mobile, found ${customers.length}`);
    const customer = customers[0];

    const redemptions = await db.collection('redemptions')
      .find({ customerid: customer._id }, { projection: { refno: 1, points: 1, status: 1, type: 1, createdAt: 1, payment: 1 } })
      .sort({ createdAt: 1 }).toArray();
    console.log(`Customer: ${customer.firmName} (${customer.customerType}) | redemptions: ${redemptions.length}`);
    redemptions.forEach((r) => console.log(`  refno ${r.refno} | ${istDate(r.createdAt)} | ${r.points} | ${r.type} | ${r.status} | UTR ${r.payment?.transactionID || '-'}`));

    const credits = await db.collection('transactions').aggregate([
      { $match: { customerid: customer._id, transactionType: 'Cr' } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]).toArray();
    const earned = credits[0]?.total || 0;
    const redeemed = redemptions.filter((r) => r.status !== 'Rejected').reduce((s, r) => s + (r.points || 0), 0);
    console.log(`Now: earned ${earned} | redeemed ${redeemed} | balance ${earned - redeemed}`);

    const targets = redemptions.filter((r) => r.status === 'Rejected' && r.points === points
      && (!refnoArg || String(r.refno) === refnoArg));
    if (targets.length === 0) {
      console.log(`No Rejected redemption of ${points} points left: nothing to do.`);
      return;
    }
    if (targets.length > 1) throw new Error(`${targets.length} Rejected redemptions of ${points} points; pass --refno=N to pick one`);
    const target = targets[0];

    // Cashfree transfer of this redemption (Transfer Id = redemption _id)
    const transfer = await db.collection('cashfreestatements').findOne(
      { statementType: 'TRANSFER', uniqueId: String(target._id) }, { projection: { row: 1 } },
    );
    const t = transfer?.row || {};
    console.log(`Cashfree transfer of refno ${target.refno}: ${transfer ? `${t.Status} | amount ${t.Amount} | UTR ${t['Bank Reference No'] || '-'} | ${t['Added On']}` : 'not in CRM Cashfree data'}`);
    if (transfer && String(t.Status).toUpperCase() !== 'SUCCESS') {
      console.log(`  Note: Cashfree status is ${t.Status}, not SUCCESS.`);
    }
    const paidSibling = redemptions.find((r) => r.status === 'Success' && r.payment?.fundSource);

    const already = await db.collection('transactions').findOne({ customerid: customer._id, pointType: POINT_TYPE, invoiceNo: `ADJ-${target._id}` });
    const set = {
      status: 'Success',
      statusUpdatedAt: new Date(),
      'payment.details': 'Paid twice in Cashfree; marked Success by double payment fix',
    };
    if (t['Bank Reference No']) set['payment.transactionID'] = t['Bank Reference No'];
    if (t['Added On'] && !Number.isNaN(new Date(t['Added On']).getTime())) set['payment.paymentDate'] = new Date(`${t['Added On'].slice(0, 19)}+05:30`);
    if (!target.payment?.fundSource && paidSibling) set['payment.fundSource'] = paidSibling.payment.fundSource;

    console.log(`Will set refno ${target.refno} to Success${set['payment.transactionID'] ? ` (UTR ${set['payment.transactionID']})` : ''}` +
      `${already ? '' : ` and credit ${points} points (${POINT_TYPE})`}`);
    console.log(`After: earned ${earned + (already ? 0 : points)} | redeemed ${redeemed + points} | balance ${earned + (already ? 0 : points) - redeemed - points}`);
    if (!APPLY) {
      console.log('Dry run, nothing changed. Run again with --apply to fix.');
      return;
    }

    if (!already) {
      for (let attempt = 0; ; attempt++) {
        const last = await db.collection('transactions').find({}, { projection: { refno: 1 } }).sort({ refno: -1 }).limit(1).toArray();
        try {
          await db.collection('transactions').insertOne({
            refno: (last[0]?.refno || 0) + 1,
            customerid: customer._id,
            customerType: customer.customerType,
            points,
            pointType: POINT_TYPE,
            transactionType: 'Cr',
            invoiceNo: `ADJ-${target._id}`,
            redemStatus: 0,
            redemBalance: 0,
            transactionDetail: [],
            active: true,
            createdAt: new Date(),
          });
          break;
        } catch (error) {
          if (error?.code !== 11000 || attempt >= 4) throw error; // refno taken meanwhile: retry
        }
      }
      console.log(`Credited ${points} points.`);
    }
    const result = await db.collection('redemptions').updateOne({ _id: target._id, status: 'Rejected' }, { $set: set });
    console.log(result.modifiedCount ? `Redemption refno ${target.refno} is now Success.` : 'Redemption was already changed.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Fix failed:', error.message);
  process.exit(1);
});
