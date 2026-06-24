import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CallCenter, CallCenterDocument } from '../entities/callcenter.entity';
import { Customer, CustomerDocument } from '../entities/customer.entity';
import { User, UserDocument } from '../entities/users.entity';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { PaginationRequestDto } from 'src/dto/pagination-dto';
import { CreateCallSummaryDTO, GetCallSummaryDto } from 'src/dto/callcenter-dto';
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";
import { CustomerIdDTO } from 'src/dto/dashboard-dto';

@Injectable()
export class CallCenterService {
  constructor(@InjectModel(CallCenter.name) private callCenterModel: Model<CallCenterDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>) { }
    
  public async createCallSummary(createCallSummaryDto: CreateCallSummaryDTO) {
    const callSummary = new this.callCenterModel(createCallSummaryDto);
    if (callSummary.save()) {
      return new GetCallSummaryDto(callSummary)
    }
    throw new BadRequestException('Error in Create CallSummary');
  };

  async getAllCallSummary(paginationDto: PaginationRequestDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 100
      const data = await this.callCenterModel.aggregate([
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "userInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$userInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
            userName: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
            callType: { $ifNull: ["$callType", ""] },
            callStatus: { $ifNull: ["$callStatus", ""] },
            summary: { $ifNull: ["$summary", ""] },
            notes: { $ifNull: ["$notes", ""] },
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } },
          },
        },
        {
          $match: {
            $or: [
              { firmName: { $regex: paginationDto.search, '$options': 'i' } },
              { contactPerson: { $regex: paginationDto.search, '$options': 'i' } },
              { userName: { $regex: paginationDto.search, '$options': 'i' } },
            ],
          },
        },
        { $sort: { 'createdAt': -1 } },
        {
          $facet: {
            paginate: [
              { $count: "totalDocs" },
              { $addFields: { recordPerPage: recordPerPage, currentPage: currentPage } }
            ],
            docs: [
              { $skip: (currentPage - 1) * recordPerPage },
              { $limit: recordPerPage }
            ]
          }
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException('error while getting callSummary details' + e);
    }
  };
  
  async getCallCenterInfo(id: string): Promise<GetCallSummaryDto> {
    try {
      const data = await this.callCenterModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "userInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$userInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
            userName: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
            callType: { $ifNull: ["$callType", ""] },
            callStatus: { $ifNull: ["$callStatus", ""] },
            summary: { $ifNull: ["$summary", ""] },
            notes: { $ifNull: ["$notes", ""] },
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCallSummaryDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting callcenter details' + e,);
    }
  };

  async updateCallCenterInfo(id: string, updateCallCenterDto: CreateCallSummaryDTO): Promise<CallCenter> {
    try {
      return await this.callCenterModel.findByIdAndUpdate(id, updateCallCenterDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting callcenter details' + e,);
    }
  };

  async deleteCallCenter(id: string): Promise<CallCenter> {
    try {
      return await this.callCenterModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting callcenter details' + e,);
    }
  };

  public async bulkDataInsert(): Promise<any> {
    await axios.get('https://gajragears.fieldkonnect.io/api/allNotesToMlp').then(async (response: any) => {
      if (response?.data?.status === 'success') {
        const mappedArray = await Promise.all(response?.data?.data.map(async (notes: any, index: number) => {
          const customer = await this.customerModel.findOne({ mobile: notes.customerid }).select('_id').exec()
          const user = await this.userModel.findOne({ mobile: notes.userid }).select('_id').exec()
          if (customer && user) {
            notes.userid = user._id
            notes.customerid = customer._id
            await this.callCenterModel.create({ ...notes }, function (err, doc) {
              return doc
            })
          }
        })
        );
      }
    })
      .catch((error) => {
        console.log('error', error);
        throw new BadRequestException(error);
      });
  };

  async getCustomerCallList(customerIdDTO: CustomerIdDTO): Promise<any> {
    try {
      const data = await this.callCenterModel.aggregate([
        { $match: { customerid: ObjectId(customerIdDTO.customerid) } },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "userInfo",
          },
        },
        { $unwind: { "path": "$userInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            userName: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
            callType: { $ifNull: ["$callType", ""] },
            callStatus: { $ifNull: ["$callStatus", ""] },
            summary: { $ifNull: ["$summary", ""] },
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } },
          },
        },
        { $sort: { 'createdAt': -1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCallSummaryDto(data);
    } catch (e) {
      throw new InternalServerErrorException('error while getting callSummary details' + e);
    }
  };
  
  async importCallSummary(createProductDto: CreateCallSummaryDTO[]): Promise<any> {
    try {
      const dataArray = Array.isArray(createProductDto) ? createProductDto : Object.values(createProductDto);
      const mappedArray = await Promise.all(dataArray.map(async (product: any) => {
        product.createdAt = (product.createdAt) ? new Date(product.createdAt) : new Date()
        await this.callCenterModel.create(product, function (err, doc) {
          return doc
        })
      })
      );
      return new GetCallSummaryDto(mappedArray);
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };
}