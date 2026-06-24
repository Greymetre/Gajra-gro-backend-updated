import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Beatschedule, BeatscheduleDocument } from '../entities/beatschedule.entity';
import { CreateBeatscheduleDto, StatusBeatscheduleDto, UpdateBeatscheduleDto } from '../user/beatschedules/dto/request-beatschedule.dto';
import { GetBeatscheduleInfoDto } from '../user/beatschedules/dto/response-beatschedule.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';

const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class BeatschedulesService {
  constructor(@InjectModel(Beatschedule.name) private beatscheduleModel: Model<BeatscheduleDocument>) {}

  public async createBeatschedule(createBeatscheduleDto: CreateBeatscheduleDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const beatschedule = new this.beatscheduleModel({...createBeatscheduleDto, createdBy : authInfo._id });
    if(beatschedule.save())
    {
      return new GetBeatscheduleInfoDto(beatschedule)
    }
    throw new BadRequestException('Error in Create Beatschedule');
  };

  async getAllBeatschedule(): Promise<any> {
    try {
      const data = await this.beatscheduleModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beats",
            localField: "beatid",
            foreignField: "_id",
            as: "beatInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: "$beatInfo" },
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
            title: { $ifNull: ["$title", ""] },
            type: { $ifNull: ["$type", []] },
            objectives: { $ifNull: ["$objectives", ""] },
            visitedAt: { $ifNull: ["$visitedAt", ""] },
            cities: { $ifNull: ["$cities", []] },
            visitedcities: { $ifNull: ["$visitedcities", []] },
            beatid: { $ifNull: ["$beatid", ""] },
            beatName: { $ifNull: ["$beatInfo.beatName", ""] },
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
      throw new InternalServerErrorException('error while getting beatschedule details' +e);
    }
  };

  async getBeatscheduleInfo(id: string): Promise<GetBeatscheduleInfoDto> {
    try {
      const data = await this.beatscheduleModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beats",
            localField: "beatid",
            foreignField: "_id",
            as: "beatInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: "$beatInfo" },
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
            title: { $ifNull: ["$title", ""] },
            type: { $ifNull: ["$type", []] },
            objectives: { $ifNull: ["$objectives", ""] },
            visitedAt: { $ifNull: ["$visitedAt", ""] },
            cities: { $ifNull: ["$cities", []] },
            visitedcities: { $ifNull: ["$visitedcities", []] },
            beatid: { $ifNull: ["$beatid", ""] },
            beatName: { $ifNull: ["$beatInfo.beatName", ""] },
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
      return new GetBeatscheduleInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e);
    }
  };

  async updateBeatscheduleInfo(id: string, updateBeatscheduleDto: UpdateBeatscheduleDto) : Promise<Beatschedule> {
    try {
      return await this.beatscheduleModel.findByIdAndUpdate(id, updateBeatscheduleDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e,);
    }
  };

  async deleteBeatschedule(id: string) : Promise<Beatschedule> {
    try {
      return await this.beatscheduleModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e,);
    }
  };

  async updateStatus(statusBeatscheduleDto: StatusBeatscheduleDto) : Promise<Beatschedule> {
    try {
      return await this.beatscheduleModel.findByIdAndUpdate(statusBeatscheduleDto.beatscheduleid, { active : statusBeatscheduleDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e,);
    }
  };
}