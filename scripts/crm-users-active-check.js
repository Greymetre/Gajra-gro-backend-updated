/*
 * Read-only: which CRM users can still log in once inactive users are blocked.
 * Only users with Status = Active (active: true) can log in; users never set to Active count as Inactive,
 * exactly as the CRM user list shows them. Prints role-wise counts and the names of the active users.
 *
 * Usage (from the backend folder, on the server, .env with DB_URL):
 *   node scripts/crm-users-active-check.js
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const users = await client.db().collection('users')
      .find({}, { projection: { firstName: 1, lastName: 1, userType: 1, active: 1 } }).toArray();
    const byRole = {};
    users.forEach((u) => {
      const role = String(u.userType || '(no role)').trim();
      byRole[role] = byRole[role] || { active: 0, inactive: 0 };
      byRole[role][u.active === true ? 'active' : 'inactive']++;
    });
    const active = users.filter((u) => u.active === true);
    console.log(`CRM users: ${users.length} | can log in (Active): ${active.length} | blocked (Inactive): ${users.length - active.length}`);
    Object.entries(byRole).sort().forEach(([role, c]) => console.log(`  ${role}: ${c.active} active, ${c.inactive} inactive`));
    console.log('Active users:');
    active.forEach((u) => console.log(`  ${[u.firstName, u.lastName].filter(Boolean).join(' ')} (${u.userType || '-'})`));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exit(1);
});
