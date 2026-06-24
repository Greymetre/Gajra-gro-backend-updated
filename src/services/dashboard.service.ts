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
}