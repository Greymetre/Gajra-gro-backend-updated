import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Loyaltyscheme, LoyaltyschemeDocument } from '../../entities/loyaltyscheme.entity';
import { CreateLoyaltyschemeDto, StatusLoyaltyschemeDto, UpdateLoyaltyschemeDto } from './dto/request-loyaltyscheme.dto';
import { GetLoyaltyschemeInfoDto, GetAllLoyaltyschemeDto } from './dto/response-loyaltyscheme.dto';
import { Request } from 'express';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class LoyaltyschemeService {
  constructor(@InjectModel(Loyaltyscheme.name) private loyaltyschemeModel: Model<LoyaltyschemeDocument>) {}


  

  async getAllLoyaltyscheme(): Promise<any> {
    try {
      const data = await this.loyaltyschemeModel.aggregate([
        { $match: {"active":  true} },
        {
          $project: {
            _id: 1,
            schemeName: { $ifNull: ["$schemeName", ""] },
            schemeDescription: { $ifNull: ["$schemeDescription", ""] },
            startedAt: { $ifNull: ["$startedAt", ""] },
            endedAt: { $ifNull: ["$endedAt", ""] },
            schemeImage: { $ifNull: ["$schemeImage", ""] },
            schemeType: { $ifNull: ["$schemeType", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
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
        'error while getting loyaltyscheme details' +e,
      );
    }
  };

  async getLoyaltyschemeInfo(id: string): Promise<GetLoyaltyschemeInfoDto> {
    try {
      const data = await this.loyaltyschemeModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            schemeName: { $ifNull: ["$schemeName", ""] },
            schemeDescription: { $ifNull: ["$schemeDescription", ""] },
            startedAt: { $ifNull: ["$startedAt", ""] },
            endedAt: { $ifNull: ["$endedAt", ""] },
            schemeImage: { $ifNull: ["$schemeImage", ""] },
            schemeType: { $ifNull: ["$schemeType", ""] },
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
      return new GetLoyaltyschemeInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting loyaltyscheme details' +e,
      );
    }
  };


}