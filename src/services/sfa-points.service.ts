import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "../entities/customer.entity";
import { Transaction, TransactionDocument } from "../entities/transaction.entity";
import { Redemption, RedemptionDocument } from "../entities/redemption.entity";

/**
 * Points outstanding for the SFA dashboard (Loyalty > Redemption Outstanding), with the same rules as the CRM
 * dashboard's Points card (DashboardService.getOverview):
 *  - earned: every credit, but welcome points only for customers who scanned a QR code (all time)
 *  - redeemed: redemptions that were not rejected / failed
 *  - outstanding: earned - redeemed
 * monthly: each month's earned (scan / welcome / other) and redeemed, and the outstanding balance at its end
 * (all earned - redeemed up to then), months in India time.
 */
@Injectable()
export class SfaPointsService {
    constructor(
        @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
        @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
        @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
    ) { }

    private toNumber(field: string) {
        return { $convert: { input: field, to: "double", onError: 0, onNull: 0 } };
    }

    // { type: "mechanic" | "retailer", months: 12 }
    public async outstanding(body: any): Promise<any> {
        const type = /^retailer$/i.test(String(body?.type || "")) ? "Retailer" : "Mechanic";
        const monthsBack = Math.min(36, Math.max(1, Number(body?.months) || 12));
        const customerIds = await this.customerModel.distinct("_id", { customerType: new RegExp(`^${type}$`, "i") }).exec();
        const month = { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } };
        const isScan = { $ne: [{ $ifNull: ["$coupon", ""] }, ""] };
        const isWelcome = { $regexMatch: { input: { $ifNull: ["$pointType", ""] }, regex: /welcome/i } };

        // customers who ever scanned: only their welcome points count as earned
        const scanners = await this.transactionModel.distinct("customerid", {
            customerid: { $in: customerIds }, transactionType: "Cr", coupon: { $nin: ["", null] },
        }).exec();
        const scannerSet = new Set(scanners.map((id: any) => String(id)));

        // [month, customer] credits split by source; per customer so inactive customers' welcome can be left out
        const credits = await this.transactionModel.aggregate([
            { $match: { customerid: { $in: customerIds }, transactionType: "Cr" } },
            { $addFields: { pts: this.toNumber("$points"), isScan, isWelcome } },
            {
                $group: {
                    _id: { month, customer: "$customerid" },
                    scan: { $sum: { $cond: ["$isScan", "$pts", 0] } },
                    welcome: { $sum: { $cond: [{ $and: [{ $not: ["$isScan"] }, "$isWelcome"] }, "$pts", 0] } },
                    other: { $sum: { $cond: [{ $or: ["$isScan", "$isWelcome"] }, 0, "$pts"] } },
                    scans: { $sum: { $cond: ["$isScan", 1, 0] } },
                },
            },
        ]).allowDiskUse(true).exec();

        const redemptions = await this.redemptionModel.aggregate([
            { $match: { customerid: { $in: customerIds }, status: { $not: /^\s*(rejected|fail|failed)\s*$/i } } },
            { $group: { _id: month, points: { $sum: this.toNumber("$points") }, count: { $sum: 1 } } },
        ]).allowDiskUse(true).exec();

        const byMonth: Record<string, any> = {};
        const at = (m: string) => (byMonth[m] = byMonth[m] || { scan: 0, welcome: 0, other: 0, scans: 0, redeemed: 0, redemptions: 0, customers: new Set() });
        let welcomeAll = 0;
        const welcomeCustomers = new Set<string>();
        for (const row of credits) {
            const m = at(row._id.month);
            const customer = String(row._id.customer);
            welcomeAll += row.welcome;
            if (scannerSet.has(customer)) {
                m.welcome += row.welcome;
                if (row.welcome > 0) welcomeCustomers.add(customer);
            }
            m.scan += row.scan;
            m.other += row.other;
            m.scans += row.scans;
            if (row.scans > 0) m.customers.add(customer);
        }
        for (const row of redemptions) {
            const m = at(row._id);
            m.redeemed += row.points;
            m.redemptions += row.count;
        }

        // running balance over every month, then the last monthsBack (this month included) for the chart
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const thisMonth = key(now);
        const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
        const firstChartMonth = key(start);
        let balance = 0;
        let opening = 0;
        const totals = { scan: 0, welcome: 0, other: 0, scans: 0, redeemed: 0 };
        for (const m of Object.keys(byMonth).sort()) {
            if (m > thisMonth) continue;
            const v = byMonth[m];
            if (m < firstChartMonth) {
                opening += v.scan + v.welcome + v.other - v.redeemed;
            }
            balance += v.scan + v.welcome + v.other - v.redeemed;
            totals.scan += v.scan;
            totals.welcome += v.welcome;
            totals.other += v.other;
            totals.scans += v.scans;
            totals.redeemed += v.redeemed;
        }

        const monthly = [];
        let running = opening;
        for (let d = new Date(start); key(d) <= thisMonth; d.setMonth(d.getMonth() + 1)) {
            const m = key(d);
            const v = byMonth[m] || { scan: 0, welcome: 0, other: 0, scans: 0, redeemed: 0, redemptions: 0, customers: new Set() };
            const earned = v.scan + v.welcome + v.other;
            running += earned - v.redeemed;
            monthly.push({
                month: m,
                earned: Math.round(earned),
                scan: Math.round(v.scan),
                welcome: Math.round(v.welcome),
                other: Math.round(v.other),
                redeemed: Math.round(v.redeemed),
                redemptions: v.redemptions,
                scans: v.scans,
                active: v.customers.size,
                balance: Math.round(running),
            });
        }

        const earned = totals.scan + totals.welcome + totals.other;
        return {
            type,
            earned: Math.round(earned),
            scan: Math.round(totals.scan),
            welcome: Math.round(totals.welcome),
            welcomeCustomers: welcomeCustomers.size,
            welcomeExcluded: Math.round(welcomeAll - totals.welcome),
            other: Math.round(totals.other),
            redeemed: Math.round(totals.redeemed),
            outstanding: Math.round(balance),
            opening: Math.round(opening),
            monthly,
        };
    }
}
