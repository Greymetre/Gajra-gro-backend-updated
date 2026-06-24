import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customervisit, CustomervisitDocument } from '../entities/customervisit.entity';
import { CreateCustomervisitDto, StatusCustomervisitDto, UpdateCustomervisitDto } from '../user/customervisit/dto/request-customervisit.dto';
import { GetCustomervisitInfoDto } from '../user/customervisit/dto/response-customervisit.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';

const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class CustomervisitService {
  constructor(@InjectModel(Customervisit.name) private customervisitModel: Model<CustomervisitDocument>) {}

  public async createCustomervisit(createCustomervisitDto: CreateCustomervisitDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const customervisit = new this.customervisitModel({...createCustomervisitDto, createdBy : authInfo._id });
    if(customervisit.save())
    {
      return new GetCustomervisitInfoDto(customervisit)
    }
    throw new BadRequestException('Error in Create Customervisit');
  };

  async getAllCustomervisit(): Promise<any> {
    try {
      const data = await this.customervisitModel.aggregate([
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
            from: "customers",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, avatar: 1 } }
            ],
            as: "customerInfo",
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
        { $unwind: { "path": "$userInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            checkinAt: { $ifNull: ["$checkinAt", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            checkinLocation: { $ifNull: ["$checkinLocation", {}] },
            checkoutAt: { $ifNull: ["$checkoutAt", ""] },
            summary: { $ifNull: ["$summary", ""] },
            summaryType: { $ifNull: ["$summaryType", ""] },
            visitImage: { $ifNull: ["$visitImage", ""] },
            distance: { $ifNull: ["$distance", 0] },
            nextVisitAt: { $ifNull: ["$nextVisitAt", ""] },
            beatscheduleid: { $ifNull: ["$beatscheduleid", ""] },
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
        'error while getting customervisit details' +e,
      );
    }
  };

  async getCustomervisitInfo(id: string): Promise<GetCustomervisitInfoDto> {
    try {
      const data = await this.customervisitModel.aggregate([
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
            from: "customers",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, avatar: 1 } }
            ],
            as: "customerInfo",
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
        { $unwind: { "path": "$userInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            checkinAt: { $ifNull: ["$checkinAt", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            checkinLocation: { $ifNull: ["$checkinLocation", {}] },
            checkoutAt: { $ifNull: ["$checkoutAt", ""] },
            summary: { $ifNull: ["$summary", ""] },
            summaryType: { $ifNull: ["$summaryType", ""] },
            visitImage: { $ifNull: ["$visitImage", ""] },
            distance: { $ifNull: ["$distance", 0] },
            nextVisitAt: { $ifNull: ["$nextVisitAt", ""] },
            beatscheduleid: { $ifNull: ["$beatscheduleid", ""] },
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
      return new GetCustomervisitInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting customervisit details' +e,
      );
    }
  };

  async updateCustomervisitInfo(id: string, updateCustomervisitDto: UpdateCustomervisitDto) : Promise<Customervisit> {
    try {
      return await this.customervisitModel.findByIdAndUpdate(id, updateCustomervisitDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting customervisit details' +e,);
    }
  };

  async deleteCustomervisit(id: string) : Promise<Customervisit> {
    try {
      return await this.customervisitModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting customervisit details' +e,);
    }
  };

  async updateStatus(statusCustomervisitDto: StatusCustomervisitDto) : Promise<Customervisit> {
    try {
      return await this.customervisitModel.findByIdAndUpdate(statusCustomervisitDto.customervisitid, { active : statusCustomervisitDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting customervisit details' +e,);
    }
  };
}
