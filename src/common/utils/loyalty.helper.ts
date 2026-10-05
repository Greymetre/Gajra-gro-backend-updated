
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
