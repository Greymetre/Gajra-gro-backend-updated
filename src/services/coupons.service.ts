import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from '../entities/coupon.entity';
import {  StatusCouponDto } from '../user/coupons/dto/request-coupon.dto';
import { GetCouponInfoDto } from '../user/coupons/dto/response-coupon.dto';

const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private couponModel: Model<CouponDocument>) {}

  public async generateCoupons(profile) {

    // const coupon = new this.couponModel();
    // if(coupon.save())
    // {
    //   return new GetCouponInfoDto(coupon)
    // }
    // throw new BadRequestException('Error in Create Coupon');
  };

  async getAllCoupon(): Promise<any> {
    try {
      const data = await this.couponModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beatschedules",
            localField: "beatscheduleid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, title: 1 } }
            ],
            as: "beatscheduleInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            date: { $ifNull: ["$date", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            punchinAt: { $ifNull: ["$punchinAt", ""] },
            punchoutAt: { $ifNull: ["$punchoutAt", ""] },
            workedTime: { $ifNull: ["$workedTime", ""] },
            punchinImage: { $ifNull: ["$punchinImage", ""] },
            punchoutImage: { $ifNull: ["$punchoutImage", ""] },
            punchinLocation: { $ifNull: ["$punchinLocation", {}] },
            punoutLocation: { $ifNull: ["$punoutLocation", {}] },
            type: { $ifNull: ["$type", []] },
            punchinSummary: { $ifNull: ["$punchinSummary", ""] },
            punchoutSummary: { $ifNull: ["$punchoutSummary", ""] },
            title: { $ifNull: ["$beatscheduleInfo.title", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting coupon details' +e,
      );
    }
  };

  async getCouponInfo(id: string): Promise<GetCouponInfoDto> {
    try {
      const data = await this.couponModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beatschedules",
            localField: "beatscheduleid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, title: 1 } }
            ],
            as: "beatscheduleInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            date: { $ifNull: ["$date", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            punchinAt: { $ifNull: ["$punchinAt", ""] },
            punchoutAt: { $ifNull: ["$punchoutAt", ""] },
            workedTime: { $ifNull: ["$workedTime", ""] },
            punchinImage: { $ifNull: ["$punchinImage", ""] },
            punchoutImage: { $ifNull: ["$punchoutImage", ""] },
            punchinLocation: { $ifNull: ["$punchinLocation", {}] },
            punoutLocation: { $ifNull: ["$punoutLocation", {}] },
            type: { $ifNull: ["$type", []] },
            punchinSummary: { $ifNull: ["$punchinSummary", ""] },
            punchoutSummary: { $ifNull: ["$punchoutSummary", ""] },
            title: { $ifNull: ["$beatscheduleInfo.title", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCouponInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting coupon details' +e,
      );
    }
  };

  async deleteCoupon(id: string) : Promise<Coupon> {
    try {
      return await this.couponModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' +e,);
    }
  };

  async updateStatus(statusCouponDto: StatusCouponDto) : Promise<Coupon> {
    try {
      return await this.couponModel.findByIdAndUpdate(statusCouponDto.couponprofileid, { active : statusCouponDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' +e,);
    }
  };

  
}
