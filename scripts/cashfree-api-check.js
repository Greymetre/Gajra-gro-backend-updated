/*
 * Read-only: checks which Cashfree Payouts APIs work for this account, before building the automatic sync.
 *   1. v1 authorize (needed by the v1 APIs below)
 *   2. Account statement   GET /payout/v1/accountStatement   (to replace the Account Statement Excel import)
 *   3. Transfer status V2  GET /payout/transfers?transfer_id= (data the transfer webhook / sync would use)
 *
 * It only reads. No transfer, beneficiary or setting is created or changed. It prints HTTP status, Cashfree's
 * message, row counts and field names only: no secrets, tokens, amounts, names or account numbers.
 *
 * Usage (from the backend folder, on the server whose IP is whitelisted in Cashfree, .env with
 * CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET and optionally DB_URL):
 *   node scripts/cashfree-api-check.js                 # transfer id taken from the latest Cashfree-paid redemption
 *   node scripts/cashfree-api-check.js <transferId>    # or pass a redemption _id / Cashfree transfer id
 */
require('dotenv').config();
const axios = require('axios');

const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const TIMEOUT = 30000;

const pad = (n) => String(n).padStart(2, '0');
const ymdhms = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const describe = (res) => {
  const data = res?.data || {};
  return `HTTP ${res?.status} | status: ${data.status ?? '-'} | subCode: ${data.subCode ?? data.code ?? '-'} | message: ${data.message ?? '-'}`;
};

const ipHint = (res) => {
  const text = JSON.stringify(res?.data || {}).toLowerCase();
  if (res?.status === 403 || text.includes('ip') && text.includes('whitelist')) {
    console.log('   hint: run this on the server whose IP is whitelisted in Cashfree (Payouts > Developers > IP whitelisting)');
  }
};

// returns the axios response for 2xx and 4xx/5xx alike; null only on network errors
const call = async (config) => {
  try {
    return await axios({ timeout: TIMEOUT, validateStatus: () => true, ...config });
  } catch (error) {
    console.log(`   network error: ${error.code || error.message}`);
    return null;
  }
};

async function checkAuthorize() {
  console.log('\n1) v1 authorize  POST https://payout-api.cashfree.com/payout/v1/authorize');
  const res = await call({
    method: 'post',
    url: 'https://payout-api.cashfree.com/payout/v1/authorize',
    data: {},
    headers: { 'x-client-id': CLIENT_ID, 'x-client-secret': CLIENT_SECRET, 'X-Api-Version': '2023-08-01', 'Content-Type': 'application/json' },
  });
  if (!res) return null;
  console.log(`   ${describe(res)}`);
  ipHint(res);
  const token = res.data?.status === 'SUCCESS' ? res.data?.data?.token : null;
  console.log(token ? '   RESULT: OK, token received' : '   RESULT: FAILED, no token');
  return token;
}

async function checkAccountStatement(token) {
  console.log('\n2) Account statement  GET /payout/v1/accountStatement (last 3 days, 5 rows)');
  if (!token) {
    console.log('   skipped: no v1 token');
    return;
  }
  const end = new Date();
  const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
  // The docs give startTime/endTime as UNIX timestamps but their examples use "yyyy-mm-dd hh:mm:ss", so both are tried
  const variants = [
    { label: 'date text', startTime: ymdhms(start), endTime: ymdhms(end) },
    { label: 'unix seconds', startTime: Math.floor(start.getTime() / 1000), endTime: Math.floor(end.getTime() / 1000) },
  ];
  const hosts = ['https://payout-api.cashfree.com/payout/v1/accountStatement', 'https://api.cashfree.com/payout/v1/accountStatement'];

  for (const url of hosts) {
    for (const variant of variants) {
      const res = await call({
        method: 'get',
        url,
        params: { startTime: variant.startTime, endTime: variant.endTime, limit: 5 },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res) continue;
      console.log(`   [${new URL(url).host}, ${variant.label}] ${describe(res)}`);
      ipHint(res);
      const rows = res.data?.data?.batches;
      if (res.data?.status === 'SUCCESS' && Array.isArray(rows)) {
        console.log(`   rows returned: ${rows.length} | hasNext: ${res.data.data.hasNext} | nextCursor present: ${!!res.data.data.nextCursor}`);
        if (rows[0]) console.log(`   row fields: ${Object.keys(rows[0]).join(', ')}`);
        console.log('   RESULT: OK, account statement API works for this account');
        return;
      }
    }
  }
  console.log('   RESULT: NOT AVAILABLE with these calls. Share the lines above with Cashfree support and ask whether');
  console.log('           /payout/v1/accountStatement is enabled for our standard Payouts account.');
}

async function findTransferId() {
  if (process.argv[2]) return process.argv[2];
  if (!process.env.DB_URL) return null;
  const { MongoClient } = require('mongodb');
  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const redemption = await client.db().collection('redemptions').findOne(
      { status: 'Success', 'payment.fundSource': { $exists: true, $ne: '' } },
      { sort: { createdAt: -1 }, projection: { _id: 1 } },
    );
    return redemption ? String(redemption._id) : null;
  } finally {
    await client.close();
  }
}

async function checkTransferStatus() {
  console.log('\n3) Transfer status V2  GET https://api.cashfree.com/payout/transfers?transfer_id=');
  const transferId = await findTransferId();
  if (!transferId) {
    console.log('   skipped: pass a transfer id (node scripts/cashfree-api-check.js <transferId>) or set DB_URL');
    return;
  }
  const res = await call({
    method: 'get',
    url: 'https://api.cashfree.com/payout/transfers',
    params: { transfer_id: transferId },
    headers: { 'x-client-id': CLIENT_ID, 'x-client-secret': CLIENT_SECRET, 'X-Api-Version': '2024-01-01', 'Content-Type': 'application/json' },
  });
  if (!res) return;
  console.log(`   ${describe(res)}`);
  ipHint(res);
  if (res.status === 200 && res.data) {
    const data = res.data;
    console.log(`   transfer status: ${data.status} | status_code: ${data.status_code ?? '-'}`);
    console.log(`   fields: ${Object.keys(data).join(', ')}`);
    if (data.beneficiary_details) console.log(`   beneficiary_details fields: ${Object.keys(data.beneficiary_details).join(', ')}`);
    console.log('   RESULT: OK, transfer details API works (webhook payload has the same shape)');
  } else {
    console.log('   RESULT: FAILED');
  }
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET not set (.env)');
  console.log('Cashfree Payouts API check (read-only)');
  const token = await checkAuthorize();
  await checkAccountStatement(token);
  await checkTransferStatus();
  console.log('\n4) Transfer webhook: cannot be tested from here. In the Cashfree dashboard open');
  console.log('   Payouts > Developers > Webhooks and check that "Add Webhook URL" with version V2 is available.');
  console.log('\nDone. Paste the output above (it has no secrets or customer data).');
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exit(1);
});
