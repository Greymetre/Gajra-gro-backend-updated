/*
 * Gives the new Cashfree import / export permissions to one role (default: Admin). Other roles are not touched,
 * so they show these permissions unticked on the Permission page. Safe to run more than once.
 *
 * Usage (from the backend folder, on the server, .env with DB_URL):
 *   node scripts/grant-cashfree-import-export.js                 # dry run for role "Admin"
 *   node scripts/grant-cashfree-import-export.js Admin --apply   # makes the change
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const ROLE = (process.argv.slice(2).find((a) => !a.startsWith('--')) || 'Admin').trim();
const NEW_PERMISSIONS = ['reports.cashfreeimport', 'reports.cashfreeexport'];

async function main() {
  const client = await MongoClient.connect(process.env.DB_URL);
  try {
    const col = client.db().collection('settingprojects');
    const setting = await col.findOne({}, { projection: { permissions: 1 } });
    const roles = Array.isArray(setting?.permissions) ? setting.permissions : [];
    console.log(`Roles: ${roles.map((r) => r.role).join(', ') || '-'}`);
    const index = roles.findIndex((r) => String(r?.role || '').trim().toLowerCase() === ROLE.toLowerCase());
    if (index === -1) throw new Error(`Role "${ROLE}" not found`);

    const current = Array.isArray(roles[index].canAccess) ? roles[index].canAccess : [];
    const missing = NEW_PERMISSIONS.filter((p) => !current.includes(p));
    if (!missing.length) {
      console.log(`Role "${roles[index].role}" already has ${NEW_PERMISSIONS.join(', ')}. Nothing to do.`);
      return;
    }
    console.log(`Will add to role "${roles[index].role}": ${missing.join(', ')}`);
    if (!current.includes('reports.cashfree')) console.log('  Note: this role does not have reports.cashfree (Cashfree page) yet.');
    if (!APPLY) {
      console.log('Dry run, nothing changed. Run again with --apply to add.');
      return;
    }
    // only this role's list changes; matched by its exact stored name
    const result = await col.updateOne(
      { _id: setting._id, 'permissions.role': roles[index].role },
      { $addToSet: { 'permissions.$.canAccess': { $each: missing } } },
    );
    console.log(result.modifiedCount ? `Added. Users with role "${roles[index].role}" get it on their next page load.` : 'Nothing changed.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Grant failed:', error.message);
  process.exit(1);
});
