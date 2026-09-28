/*
 * One-time repair: the admin KYC "Upload" button used to overwrite settingcustomers.bankInfo /
 * upiInfo with the form values, which blanked account details and dropped bankInfo.verified /
 * upiInfo.verified for customers who had already completed KYC and redeemed.
 *
 * For every customer with a bank / UPI redemption, this restores the missing values from their
 * latest redemption's payment details (only fields that are currently empty are filled), and
 * restores bankInfo.verified / upiInfo.verified when the customer's KYC flag
 * (verified.bankVerified / verified.upiVerified) is still true.
 *
 * Usage (from the backend folder, with .env containing DB_URL):
 *   node scripts/restore-kyc-bank-upi.js                        # dry run: only prints what would change
 *   node scripts/restore-kyc-bank-upi.js --mobile 9827543221    # dry run for one customer
 *   node scripts/restore-kyc-bank-upi.js --apply                # writes a backup JSON, then applies changes
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const mobileArg = process.argv.indexOf('--mobile');
const MOBILE = mobileArg > -1 ? process.argv[mobileArg + 1] : null;
const DB_URL = process.env.DB_URL;

const empty = (v) => v == null || String(v).trim() === '' || v === 'undefined' || v === 'null';

async function main() {
  if (!DB_URL) throw new Error('DB_URL not set (.env)');
  const client = await MongoClient.connect(DB_URL);
  const db = client.db();
  console.log(`DB: ${db.databaseName}  mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${MOBILE ? `  mobile: ${MOBILE}` : ''}\n`);

  const customerFilter = MOBILE ? { mobile: MOBILE } : {};
  const customers = await db.collection('customers')
    .find(customerFilter, { projection: { firmName: 1, mobile: 1, verified: 1 } })
    .toArray();

  const backup = { takenAt: new Date(), settingcustomers: [] };
  const updates = [];

  for (const customer of customers) {
    // Latest redemption that carried bank / UPI payment details.
    const [bankRed] = await db.collection('redemptions')
      .find({ customerid: customer._id, 'payment.accountNo': { $nin: [null, ''] } })
      .sort({ createdAt: -1, _id: -1 }).limit(1).toArray();
    const [upiRed] = await db.collection('redemptions')
      .find({ customerid: customer._id, 'payment.upiNumber': { $nin: [null, ''] } })
      .sort({ createdAt: -1, _id: -1 }).limit(1).toArray();

    const setting = await db.collection('settingcustomers').findOne({ customerid: customer._id });
    const bank = (setting && setting.bankInfo) || {};
    const upi = (setting && setting.upiInfo) || {};
    const verified = customer.verified || {};
    const $set = {};

    if (bankRed) {
      const p = bankRed.payment;
      for (const key of ['accountNo', 'ifsc', 'holderName', 'bankName']) {
        if (empty(bank[key]) && !empty(p[key])) $set[`bankInfo.${key}`] = String(p[key]).trim();
      }
    }
    if (verified.bankVerified === true && bank.verified !== true && (!empty(bank.accountNo) || $set['bankInfo.accountNo'])) {
      $set['bankInfo.verified'] = true;
    }

    if (upiRed && empty(upi.upiNumber)) $set['upiInfo.upiNumber'] = String(upiRed.payment.upiNumber).trim();
    if (verified.upiVerified === true && upi.verified !== true && (!empty(upi.upiNumber) || $set['upiInfo.upiNumber'])) {
      $set['upiInfo.verified'] = true;
    }

    if (!Object.keys($set).length) continue;
    updates.push({ customer, setting, $set });
    console.log(`${customer.mobile}  ${customer.firmName || ''}`);
    for (const [k, v] of Object.entries($set)) console.log(`    ${k}: ${JSON.stringify(v)}`);
  }

  console.log(`\n${updates.length} customer(s) to repair (checked ${customers.length}).`);

  if (APPLY && updates.length) {
    backup.settingcustomers = updates.map((u) => ({ customerid: u.customer._id, before: u.setting }));
    const file = path.join(__dirname, `restore-kyc-bank-upi-backup-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log(`Backup written: ${file}`);

    for (const u of updates) {
      await db.collection('settingcustomers').updateOne(
        { customerid: u.customer._id },
        { $set: u.$set, $setOnInsert: { customerid: u.customer._id } },
        { upsert: true },
      );
    }
    console.log('Applied.');
  } else if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write changes.');
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
