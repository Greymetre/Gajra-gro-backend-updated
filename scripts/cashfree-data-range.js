/*
 * Read-only: what Cashfree data the CRM has (date range + rows per statement type) and how many account
 * statement rows Cashfree itself has for the same date range. Prints counts and dates only.
 * (Cashfree has no API that lists all transfers, so only the account statement can be compared.)
 *
 * Usage (from the backend folder, on the server, .env with DB_URL and Cashfree keys):
 *   node scripts/cashfree-data-range.js
 */
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const V1 = 'https://payout-api.cashfree.com/payout/v1';
const DAY = 24 * 60 * 60 * 1000;

const ist = (date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
};

// "2026-10-19T10:58:34", "2026-10-19 10:58:34" or "19/10/2026 ..." -> Date (IST)
const parseDate = (value) => {
  const text = String(value || '').trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+05:30`);
  m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00+05:30`);
  return null;
};

async function crmRange(db, type) {
  const docs = await db.collection('cashfreestatements').find({ statementType: type }, { projection: { 'row.Added On': 1 } }).toArray();
  const dates = docs.map((d) => parseDate(d.row && d.row['Added On'])).filter(Boolean).sort((a, b) => a - b);
  return { count: docs.length, from: dates[0], to: dates[dates.length - 1] };
}

async function cashfreeAccountCount(from, to) {
  const { data: auth } = await axios.post(`${V1}/authorize`, {}, {
    headers: { 'x-client-id': process.env.CASHFREE_CLIENT_ID, 'x-client-secret': process.env.CASHFREE_CLIENT_SECRET, 'X-Api-Version': '2023-08-01' },
    timeout: 30000,
  });
  if (auth?.status !== 'SUCCESS') throw new Error(`Cashfree authorize failed: ${auth?.message}`);
  let total = 0;
  for (let start = from.getTime(); start <= to.getTime(); start += DAY) {
    let cursor;
    for (let page = 0; page < 2000; page++) {
      const { data } = await axios.get(`${V1}/accountStatement`, {
        params: { startTime: ist(new Date(start)), endTime: ist(new Date(Math.min(start + DAY, to.getTime() + 1000))), ...(cursor ? { cursor } : {}) },
        headers: { Authorization: `Bearer ${auth.data.token}` },
        timeout: 30000,
      });
      if (data?.status !== 'SUCCESS') throw new Error(`Cashfree account statement failed: ${data?.subCode} ${data?.message}`);
      total += (data.data?.batches || []).length;
      if (!data.data?.hasNext || !data.data?.nextCursor || data.data.nextCursor === cursor) break;
      cursor = data.data.nextCursor;
    }
  }
  return total;
}

async function main() {
  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const db = client.db();
    const account = await crmRange(db, 'ACCOUNT');
    const transfer = await crmRange(db, 'TRANSFER');
    const day = (d) => (d ? ist(d).slice(0, 10) : '-');
    const cashfree = account.from ? await cashfreeAccountCount(account.from, account.to) : 0;
    console.log(
      `CRM Account: ${account.count} rows (${day(account.from)} to ${day(account.to)}) | ` +
      `Cashfree Account same range: ${cashfree} rows | ` +
      `CRM Transfer: ${transfer.count} rows (${day(transfer.from)} to ${day(transfer.to)})`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exit(1);
});
