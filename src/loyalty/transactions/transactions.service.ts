import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../../entities/transaction.entity';
import { Loyaltyscheme, LoyaltyschemeDocument } from '../../entities/loyaltyscheme.entity';
import { Coupon, CouponDocument } from '../../entities/coupon.entity';
import { Customer, CustomerDocument } from '../../entities/customer.entity';
import { InvalidCoupon, InvalidCouponDocument } from '../../entities/invalidcoupon.entity';
import { SettingProject, SettingProjectDocument } from '../../entities/setting.project.entity';
import { CreateTransactionDto, StatusTransactionDto, UpdateTransactionDto } from './dto/request-transaction.dto';
import { GetTransactionInfoDto, GetAllTransactionDto } from './dto/response-transaction.dto';
import { Request } from 'express';
import { getCustomerAuthInfo } from '../../common/utils/jwt.helper';
import { CouponsDTO } from 'src/dto/coupons-dto';
import { QRSCANSETTING } from 'src/common/constants/index';
import { dateFromFrequency, schemeBasedOnScan } from 'src/common/utils/loyalty.helper';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class TransactionsService {

  constructor(@InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Loyaltyscheme.name) private schemeModel: Model<LoyaltyschemeDocument>,
    @InjectModel(InvalidCoupon.name) private invalidCouponModel: Model<InvalidCouponDocument>,
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(SettingProject.name) private projectSettingModel: Model<SettingProjectDocument>,
    ) { }

  async getAllTransaction(req): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.transactionModel.aggregate([
        { $match: { customerid: ObjectId(authInfo._id) } },
        {
          $project: {
            _id: 1,
            coupon: { $ifNull: ["$coupon", ""] },
            customerid: { $ifNull: ["$customerid", ""] },
            invoiceNo: { $ifNull: ["$invoiceNo", ""] },
            points: { $ifNull: ["$points", ""] },
            pointType: { $ifNull: ["$pointType", ""] },
            transactionType: { $ifNull: ["$transactionType", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  async getTransactionInfo(id: string): Promise<GetTransactionInfoDto> {
    try {
      const data = await this.transactionModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            coupon: { $ifNull: ["$coupon", ""] },
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            invoiceNo: { $ifNull: ["$invoiceNo", ""] },
            points: { $ifNull: ["$points", ""] },
            pointType: { $ifNull: ["$pointType", ""] },
            transactionType: { $ifNull: ["$transactionType", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetTransactionInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  async getActiveSchemes(): Promise<any> {
    return await this.schemeModel.find({ startedAt: { $lt: new Date() }, endedAt: { $gt: new Date() }, active: true }).select('schemeDetail schemeType schemeName customerType customers states cities basedOn frequency').exec()
  };

  async getScanedCoupons(toscaned: any): Promise<any> {
    return await this.transactionModel.aggregate([
      { $match: { coupon: { $in: toscaned } } },
      {
        $lookup: {
          from: "customers",
          localField: "customerid",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, customerType: 1, "address.city": 1, "address.state": 1 } }
          ],
          as: "customerInfo",
        },
      },
      { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
      {
        $project: {
          _id: 0,
          coupon: { $ifNull: ["$coupon", ""] },
          customerType: { $ifNull: ["$customerInfo.customerType", ""] },
          city: { $ifNull: ["$customerInfo.address.city", ""] },
          state: { $ifNull: ["$customerInfo.address.state", ""] },
        },
      },
    ]).exec()
  };

  async getCouponsToScans(toscaned: any): Promise<any> {
    return await this.couponModel.aggregate([
      { $match: { coupon: { $in: toscaned } } },
      {
        $lookup: {
          from: "couponprofiles",
          localField: "couponProfileid",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, startDate: 1, expiryDate: 1, customerType: 1 } }
          ],
          as: "profileInfo",
        },
      },
      { $unwind: { "path": "$profileInfo", "preserveNullAndEmptyArrays": true } },
      {
        $project: {
          _id: 0,
          coupon: { $ifNull: ["$coupon", ""] },
          startDate: { $ifNull: ["$profileInfo.startDate", ""] },
          expiryDate: { $ifNull: ["$profileInfo.expiryDate", ""] },
          customerType: { $ifNull: ["$profileInfo.customerType", []] },
        },
      },
    ]).exec()
  };

  async getScanSchemeDetail(getdate: any, customerid : string): Promise<any> {
    var data = await this.transactionModel.aggregate([
      { $match: { createdAt: { $gte: new Date(getdate.fromDate) , $lte: new Date(getdate.toDate) }, customerid: ObjectId(customerid), transactionType: "Cr" } },
      { $group: { _id: null, points: { $sum: "$points" }, counts: { $sum: 1 } } },
      { $limit: 1 },
    ]).exec()
    return (Array.isArray(data) && data.length) ? data[0] : { _id: null, points: 1, counts: 1 }
  };

  async couponScans(couponsDTO: CouponsDTO, req: Request): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      var schemes = await this.getActiveSchemes()
      var toscaned = couponsDTO.coupons.map(function (el) { return el.coupon; });
      const scanedcoupons = await this.getScanedCoupons(toscaned)
      const coupons = await this.getCouponsToScans(toscaned)
      var couponInsert = []
      await Promise.all(couponsDTO.coupons.map(async (item) => {
        var couponInfo = await coupons.filter(function (scaned) { return scaned.coupon == item.coupon; });
        var is_success = true
        if (Array.isArray(couponInfo) && couponInfo.length) {
          var isscaned = await scanedcoupons.filter(function (scaned :any) { return scaned.coupon == item.coupon; });
          // Is already scanned
          if (Array.isArray(isscaned) && isscaned.length) {
            is_success = false
          }
          // Check coupon expiry Date
          if (is_success && couponInfo[0].startDate > new Date() && couponInfo[0].expiryDate < new Date()) {
            is_success = false
          }
          // Check coupon for Customer Type
          if (is_success && !couponInfo[0].customerType.includes(authInfo.customerType)) {
            is_success = false
          }
        }
        else {
          is_success = false
        }
        if (is_success) {
          await Promise.all(schemes.map(async (scheme) => {
            var scheme_success = true
            // Check scheme for Customer Type
            if (!scheme.customerType.includes(authInfo.customerType)) {
              scheme_success = false
            }
            if (scheme_success) {
              // Get Date From Scheme Frequency
              var getdate = await dateFromFrequency(scheme.frequency) 
              // Get Total Points and Counts
              var frequencypoints = await this.getScanSchemeDetail(getdate, authInfo._id)
              // Get Scan count for Scheme Detail
              var detailquery = await schemeBasedOnScan(scheme.basedOn , frequencypoints)
              // Get Scheme Detail
              var schemedetails = await scheme.schemeDetail.filter(function (detail) { return detail.minimum >= detailquery && detail.minimum <= detailquery; });
              // Push Data In Array
              await couponInsert.push({ coupon: item.coupon, customerid: ObjectId(authInfo._id), schemeid: scheme._id, points: schemedetails[0].points, pointType: "Coupon Scan", transactionType: "Cr" });
            }
          }))
        }
      }))
      if (Array.isArray(couponInsert) && couponInsert.length) {
        await this.transactionModel.insertMany(couponInsert).then((result) => {
          return result;
        })
        .catch(err => {
          throw new InternalServerErrorException(err);
        });
      }
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e,);
    }
  };

  async leaderboard(req): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.transactionModel.aggregate([
        { $match: { transactionType: "Cr" } },
        { $group: { _id: "$customerid", total_point: { $sum: "$points" } } },
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: "$customerInfo" },
        {
          $project: {
            _id: 1,
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            points: { $ifNull: ["$total_point", 0] },
          },
        },
        { $sort: { points: -1 } },
        { $limit: 10 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };
}