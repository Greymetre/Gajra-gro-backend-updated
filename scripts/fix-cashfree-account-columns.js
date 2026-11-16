/*
 * One-time fix: account statement rows synced from the Cashfree API before the mapping fix have
 * "Debit/Credit" = CASHFREE TRANSFER / ACCOUNT CREDIT and "Particulars" = DEBIT / CREDIT (swapped).
 * This puts DEBIT/CREDIT back in "Debit/Credit" and PAYOUT_TRANSFER / BANK_TRANSFER in "Particulars".
 * Prints counts only.
 *
 * Usage (from the backend folder, on the server, .env with DB_URL):
 *   node scripts/fix-cashfree-account-columns.js          # dry run: shows what would change
 *   node scripts/fix-cashfree-account-columns.js --apply  # makes the change
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const PARTICULARS = {
  'CASHFREE TRANSFER': 'PAYOUT_TRANSFER',
  'PAYOUT TRANSFER': 'PAYOUT_TRANSFER',
  'ACCOUNT CREDIT': 'BANK_TRANSFER',
  'BANK TRANSFER': 'BANK_TRANSFER',
};
const norm = (v) => {
  const key = String(v || '').toUpperCase().replace(/_/g, ' ').trim();
  return PARTICULARS[key] || key.replace(/\s+/g, '_');
};
const isDc = (v) => v === 'DEBIT' || v === 'CREDIT';

async function main() {
  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const col = client.db().collection('cashfreestatements');
    const rows = await col.find({ statementType: 'ACCOUNT' }, { projection: { 'row.Debit/Credit': 1, 'row.Particulars': 1, 'row.Added On': 1 } }).toArray();
    const ops = [];
    const before = {};
    for (const doc of rows) {
      const dc = String(doc.row?.['Debit/Credit'] || '').toUpperCase().trim();
      const part = String(doc.row?.Particulars || '').toUpperCase().trim();
      const set = {};
      if (isDc(part) && !isDc(dc)) Object.assign(set, { 'row.Debit/Credit': part, 'row.Particulars': norm(dc) });
      else if (isDc(dc) && part && norm(part) !== part) set['row.Particulars'] = norm(part);
      // API rows used "2026-11-16 18:23:40"; the dashboard export uses "2026-11-16T18:23:40"
      const addedOn = String(doc.row?.['Added On'] || '');
      const isoAddedOn = addedOn.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2');
      if (isoAddedOn !== addedOn) set['row.Added On'] = isoAddedOn;
      if (!Object.keys(set).length) continue;
      const k = set['row.Debit/Credit'] || set['row.Particulars'] ? `columns "${dc} / ${part}"` : 'date format only';
      before[k] = (before[k] || 0) + 1;
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
    console.log(`Account rows: ${rows.length} | to fix: ${ops.length}`);
    Object.entries(before).forEach(([k, n]) => console.log(`  ${k}: ${n}`));
    if (!ops.length) return;
    if (!APPLY) {
      console.log('Dry run, nothing changed. Run again with --apply to fix.');
      return;
    }
    const result = await col.bulkWrite(ops, { ordered: false });
    console.log(`Fixed ${result.modifiedCount} rows.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Fix failed:', error.message);
  process.exit(1);
});
