import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "../entities/customer.entity";
const ObjectId = require("mongoose").Types.ObjectId;
import { Transaction, TransactionDocument, } from "src/entities/transaction.entity";
import { Redemption, RedemptionDocument, } from "src/entities/redemption.entity";
import { Coupon, CouponDocument } from "src/entities/coupon.entity";

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
        @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
        @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
        @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    ) { }
    public async getCustomerDashboard(customerType:string): Promise<any> {
        var data = await this.customerModel.aggregate([
            {$match:{customerType:customerType}},
            {
                $group: {
                    _id: "$customerType", 
                    totalCount: { $sum: 1 }, 
                    selfRegistrations: {
                        $sum: { $cond: [{ $not: ["$createdBy"] }, 1, 0] }
                    }, 
                    loginCount: {
                        $sum: { $cond: [{ $not: ["$loginAt"] }, 0, 1] }
                    }
                }
            },
            { $limit: 1 },
        ]).exec()
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    public async getTransactionDashboard(customerType:string): Promise<any> {
        var couponArr = await this.transactionModel.aggregate([
            {$match:{customerType:customerType}},
            { $match: { 
                transactionType: "Cr",
            $and: [
                { coupon: { $ne: "" } },
                { coupon: { $exists: true } }
              ] 
            } },
              {
                $project:{
                    coupon:1,
                    _id:1,
                }
              },
           
        ])

        const uniqueCoupons = couponArr.map(item => item.coupon);
        // const uniqueCoupons = [...new Set(couponArr.map(item => item.coupon))];
        var data = await this.transactionModel.aggregate([
            {
                $lookup: {
                    from: "customers",
                    localField: "customerid",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, customerType:1} },
                        {$match:{customerType:customerType}},
                    ],
                    as: "customerInfo",
                },
            },
            { $match: { transactionType: "Cr" } },
            {
                $unwind: "$customerInfo"
            },
            {
                $group: {
                    _id: {
                        transactionType: "$transactionType", 
                        // customerType: "$customerInfo.customerType" 
                    },
                    totalPoints: {
                        $sum: {
                            "$toInt": "$points"
                        }
                    },
                    scannedPoints: {
                        $sum: { $cond: [{ $ne: ["$pointType", "Welcome Point"] }, "$points", 0] }
                    },
                    welcomePoints: {
                        $sum: { $cond: [{ $eq: ["$pointType", "Welcome Point"] }, "$points", 0] }
                    },
                }
            },
            { $limit: 1 },
        ]).exec()
        if(data.length > 0){
            let returnData = data.map(item => ({
                ...item,
                scannedCount:uniqueCoupons.length,
            
              }));
        return returnData[0]
        }else{
    return []
        }
      
     
    };

    public async getRedemptionPendingApprovalDashboard(customerType:string): Promise<any> {
        var data = await this.redemptionModel.aggregate([
            { $match: { status: "Pending" } },
            {
                $lookup: {
                    from: "customers",
                    localField: "customerid",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, customerType:1} },
                    ],
                    as: "customerInfo",
                },
            },
            {
                $unwind: {
                    path: "$customerInfo",
                    preserveNullAndEmptyArrays: true // Use this if some documents may not have matching `customerInfo`
                }
            },
            {
                $match: {
                    $expr: { $eq: [customerType, "$customerInfo.customerType"] }
                }
            },

            {
                $group: {

                    _id: {
                        status: "$status",
                    },
                    totalPoints: {
                        $sum: {
                            "$toInt": "$points"
                        }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $limit: 1 },
        ]).exec()
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    public async getRedemptionApprovedDashboard(customerType:string): Promise<any> {
        var data = await this.redemptionModel.aggregate([
            { $match: { status: "Approved" } },
            {
                $lookup: {
                    from: "customers",
                    localField: "customerid",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, customerType:1} },
  
                    ],
                    as: "customerInfo",
                },
            },
            {
                $unwind: {
                    path: "$customerInfo",
                    preserveNullAndEmptyArrays: true // Use this if some documents may not have matching `customerInfo`
                }
            },
            {
                $match: {
                    $expr: { $eq: [customerType, "$customerInfo.customerType"] }
                }
            },
            {
                $group: {
                    _id: {
                        status: "$status",
                        // customerType: "$customerInfo.customerType" 
                    },
                    totalPoints: {
                        $sum: {
                            "$toInt": "$points"
                        }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $limit: 1 },
        ]).exec()
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    public async getRedemptionDashboard(customerType:string): Promise<any> {
        var data = await this.redemptionModel.aggregate([
            {$match:{status:{$ne:"Rejected"}}},
            {
                $lookup: {
                    from: "customers",
                    localField: "customerid",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, customerType:1} },
                      
                    ],
                    as: "customerInfo",
                },
            },
            {
                $unwind: {
                    path: "$customerInfo",
                    preserveNullAndEmptyArrays: true // Use this if some documents may not have matching `customerInfo`
                }
            },
            {
                $match: {
                    $expr: { $eq: [customerType, "$customerInfo.customerType"] }
                }
            },
            {
                $group: {
                    _id: {
                        status: "$status",
                        // customerType: "$customerInfo.customerType" 
                    },
                    totalPoints: {
                        $sum: {
                            "$toInt": "$points"
                        }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $limit: 1 },
        ]).exec()
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    public async getCouponDashboard(customerType:string): Promise<any> {
        var data = await this.couponModel.aggregate([
            {$match:{customerType:customerType}},
            {
                $group: {
                    _id: 0, 
                    totalCount: { $sum: 1 }
                }
            },
            { $limit: 1 },
        ]).exec()
        
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    public async getActiveCustomer(customerType:string): Promise<any> {
        // var data = await this.transactionModel.aggregate([
        //     { $match: { transactionType: "Cr"  } },
        //     // { $match: { transactionType: "Cr" , pointType : 'Coupon Scan'  } },
        //     { $group: { _id: "$customerid" } },
        //     { $group: { _id: null, count: { $sum: 1 } } },
        //     { $limit: 1 },
        // ]).exec()
        // return (Array.isArray(data) && data.length) ? data.count: 0
        var couponArr = await this.transactionModel.aggregate([
            { $match: { transactionType: "Cr",$and: [
                { coupon: { $ne: "" } },
                { coupon: { $exists: true } },
                {customerType:customerType},
              ] } },
            //   {
            //     $lookup: {
            //         from: "customers",
            //         localField: "customerid",
            //         foreignField: "_id",
            //         pipeline: [
            //             { $project: { _id: 1, customerType:1} },
            //             {$match:{customerType:customerType}},
            //         ],
            //         as: "customerInfo",
            //     },
            // },
              {
                $project:{
                    coupon:1,
                    customerid: { $toString: "$customerid" },
                    _id:1,
                    // customerType:{$ifNull:[{$first:"$customerInfo.customerType"},""]}
                }
              },
            //   {$match:{customerType:customerType}},
           
        ])
        const user = (couponArr.map(item => item.customerid));
        if(user.length > 0){
            let uniqueValues = new Set(user);  
            return  uniqueValues.size
        }else{
            return 0
        }
       

    };

    public async getSuccessRedemptionDashboard(customerType:string): Promise<any> {
        var data = await this.redemptionModel.aggregate([
            {$match:{$or:[{status:"success"},{status:"Success"}]}},
            {
                $lookup: {
                    from: "customers",
                    localField: "customerid",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, customerType:1} },
                    ],
                    as: "customerInfo",
                },
            },
            {
                $unwind: {
                    path: "$customerInfo",
                    preserveNullAndEmptyArrays: true 
                }
            },
            {
                $match: {
                    $expr: { $eq: [customerType, "$customerInfo.customerType"] }
                }
            },
            {
                $group: {
                    _id: {
                        status: "$status",
                        // customerType: "$customerInfo.customerType" 
                    },
                    totalPoints: {
                        $sum: {
                            "$toInt": "$points"
                        }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $limit: 1 },
        ]).exec()
        return (Array.isArray(data) && data.length) ? data[0] : {}
    };

    // ---------- Overview used by the CRM dashboard (Mechanic / Retailer tabs) ----------
    // Transactions often have no customerType (welcome points, app scans), so everything is
    // matched on the ids of the customers of that type instead of the customerType field.
    public async getOverview(customerType: string, from?: string, to?: string): Promise<any> {
        const type = /^retailer$/i.test(customerType) ? "Retailer" : "Mechanic";
        const typeCond = { customerType: new RegExp(`^${type}$`, "i") };
        const customerIds = await this.customerModel.distinct("_id", typeCond).exec();

        const range: any = {};
        const start = from ? new Date(from) : null;
        const end = to ? new Date(to) : null;
        if (start && !isNaN(start.getTime())) range.$gte = start;
        if (end && !isNaN(end.getTime())) {
            end.setDate(end.getDate() + 1); // "to" is inclusive
            range.$lt = end;
        }
        const inPeriod = Object.keys(range).length ? { createdAt: range } : {};

        // last 12 months including this one, for the trend chart
        const trendStart = new Date();
        trendStart.setDate(1);
        trendStart.setHours(0, 0, 0, 0);
        trendStart.setMonth(trendStart.getMonth() - 11);

        const [customers, points, trendPoints, redemptions, trendRedemptions, couponsGenerated] = await Promise.all([
            this.customerOverview(typeCond, inPeriod, trendStart),
            this.pointsOverview(customerIds, inPeriod),
            this.monthlyScans(customerIds, trendStart),
            this.redemptionOverview(customerIds, inPeriod),
            this.monthlyRedemptions(customerIds, trendStart),
            this.couponModel.countDocuments({ ...typeCond, ...inPeriod }).exec(),
        ]);

        const months: string[] = [];
        for (let d = new Date(trendStart); d <= new Date(); d.setMonth(d.getMonth() + 1)) {
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
        const byMonth = (rows: any[]) => new Map(rows.map((r) => [r._id, r]));
        const scansByMonth = byMonth(trendPoints);
        const redemptionsByMonth = byMonth(trendRedemptions);
        const newByMonth = byMonth(customers.trend);
        const trend = months.map((month) => ({
            month,
            scannedPoints: scansByMonth.get(month)?.points || 0,
            scans: scansByMonth.get(month)?.scans || 0,
            activeCustomers: scansByMonth.get(month)?.activeCustomers || 0,
            redeemedPoints: redemptionsByMonth.get(month)?.points || 0,
            redemptions: redemptionsByMonth.get(month)?.count || 0,
            newCustomers: newByMonth.get(month)?.count || 0,
        }));

        return {
            customerType: type,
            period: { from: from || null, to: to || null },
            customers: { ...customers.totals, activeInPeriod: points.activeCustomers },
            points: {
                earned: points.earned,
                scanned: points.scanned,
                welcome: points.welcome,
                other: points.earned - points.scanned - points.welcome,
                redeemed: redemptions.redeemedPoints,
                balance: points.earned - redemptions.redeemedPoints,
            },
            coupons: {
                generated: couponsGenerated,
                scanned: points.uniqueCoupons,
                scans: points.scans,
            },
            redemptions: {
                byStatus: redemptions.byStatus,
                byMethod: redemptions.byMethod,
            },
            trend,
            topCustomers: points.topCustomers,
            topStates: customers.topStates,
        };
    }

    private toNumber(field: string) {
        return { $convert: { input: field, to: "double", onError: 0, onNull: 0 } };
    }

    private async customerOverview(typeCond: any, inPeriod: any, trendStart: Date) {
        const [data] = await this.customerModel.aggregate([
            { $match: typeCond },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                selfRegistered: { $sum: { $cond: [{ $ifNull: ["$createdBy", false] }, 0, 1] } },
                                appUsers: { $sum: { $cond: [{ $ifNull: ["$loginAt", false] }, 1, 0] } },
                                blocked: { $sum: { $cond: [{ $eq: ["$active", false] }, 1, 0] } },
                                newInPeriod: inPeriod.createdAt
                                    ? {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        inPeriod.createdAt.$gte ? { $gte: ["$createdAt", inPeriod.createdAt.$gte] } : true,
                                                        inPeriod.createdAt.$lt ? { $lt: ["$createdAt", inPeriod.createdAt.$lt] } : true,
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    }
                                    : { $sum: 1 },
                            },
                        },
                    ],
                    topStates: [
                        { $group: { _id: { $ifNull: ["$address.state", ""] }, customers: { $sum: 1 } } },
                        { $match: { _id: { $nin: ["", null] } } },
                        { $sort: { customers: -1 } },
                        { $limit: 8 },
                        { $project: { _id: 0, state: "$_id", customers: 1 } },
                    ],
                    trend: [
                        { $match: { createdAt: { $gte: trendStart } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } },
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]).allowDiskUse(true).exec();
        const totals = data?.totals?.[0] || {};
        delete totals._id;
        return {
            totals: { total: 0, selfRegistered: 0, appUsers: 0, blocked: 0, newInPeriod: 0, ...totals },
            topStates: data?.topStates || [],
            trend: data?.trend || [],
        };
    }

    private async pointsOverview(customerIds: any[], inPeriod: any) {
        const isScan = { $and: [{ $ne: [{ $ifNull: ["$coupon", ""] }, ""] }] };
        const isWelcome = { $regexMatch: { input: { $ifNull: ["$pointType", ""] }, regex: /welcome/i } };
        const [data] = await this.transactionModel.aggregate([
            { $match: { customerid: { $in: customerIds }, transactionType: "Cr", ...inPeriod } },
            { $addFields: { pts: this.toNumber("$points"), isScan, isWelcome } },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                earned: { $sum: "$pts" },
                                scanned: { $sum: { $cond: ["$isScan", "$pts", 0] } },
                                welcome: { $sum: { $cond: ["$isWelcome", "$pts", 0] } },
                                scans: { $sum: { $cond: ["$isScan", 1, 0] } },
                            },
                        },
                    ],
                    uniqueCoupons: [
                        { $match: { isScan: true } },
                        { $group: { _id: "$coupon" } },
                        { $count: "count" },
                    ],
                    activeCustomers: [
                        { $match: { isScan: true } },
                        { $group: { _id: "$customerid" } },
                        { $count: "count" },
                    ],
                    topCustomers: [
                        { $match: { isScan: true } },
                        { $group: { _id: "$customerid", points: { $sum: "$pts" }, scans: { $sum: 1 } } },
                        { $sort: { points: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: "customers",
                                localField: "_id",
                                foreignField: "_id",
                                pipeline: [{ $project: { firmName: 1, contactPerson: 1, mobile: 1, address: 1, loyaltyCategory: 1 } }],
                                as: "customer",
                            },
                        },
                        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 1,
                                points: 1,
                                scans: 1,
                                firmName: { $ifNull: ["$customer.firmName", ""] },
                                contactPerson: { $ifNull: ["$customer.contactPerson", ""] },
                                mobile: { $ifNull: ["$customer.mobile", ""] },
                                city: { $ifNull: ["$customer.address.city", ""] },
                                state: { $ifNull: ["$customer.address.state", ""] },
                                category: { $ifNull: ["$customer.loyaltyCategory.category", ""] },
                            },
                        },
                    ],
                },
            },
        ]).allowDiskUse(true).exec();
        const totals = data?.totals?.[0] || {};
        return {
            earned: totals.earned || 0,
            scanned: totals.scanned || 0,
            welcome: totals.welcome || 0,
            scans: totals.scans || 0,
            uniqueCoupons: data?.uniqueCoupons?.[0]?.count || 0,
            activeCustomers: data?.activeCustomers?.[0]?.count || 0,
            topCustomers: data?.topCustomers || [],
        };
    }

    private async monthlyScans(customerIds: any[], trendStart: Date) {
        return this.transactionModel.aggregate([
            {
                $match: {
                    customerid: { $in: customerIds },
                    transactionType: "Cr",
                    createdAt: { $gte: trendStart },
                    coupon: { $nin: ["", null] },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    points: { $sum: this.toNumber("$points") },
                    scans: { $sum: 1 },
                    customers: { $addToSet: "$customerid" },
                },
            },
            { $project: { points: 1, scans: 1, activeCustomers: { $size: "$customers" } } },
        ]).allowDiskUse(true).exec();
    }

    // Status spellings differ between payment flows (Success / SUCCESS / success), so they are upper-cased
    private async redemptionOverview(customerIds: any[], inPeriod: any) {
        const [data] = await this.redemptionModel.aggregate([
            { $match: { customerid: { $in: customerIds }, ...inPeriod } },
            {
                $addFields: {
                    pts: this.toNumber("$points"),
                    st: { $toUpper: { $trim: { input: { $ifNull: ["$status", "UNKNOWN"] } } } },
                    method: { $toUpper: { $trim: { input: { $ifNull: ["$type", "OTHER"] } } } },
                },
            },
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: "$st", count: { $sum: 1 }, points: { $sum: "$pts" } } },
                        { $project: { _id: 0, status: "$_id", count: 1, points: 1 } },
                        { $sort: { count: -1 } },
                    ],
                    byMethod: [
                        { $match: { st: { $nin: ["REJECTED", "FAIL", "FAILED"] } } },
                        { $group: { _id: "$method", count: { $sum: 1 }, points: { $sum: "$pts" } } },
                        { $project: { _id: 0, method: "$_id", count: 1, points: 1 } },
                        { $sort: { points: -1 } },
                    ],
                },
            },
        ]).allowDiskUse(true).exec();
        const byStatus = data?.byStatus || [];
        // points leave the wallet unless the redemption was rejected or failed
        const redeemedPoints = byStatus
            .filter((s: any) => !["REJECTED", "FAIL", "FAILED"].includes(s.status))
            .reduce((sum: number, s: any) => sum + s.points, 0);
        return { byStatus, byMethod: data?.byMethod || [], redeemedPoints };
    }

    private async monthlyRedemptions(customerIds: any[], trendStart: Date) {
        return this.redemptionModel.aggregate([
            {
                $match: {
                    customerid: { $in: customerIds },
                    createdAt: { $gte: trendStart },
                    status: { $not: /^(rejected|fail|failed)$/i },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    points: { $sum: this.toNumber("$points") },
                    count: { $sum: 1 },
                },
            },
        ]).allowDiskUse(true).exec();
    }
}

