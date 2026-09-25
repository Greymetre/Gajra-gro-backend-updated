import axios from 'axios';
import { Model } from 'mongoose';
import { CustomerDocument } from '../../entities/customer.entity';
import { UserDocument } from '../../entities/users.entity';
import { normalizeMobile, sfaRequestConfig, sfaUrl } from './sfa-client';

export interface SfaCustomerSyncDeps {
  customerModel: Model<CustomerDocument>;
  userModel: Model<UserDocument>;
  getNewRefNo: () => Promise<number>;
  // Runs after a customer is created from SFA (welcome points)
  onCreated?: (doc: any) => Promise<void>;
}

const PAGE_SIZE = 200;
// At most 2000 customers per run; the cron runs every minute, so a big backlog clears over a few runs
const MAX_PAGES_PER_RUN = 10;

let running = false;

/**
 * Pulls the active SFA Mechanic / Retailer customers that are not linked to Gajra Gro yet, creates the missing ones
 * (matched on sfaCustomerId or 10 digit mobile), stores their sfaCustomerId and posts each Gajra Gro _id back
 * to SFA, which removes them from the next pull. Also links the customers that already existed on both sides.
 */
export async function syncCustomersFromSfa(deps: SfaCustomerSyncDeps) {
  // The cron fires every minute; skip while the previous run is still going
  if (running) {
    return { skipped: true };
  }
  running = true;
  const result = { created: 0, linked: 0, failed: 0 };
  try {
    let afterId = 0;
    for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
      const response = await axios.get(
        sfaUrl('allCustomersToGajraMlp'),
        sfaRequestConfig({ after_id: afterId, limit: PAGE_SIZE }),
      );
      if (response?.data?.status !== 'success') {
        break;
      }

      const links = [];
      // One by one: refno is max + 1, so creating in parallel would hand out duplicate refnos
      for (const row of response.data.data || []) {
        try {
          const link = await upsertSfaCustomer(deps, row, result);
          if (link) {
            links.push(link);
          }
        } catch (error) {
          result.failed++;
          console.error('SFA customer sync failed for SFA customer', row?.sfaCustomerId, error?.message);
        }
      }
      if (links.length) {
        await axios.post(sfaUrl('linkGajraGroCustomers'), { links }, sfaRequestConfig());
        result.linked += links.length;
      }

      if (!response.data.has_more) {
        break;
      }
      afterId = response.data.next_after_id;
    }
  } catch (error) {
    console.error('SFA customer sync failed', error?.response?.data || error?.message);
  } finally {
    running = false;
  }
  return result;
}

async function upsertSfaCustomer(deps: SfaCustomerSyncDeps, row: any, result: { created: number }) {
  const sfaCustomerId = Number(row?.sfaCustomerId);
  const mobile = normalizeMobile(row?.mobile);
  if (!sfaCustomerId || mobile.length !== 10 || !row?.customerType) {
    return null;
  }

  const existing = await deps.customerModel
    .findOne({ $or: [{ sfaCustomerId }, { mobile }] })
    .select('_id sfaCustomerId active')
    .exec();
  // An inactive Gajra Gro customer is not synced
  if (existing?.active === false) {
    return null;
  }
  if (existing) {
    // Keep an existing link; a second SFA record with the same mobile is a duplicate in SFA
    if (!existing.sfaCustomerId) {
      await deps.customerModel.updateOne({ _id: existing._id }, { $set: { sfaCustomerId } }).exec();
    }
    return { sfaCustomerId, groCustomerId: existing._id.toString() };
  }

  const [executive, createdBy] = await Promise.all([
    row.executive ? deps.userModel.findOne({ mobile: row.executive }).select('_id').exec() : null,
    row.createdby ? deps.userModel.findOne({ mobile: row.createdby }).select('_id').exec() : null,
  ]);
  const firmName = (row.firmName || row.contactPerson || mobile).toString().trim();
  const customer: any = {
    sfaCustomerId,
    firmName,
    contactPerson: (row.contactPerson || firmName).toString().trim(),
    phoneCode: '+91',
    mobile,
    customerType: row.customerType,
    address: row.address,
    refno: await deps.getNewRefNo(),
    createdAt: new Date(),
    ...(row.email ? { email: row.email.toString().trim() } : {}),
    ...(createdBy ? { createdBy: createdBy._id } : {}),
    ...(executive ? { userAssign: { userid: executive._id } } : {}),
  };

  let doc;
  try {
    doc = await deps.customerModel.create(customer);
  } catch (error) {
    // The email already belongs to another Gajra Gro customer: keep the customer, drop the email
    if (error?.code === 11000 && error?.keyPattern?.email && customer.email) {
      delete customer.email;
      doc = await deps.customerModel.create(customer);
    } else {
      throw error;
    }
  }
  result.created++;
  if (deps.onCreated) {
    await deps.onCreated(doc);
  }
  return { sfaCustomerId, groCustomerId: doc._id.toString() };
}
