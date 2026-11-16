/*
 * Read-only: total entries in the Cashfree Payouts account statement (its full ledger), counted month by month
 * going back from today until 3 empty months in a row (or the date passed as first argument).
 * DEBIT rows are payouts that left the account (successful transfers), CREDIT rows are top-ups.
 * Prints counts and dates only.
 *
 * Usage (from the backend folder, on the server, .env with Cashfree keys):
 *   node scripts/cashfree-total-count.js              # back until 3 empty months
 *   node scripts/cashfree-total-count.js 2025-01-01   # from a fixed date
 */
require('dotenv').config();
const axios = require('axios');

const V1 = 'https://payout-api.cashfree.com/payout/v1';
const DAY = 24 * 60 * 60 * 1000;

const ist = (date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
};

let token = null;
let tokenAt = 0;
const getToken = async () => {
  // v1 tokens are short lived: renew every 4 minutes
  if (token && Date.now() - tokenAt < 4 * 60 * 1000) return token;
  const { data } = await axios.post(`${V1}/authorize`, {}, {
    headers: { 'x-client-id': process.env.CASHFREE_CLIENT_ID, 'x-client-secret': process.env.CASHFREE_CLIENT_SECRET, 'X-Api-Version': '2023-08-01' },
    timeout: 30000,
  });
  if (data?.status !== 'SUCCESS') throw new Error(`Cashfree authorize failed: ${data?.message}`);
  token = data.data.token;
  tokenAt = Date.now();
  return token;
};

let pageLimit = 100;
async function countRange(from, to) {
  const counts = { total: 0, DEBIT: 0, CREDIT: 0, first: null, last: null };
  for (let start = from.getTime(); start < to.getTime(); start += DAY) {
    const end = Math.min(start + DAY, to.getTime());
    let cursor;
    for (let page = 0; page < 2000; page++) {
      const request = async (limit) => (await axios.get(`${V1}/accountStatement`, {
        params: { startTime: ist(new Date(start)), endTime: ist(new Date(end)), ...(limit ? { limit } : {}), ...(cursor ? { cursor } : {}) },
        headers: { Authorization: `Bearer ${await getToken()}` },
        timeout: 30000,
      })).data;
      let data = await request(pageLimit);
      if (data?.status !== 'SUCCESS' && pageLimit) {
        data = await request(null);
        if (data?.status === 'SUCCESS') pageLimit = null;
      }
      if (data?.status !== 'SUCCESS') throw new Error(`Cashfree account statement failed: ${data?.subCode} ${data?.message}`);
      for (const row of data.data?.batches || []) {
        counts.total++;
        const type = String(row.eventType || '').toUpperCase();
        if (type in counts) counts[type]++;
        const time = String(row.txTime || '');
        if (time && (!counts.first || time < counts.first)) counts.first = time;
        if (time && (!counts.last || time > counts.last)) counts.last = time;
      }
      if (!data.data?.hasNext || !data.data?.nextCursor || data.data.nextCursor === cursor) break;
      cursor = data.data.nextCursor;
    }
  }
  return counts;
}

async function main() {
  const fixedFrom = process.argv[2] ? new Date(`${process.argv[2]}T00:00:00+05:30`) : null;
  if (process.argv[2] && Number.isNaN(fixedFrom.getTime())) throw new Error('Date must be YYYY-MM-DD');

  const totals = { total: 0, DEBIT: 0, CREDIT: 0, first: null, last: null };
  let monthEnd = new Date();
  let emptyMonths = 0;
  while (true) {
    const monthStart = new Date(monthEnd.getTime() - 30 * DAY);
    const from = fixedFrom && monthStart < fixedFrom ? fixedFrom : monthStart;
    const c = await countRange(from, monthEnd);
    process.stderr.write(`  ${ist(from).slice(0, 10)} to ${ist(monthEnd).slice(0, 10)}: ${c.total} entries\n`);
    totals.total += c.total;
    totals.DEBIT += c.DEBIT;
    totals.CREDIT += c.CREDIT;
    if (c.first && (!totals.first || c.first < totals.first)) totals.first = c.first;
    if (c.last && (!totals.last || c.last > totals.last)) totals.last = c.last;
    emptyMonths = c.total ? 0 : emptyMonths + 1;
    if (fixedFrom ? from <= fixedFrom : emptyMonths >= 3) break;
    monthEnd = from;
  }
  console.log(
    `Cashfree total: ${totals.total} entries (${String(totals.first || '-').slice(0, 10)} to ${String(totals.last || '-').slice(0, 10)}) | ` +
    `DEBIT (payouts): ${totals.DEBIT} | CREDIT (top-ups): ${totals.CREDIT}`,
  );
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exit(1);
});
