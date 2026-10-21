
export async function dateFromFrequency(frequency :string) {
    var todayDate = new Date;
    var firstday = new Date().toISOString().split('T')[0];
    var lastday = new Date().toISOString().split('T')[0];
    switch (frequency) {
        case "daily":
            firstday = new Date().toISOString().split('T')[0]
            lastday = new Date().toISOString().split('T')[0];
          break;
        case "weekly":
          firstday = new Date(todayDate.setDate(todayDate.getDate() - todayDate.getDay())).toISOString().split('T')[0];
          lastday = new Date(todayDate.setDate(todayDate.getDate() - todayDate.getDay() + 6)).toISOString().split('T')[0];
          break;
        case "monthly":
          firstday = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
          lastday = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0]
          break;
        default:
            firstday = new Date().toISOString().split('T')[0]
            lastday = new Date().toISOString().split('T')[0];
          break;
      }
    return { fromDate: firstday, toDate: lastday } ;
}

export async function schemeBasedOnScan(basedOn :string, frequencypoints : any) {
    var data = 1
    switch (basedOn) {
        case 'points':
            data = frequencypoints.points
          break;
        default:
            data = frequencypoints.counts
          break;
      }
    return data
}

/**
 * Mechanic category scheme: basedOn "Percentage" with a percentage per mechanic category (categoryPercentages).
 * The percentage is the TOTAL a mechanic of that category gets on a scan, as a share of the points the other
 * (normal) schemes give for the same coupon: Platinum 250 = 100% from the normal schemes + 150% from this one.
 * Only products listed in the scheme details count. A "Percentage" scheme without categoryPercentages keeps the
 * old meaning (detail points = percentage of MRP).
 */
export function isCategoryScheme(scheme: any): boolean {
  return scheme?.basedOn === 'Percentage' && Array.isArray(scheme?.categoryPercentages) && scheme.categoryPercentages.length > 0;
}

// Extra points of a category scheme for one coupon; 0 when the product is not in it or nothing extra is due
export function categoryBonusPoints(scheme: any, productid: any, mechanicCategory: string, basePoints: number): number {
  if (!isCategoryScheme(scheme) || !mechanicCategory || !(basePoints > 0) || !productid) return 0;
  const inScheme = (scheme.schemeDetail || []).some((detail: any) =>
    Array.isArray(detail.products) && detail.products.some((id: any) => String(id) === String(productid))
  );
  if (!inScheme) return 0;
  const row = scheme.categoryPercentages.find((r: any) => r?.category === mechanicCategory);
  const extra = Number(row?.percentage || 0) - 100;
  return extra > 0 ? Math.round((basePoints * extra) / 100) : 0;
}

// Scheme start/end values are date-only fields stored at 00:00 UTC. Resolve a timestamp to its India
// calendar date so an end date remains valid through 23:59:59 IST.
export function schemeDateFor(date: Date): Date {
  const indiaDate = new Date(date.getTime() + 330 * 60 * 1000);
  return new Date(Date.UTC(indiaDate.getUTCFullYear(), indiaDate.getUTCMonth(), indiaDate.getUTCDate()));
}

/**
 * Coupon points snapshot: when a coupon batch is printed, the points every active Regular (base) scheme gives for
 * its product are frozen into the batch (couponInfo.pointsSnapshot). A coupon with a snapshot is paid those base
 * points instead of the current Regular schemes (changed points, a replacing scheme, an ended scheme), so coupons
 * already in the market keep their printed value. Booster (promo) and category schemes are never frozen: they pay
 * at scan time while active. A coupon without a snapshot is paid by all current active schemes.
 */
export function isFrozenScheme(scheme: any): boolean {
  return scheme?.schemeTag === 'Regular' && !isCategoryScheme(scheme);
}

export function buildPointsSnapshot(schemes: any[], productid: any, mrp: any): { schemeid: any; schemeName: string; customerType: string[]; points: number }[] {
  const snapshot = [];
  for (const scheme of schemes || []) {
    if (!isFrozenScheme(scheme)) continue;
    const detail = (scheme.schemeDetail || []).find((d: any) =>
      Array.isArray(d.products) && d.products.some((id: any) => String(id) === String(productid))
    );
    const value = Number(detail?.points || 0);
    const points = scheme.basedOn === 'Percentage' ? Math.round((value / 100) * Number(mrp || 0)) : value;
    if (points > 0) snapshot.push({ schemeid: scheme._id, schemeName: scheme.schemeName, customerType: scheme.customerType || [], points });
  }
  return snapshot;
}

// Frozen point rows of a coupon batch line for a customer type (each scheme only pays its own customer types),
// or null when the coupon must be paid by the current schemes
export function frozenPointRows(couponInfo: any, customerType: string): { schemeid: any; schemeName: string; points: number }[] | null {
  const rows = (couponInfo?.pointsSnapshot || []).filter((r: any) =>
    Number(r?.points) > 0 && (!Array.isArray(r.customerType) || r.customerType.includes(customerType))
  );
  return rows.length ? rows.map((r: any) => ({ schemeid: r.schemeid, schemeName: r.schemeName, points: Number(r.points) })) : null;
}
