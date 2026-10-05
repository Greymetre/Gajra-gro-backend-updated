import { Model } from 'mongoose';
import { CustomerDocument } from '../../entities/customer.entity';
import { TransactionDocument } from '../../entities/transaction.entity';

/**
 * Mechanic loyalty category, the same matrix as the SFA Mechanic Category report (MechanicCategoryReport on SFA),
 * on the 12 months ending last month (India time):
 *
 *   Value level (total points of the 12 months): HV >= 25,000 | MV 10,000 - 24,999 | LV < 10,000
 *   Frequency level: HF = a scan in all 12 months | MF = a scan in all 4 rolling quarters | LF = anything else
 *   Rolling quarters are 3 month blocks from the start of the period (not financial quarters).
 *
 * Points are every credit (welcome / scheme points too); scans are distinct coupons, as in
 * sfa-sync/mechanics/monthly-summary. Mechanics without a scan in the period get no category.
 * Saved on the customer as loyaltyCategory; every change of category is added to loyaltyCategoryHistory.
 */
export const HIGH_VALUE_POINTS = 25000;
export const MEDIUM_VALUE_POINTS = 10000;
export const PERIOD_MONTHS = 12;
export const MECHANIC_CATEGORIES = ['Platinum', 'Diamond', 'Gold', 'Silver', 'Bronze'];
export const CATEGORY_BY_CODE = {
  'HV-HF': 'Platinum',
  'MV-HF': 'Diamond',
  'HV-MF': 'Gold', 'MV-MF': 'Gold', 'LV-HF': 'Gold',
  'HV-LF': 'Silver', 'MV-LF': 'Silver', 'LV-MF': 'Silver',
  'LV-LF': 'Bronze',
};
const HISTORY_LIMIT = 24;
const IST_OFFSET = 330 * 60 * 1000;

// The 12 months ending at last month (India time), oldest first: ['2025-10', ..., '2026-09']
export function periodMonths(now = new Date()): string[] {
  const ist = new Date(now.getTime() + IST_OFFSET);
  const months = [];
  for (let i = PERIOD_MONTHS; i >= 1; i--) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

// "Oct 2025 to Sep 2026"
export function periodLabel(months: string[]): string {
  const label = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return label(months[0]) + ' to ' + label(months[months.length - 1]);
}

// byMonth: { 'YYYY-MM': { points, scans } }; months: the 12 months of the period, oldest first
export function classifyMechanic(byMonth: Record<string, { points: number; scans: number }>, months: string[]) {
  let points = 0;
  const monthly = months.map((m) => {
    points += byMonth[m]?.points || 0;
    return byMonth[m]?.scans || 0;
  });
  const activeMonths = monthly.filter(Boolean).length;
  const rq = [];
  for (let i = 0; i < monthly.length; i += 3) {
    rq.push(monthly.slice(i, i + 3).reduce((a, b) => a + b, 0));
  }
  const activeQuarters = rq.filter(Boolean).length;
  const value = points >= HIGH_VALUE_POINTS ? 'HV' : points >= MEDIUM_VALUE_POINTS ? 'MV' : 'LV';
  const freq = activeMonths == PERIOD_MONTHS ? 'HF' : activeQuarters == rq.length ? 'MF' : 'LF';
  return {
    category: CATEGORY_BY_CODE[value + '-' + freq],
    levelCode: value + '-' + freq,
    points: Math.round(points * 100) / 100,
    scans: monthly.reduce((a, b) => a + b, 0),
    activeMonths,
    activeQuarters,
  };
}

/**
 * Recomputes loyaltyCategory of every mechanic and saves the ones that changed. Returns counts of the run.
 */
export async function refreshMechanicCategories(
  customerModel: Model<CustomerDocument>,
  transactionModel: Model<TransactionDocument>,
  now = new Date(),
) {
  const months = periodMonths(now);
  const period = periodLabel(months);
  const endMonth = months[months.length - 1];

  // customer id => { month => { points, scans } }, one month per aggregation (as monthly-summary)
  const byCustomer = new Map<string, Record<string, { points: number; scans: number }>>();
  for (const month of months) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1) - IST_OFFSET);
    const to = new Date(Date.UTC(year, mon, 1) - IST_OFFSET);
    const rows = await transactionModel.aggregate([
      { $match: { transactionType: 'Cr', createdAt: { $gte: from, $lt: to } } },
      // one row per customer + coupon first, so a coupon credited by two schemes is one scan
      { $group: { _id: { customerid: '$customerid', coupon: { $ifNull: ['$coupon', ''] } }, points: { $sum: '$points' } } },
      {
        $group: {
          _id: '$_id.customerid',
          points: { $sum: '$points' },
          scans: { $sum: { $cond: [{ $ne: ['$_id.coupon', ''] }, 1, 0] } },
        }
      },
    ]).allowDiskUse(true).exec();
    rows.forEach((r: any) => {
      if (!r._id) return;
      const key = String(r._id);
      if (!byCustomer.has(key)) byCustomer.set(key, {});
      byCustomer.get(key)[month] = { points: r.points || 0, scans: r.scans || 0 };
    });
  }

  const mechanics = await customerModel
    .find({ customerType: /^mechanic$/i })
    .select('loyaltyCategory')
    .lean()
    .exec();

  const updatedAt = new Date();
  const ops = [];
  const counts: Record<string, number> = {};
  MECHANIC_CATEGORIES.forEach((c) => (counts[c] = 0));
  let changed = 0;
  for (const mechanic of mechanics as any[]) {
    const byMonth = byCustomer.get(String(mechanic._id));
    const c = byMonth ? classifyMechanic(byMonth, months) : null;
    const next = c && c.scans > 0 ? c : null;
    const prev = mechanic.loyaltyCategory || null;
    if (next) counts[next.category]++;

    const same = prev && next
      ? prev.category === next.category && prev.levelCode === next.levelCode && prev.points === next.points
        && prev.scans === next.scans && prev.activeMonths === next.activeMonths && prev.endMonth === endMonth
      : !prev?.category && !next;
    if (same) continue;

    const update: any = {
      $set: { loyaltyCategory: next ? { ...next, period, endMonth, updatedAt } : { category: null, period, endMonth, updatedAt } },
    };
    // the first calculation of a mechanic is not a change
    if (prev && (prev.category || null) !== (next?.category || null)) {
      changed++;
      update.$push = {
        loyaltyCategoryHistory: {
          $each: [{ from: prev?.category || null, to: next?.category || null, levelCode: next?.levelCode || null, period, endMonth, changedAt: updatedAt }],
          $slice: -HISTORY_LIMIT,
        },
      };
    }
    ops.push({ updateOne: { filter: { _id: mechanic._id }, update } });
  }

  for (let i = 0; i < ops.length; i += 1000) {
    await customerModel.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
  }
  return { period, mechanics: mechanics.length, saved: ops.length, categoryChanged: changed, counts };
}
