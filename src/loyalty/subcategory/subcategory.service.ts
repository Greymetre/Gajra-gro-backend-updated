import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subcategory, SubcategoryDocument } from '../../entities/subcategory.entity';
import { CreateSubcategoryDto, StatusSubcategoryDto, UpdateSubcategoryDto } from './dto/request-subcategory.dto';
import { GetSubcategoryInfoDto, GetAllSubcategoryDto } from './dto/response-subcategory.dto';
import { Request } from 'express';

const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class SubcategoryService {
  constructor(@InjectModel(Subcategory.name) private subcategoryModel: Model<SubcategoryDocument>) {}

  async getAllSubcategory(): Promise<any> {
    try {
      const data = await this.subcategoryModel.aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "categoryid",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            _id: 1,
            subcategoryName: { $ifNull: ["$subcategoryName", ""] },
            subcategoryDescription: { $ifNull: ["$subcategoryDescription", ""] },
            subcategoryImage: { $ifNull: ["$subcategoryImage", ""] },
            categoryid: { $ifNull: ["$categoryid", ""] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ""] },
            ranking: { $ifNull: ["$ranking", 1000] },
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
        'error while getting subcategory details' +e,
      );
    }
  };

  async getSubcategoryInfo(id: string): Promise<GetSubcategoryInfoDto> {
    try {
      const data = await this.subcategoryModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "categories",
            localField: "categoryid",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            _id: 1,
            subcategoryName: { $ifNull: ["$subcategoryName", ""] },
            subcategoryDescription: { $ifNull: ["$subcategoryDescription", ""] },
            subcategoryImage: { $ifNull: ["$subcategoryImage", ""] },
            categoryid: { $ifNull: ["$categoryid", ""] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ""] },
            ranking: { $ifNull: ["$ranking", 1000] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSubcategoryInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting subcategory details' +e,
      );
    }
  };
}
