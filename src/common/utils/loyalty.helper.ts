
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