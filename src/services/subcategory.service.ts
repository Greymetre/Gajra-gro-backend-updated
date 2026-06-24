import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subcategory, SubcategoryDocument } from '../entities/subcategory.entity';
import { CreateSubcategoryDto, StatusSubcategoryDto, UpdateSubcategoryDto } from '../user/subcategory/dto/request-subcategory.dto';
import { GetSubcategoryInfoDto } from '../user/subcategory/dto/response-subcategory.dto';
import { Request } from 'express';
import { Category, CategoryDocument } from '../entities/category.entity';
import { RemoveFilesHelper } from 'src/common/utils/helper.service';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";

@Injectable()
export class SubcategoryService {
  constructor(@InjectModel(Subcategory.name) private subcategoryModel: Model<SubcategoryDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) { }
    
  public async createSubcategory(createSubcategoryDto: CreateSubcategoryDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const subcategory = new this.subcategoryModel({ ...createSubcategoryDto, createdBy: authInfo._id });
    if (subcategory.save()) {
      return new GetSubcategoryInfoDto(subcategory)
    }
    throw new BadRequestException('Error in Create Subcategory');
  };

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
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting subcategory details' + e,
      );
    }
  };

  async getSubcategoryInfo(id: string): Promise<GetSubcategoryInfoDto> {
    try {
      const data = await this.subcategoryModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
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
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSubcategoryInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting subcategory details' + e,
      );
    }
  };

  async updateSubcategoryInfo(id: string, updateSubcategoryDto: UpdateSubcategoryDto): Promise<Subcategory> {
    try {
      if (updateSubcategoryDto.subcategoryImage) {
        this.subcategoryModel.findById(id).select("subcategoryImage").then((result) => {
          if (result.subcategoryImage) {
            RemoveFilesHelper(result.subcategoryImage)
          }
        })
      }
      return await this.subcategoryModel.findByIdAndUpdate(id, updateSubcategoryDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting subcategory details' + e,);
    }
  };

  async deleteSubcategory(id: string): Promise<Subcategory> {
    try {
      return await this.subcategoryModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting subcategory details' + e,);
    }
  };

  async updateStatus(statusSubcategoryDto: StatusSubcategoryDto): Promise<Subcategory> {
    try {
      return await this.subcategoryModel.findByIdAndUpdate(statusSubcategoryDto.subcategoryid, { active: statusSubcategoryDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting subcategory details' + e,);
    }
  };

  async importSubCategory(createSubcategoryDto: CreateSubcategoryDto[]): Promise<any> {
    try {
      const mappedArray = await Promise.all(createSubcategoryDto.map(async (item: any, index: number) => {
        item.categoryid = ObjectId(item.categoryid)
        return item;
      })
      );
      this.subcategoryModel.insertMany(mappedArray).then(async (result: any) => {
        return result;
      })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting subcategory details' + e,);
    }
  };

};
