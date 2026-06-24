import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Beat, BeatDocument } from '../entities/beat.entity';
import { BeatCustomersDto, BeatUsersDto, CreateBeatDto, StatusBeatDto, UpdateBeatDto } from '../user/beats/dto/request-beat.dto';
import { GetBeatInfoDto } from '../user/beats/dto/response-beat.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';

const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class BeatsService {
  constructor(@InjectModel(Beat.name) private beatModel: Model<BeatDocument>) {}
  public async createBeat(createBeatDto: CreateBeatDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const beat = new this.beatModel({...createBeatDto, createdBy : authInfo._id });
    if(beat.save())
    {
      return new GetBeatInfoDto(beat)
    }
    throw new BadRequestException('Error in Create Beat');
  };

  async getAllBeat(): Promise<any> {
    try {
      const data = await this.beatModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline : [
              { $project : { _id:1, firstName:1 , lastName:1 ,mobile:1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "cusotomers",
            localField: "customerid",
            foreignField: "_id",
            pipeline : [
              { $project : { _id:1, firmName:1 , contactPerson:1 ,mobile:1 } }
            ],
            as: "cusotomerInfo",
          },
        },
        {
          $project: {
            _id: 1,
            beatName: { $ifNull: ["$beatName", ""] },
            description: { $ifNull: ["$description", ""] },
            users: { $ifNull: ["$userInfo", []] },
            cusotomers: { $ifNull: ["$cusotomerInfo", []] },
            city: { $ifNull: ["$city", ""] },
            state: { $ifNull: ["$state", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
      ]).exec()
      if(!data)
      {throw new BadRequestException('Data Not Found')}
      return data;
    } catch (e) {
      throw new InternalServerErrorException('error while getting beat details' +e);
    }
  };

  async getBeatInfo(id: string): Promise<GetBeatInfoDto> {
    try {
      const data = await this.beatModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline : [
              { $project : { _id:1, firstName:1 , lastName:1 ,mobile:1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "cusotomers",
            localField: "customerid",
            foreignField: "_id",
            pipeline : [
              { $project : { _id:1, firmName:1 , contactPerson:1 ,mobile:1 } }
            ],
            as: "cusotomerInfo",
          },
        },
        {
          $project: {
            _id: 1,
            beatName: { $ifNull: ["$beatName", ""] },
            description: { $ifNull: ["$description", ""] },
            users: { $ifNull: ["$userInfo", []] },
            cusotomers: { $ifNull: ["$cusotomerInfo", []] },
            city: { $ifNull: ["$city", ""] },
            state: { $ifNull: ["$state", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetBeatInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting beat details' +e);
    }
  };

  async updateBeatInfo(id: string, updateBeatDto: UpdateBeatDto) : Promise<Beat> {
    try {
      return await this.beatModel.findByIdAndUpdate(id, updateBeatDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beat details' +e,);
    }
  };

  async deleteBeat(id: string) : Promise<Beat> {
    try {
      return await this.beatModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beat details' +e,);
    }
  };

  async updateStatus(statusBeatDto: StatusBeatDto) : Promise<Beat> {
    try {
      return await this.beatModel.findByIdAndUpdate(statusBeatDto.beatid, { active : statusBeatDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beat details' +e,);
    }
  };

  async addUsers(beatUsersDto: BeatUsersDto) : Promise<GetBeatInfoDto> {
    try {
      return await this.beatModel.findByIdAndUpdate(beatUsersDto.beatid, { $push: { userid : beatUsersDto.users } },{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' +e,);
    }
  };

  async deleteUsers(beatUsersDto: BeatUsersDto) : Promise<GetBeatInfoDto> {
    try {
      return await this.beatModel.findByIdAndUpdate(beatUsersDto.beatid, { $pull: { userid: { $in: beatUsersDto.users }}},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' +e,);
    }
  };

  async addCustomers(beatCustomersDto: BeatCustomersDto) : Promise<GetBeatInfoDto> {
    try {
      return await this.beatModel.findByIdAndUpdate(beatCustomersDto.beatid, { $push: { customerid : beatCustomersDto.customers } },{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' +e,);
    }
  };

  async deleteCustomers(beatCustomersDto: BeatCustomersDto) : Promise<GetBeatInfoDto> {
    try {
      return await this.beatModel.findByIdAndUpdate(beatCustomersDto.beatid, { $pull: { customerid: { $in: beatCustomersDto.customers }}},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' +e,);
    }
  };
};