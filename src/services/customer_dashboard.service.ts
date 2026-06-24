import { BadRequestException, Injectable, InternalServerErrorException} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "../entities/customer.entity";
import { SettingCustomer, SettingCustomerDocument} from "src/entities/setting.customer.entity";
import { SettingProject, SettingProjectDocument} from "src/entities/setting.project.entity";
import {Transaction, TransactionDocument,} from "src/entities/transaction.entity";
import { CustomerIdDTO } from "src/dto/dashboard-dto";
const ObjectId = require("mongoose").Types.ObjectId;
  @Injectable()
  export class CustomerDashboardService {
    constructor(
      @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
      @InjectModel(SettingCustomer.name) private settingCustomerModel: Model<SettingCustomerDocument>,
      @InjectModel(SettingProject.name) private projectSettingModel: Model<SettingProjectDocument>,
      @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>
    ) { }

    async getDashboardData(customerIdDto : CustomerIdDTO): Promise<any> {
        try {
          const data = await this.customerModel
            .aggregate([
              { $match: { _id: ObjectId(customerIdDto.customerid) } },
              // {
              //   $lookup: {
              //     from: "transactions",
              //     localField: "_id",
              //     foreignField: "customerid",
              //     pipeline: [
              //       { $project: { _id: 0, transactionType: 1, points: 1 } },
              //     ],
              //     as: "transactionInfo",
              //   },
              // },
              {
                $lookup: {
                  from: "settingcustomers",
                  localField: "_id",
                  foreignField: "customerid",
                  pipeline: [
                    { $project: { _id: 0, points: 1, redemption : 1 } },
                  ],
                  as: "settingCustomerInfo",
                },
              },
              // { $unwind: { path: "$transactionInfo", preserveNullAndEmptyArrays: true } },
              { $unwind: { path: "$settingCustomerInfo", preserveNullAndEmptyArrays: true } },
              
              {
                $project: {
                    _id: 1,
                    firmName: { $ifNull: ["$firmName", ""] },
                    contactPerson: { $ifNull: ["$contactPerson", ""] },
                    customerType: { $ifNull: ["$customerType", ""] },
                    avatar: { $ifNull: ["$avatar", ""] },
                    active: { $ifNull: ["$active", true] },
                    // creditpoint: { $sum: { $cond: [{ $eq: ['$transactionInfo.transactionType', "Cr"] }, '$transactionInfo.points', 0] } },
                    // redeempoint: { $sum: { $cond: [{ $eq: ['$transactionInfo.transactionType', "Dr"] }, '$transactionInfo.points', 0] } },
                    has_seen_welcome: { $ifNull: ["$settingCustomerInfo.points.has_seen_welcome", false] },
                    threshold: { $ifNull: ["$settingCustomerInfo.redemption.threshold", false] },
                    redemption_approved: { $ifNull: ["$settingCustomerInfo.redemption.approved", false] },
                },
              },
              // { $addFields: { "balance": { $subtract: ["$creditpoint", "$redeempoint"] } } },
              { $limit: 1 },
            ])
            .exec();
          if (!data) {
            throw new BadRequestException("Data Not Found");
          }
          return data[0];
        } catch (e) {
          throw new InternalServerErrorException(
            "error while getting customer details" + e
          );
        }
    };

    public async hasSeenWelcome(customerIdDto : CustomerIdDTO): Promise<any> {
      try {
        return await this.settingCustomerModel.findOneAndUpdate(customerIdDto, { $set: { "points.has_seen_welcome" : true } }, { new: true, useFindAndModify: false, upsert: true }).then((setting) => {
          if (!setting) throw new BadRequestException('Error in Seen Welcome');
          return setting;
        });
      }
      catch (e) {
        throw new InternalServerErrorException(e);
      }
    };

    async getCustomerBalancePoint(customerid: any): Promise<any> {
      var result = {}
      const data = await this.transactionModel.aggregate([
        { $match: { customerid: ObjectId(customerid) } },
        {
          $project: {
            _id: 0,
            customerid: { $ifNull: ["$customerid", 0] },
            creditpoint: { $cond: [{ $eq: ['$transactionType', "Cr"] }, '$points', 0] },
            redeempoint: { $cond: [{ $eq: ['$transactionType', "Dr"] }, '$points', 0] }
          }
        },
        {
          $group: {
            _id: "$customerid",
            creditpoint: { $sum: '$creditpoint' },
            redeempoint: { $sum: '$redeempoint' },
          }
        },
        { $addFields: { "balance": { $subtract: ["$creditpoint", "$redeempoint"] } } },
        { $limit: 1 }
      ]).exec()
      return (Array.isArray(data) && data.length) ? data[0] : { _id: null, creditpoint: 0, redeempoint: 0, balance: 0 }
    };

    async addToken(customerIdDto : CustomerIdDTO): Promise<any> {
      await this.customerModel.findOneAndUpdate({ _id:customerIdDto.customerid },
        {
          $set: {
            deviceInfo: {
              deviceToken: customerIdDto.deviceToken,
            },
            loginAt: new Date(),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: false }
      )
        .lean();

        return true
    };
  }
  