import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCatalogue, GiftCatalogueDocument } from '../entities/gift.entity';
import { CreateGiftDto, StatusGiftDto, UpdateGiftDto } from '../user/gift/dto/request-gift.dto';
import { GetGiftInfoDto } from '../user/gift/dto/response-gift.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class GiftService {
  constructor(@InjectModel(GiftCatalogue.name) private giftModel: Model<GiftCatalogueDocument>) {}

  public async createGift(createGiftDto: CreateGiftDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const gift = new this.giftModel({...createGiftDto, createdBy : authInfo._id });
    if(gift.save())
    {
      return gift
    }
    throw new BadRequestException('Error in Create Gift');
  };

  async getAllGift(): Promise<any> {
    try {
      const data = await this.giftModel.aggregate([
        {
          $project: {
            _id: 1,
            giftName: { $ifNull: ["$giftName", ""] },
            giftDescription: { $ifNull: ["$giftDescription", ""] },
            brand: { $ifNull: ["$brand", ""] },
            model: { $ifNull: ["$model", ""] },
            mrp: { $ifNull: ["$mrp", 0] },
            price: { $ifNull: ["$price", 0] },
            points: { $ifNull: ["$points", 0] },
            giftType: { $ifNull: ["$giftType", ""] },
            images: { $ifNull: ["$images", []] },
            expirydate : { $ifNull: ["$expirydate", ""] },
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
        'error while getting gift details' +e,
      );
    }
  };

  async getGiftInfo(id: string): Promise<GetGiftInfoDto> {
    try {
      const data = await this.giftModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            giftName: { $ifNull: ["$giftName", ""] },
            giftDescription: { $ifNull: ["$giftDescription", ""] },
            brand: { $ifNull: ["$brand", ""] },
            model: { $ifNull: ["$model", ""] },
            mrp: { $ifNull: ["$mrp", 0] },
            price: { $ifNull: ["$price", 0] },
            points: { $ifNull: ["$points", 0] },
            giftType: { $ifNull: ["$giftType", ""] },
            images: { $ifNull: ["$images", []] },
            expirydate : { $ifNull: ["$expirydate", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetGiftInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting gift details' +e,
      );
    }
  };

  async updateGiftInfo(id: string, updateGiftDto: UpdateGiftDto , req: Request) : Promise<GiftCatalogue> {
    try {
      return await this.giftModel.findByIdAndUpdate(id, updateGiftDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting gift details' +e,);
    }
  };

  async deleteGift(id: string) : Promise<GiftCatalogue> {
    try {
      return await this.giftModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting gift details' +e,);
    }
  };

  async updateStatus(statusGiftDto: StatusGiftDto) : Promise<GiftCatalogue> {
    try {
      return await this.giftModel.findByIdAndUpdate(statusGiftDto.giftid, { active : statusGiftDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting gift details' +e,);
    }
  };
}

