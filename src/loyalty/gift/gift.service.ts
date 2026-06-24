import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCatalogue, GiftCatalogueDocument } from '../../entities/gift.entity';
import { Request } from 'express';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class GiftService {
  constructor(@InjectModel(GiftCatalogue.name) private giftModel: Model<GiftCatalogueDocument>) {}
  async getAllGift(): Promise<any> {
    try {
      const data = await this.giftModel.aggregate([
        { $match: {"active":  true} },
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

  async getGiftInfo(id: string): Promise<any> {
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
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting gift details' +e,
      );
    }
  };
}
