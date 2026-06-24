import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../entities/category.entity';
import { CreateCategoryDto, StatusCategoryDto, UpdateCategoryDto } from '../user/category/dto/request-category.dto';
import { Request } from 'express';
import { GetCategoryInfoDto } from '../user/category/dto/response-category.dto';
import { RemoveFilesHelper } from 'src/common/utils/helper.service';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";
@Injectable()
export class CategoryService {

  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) { }
  public async createCategory(createCategoryDto: CreateCategoryDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const category = new this.categoryModel({ ...createCategoryDto, createdBy: authInfo._id });
    if (category.save()) {
      return new GetCategoryInfoDto(category)
    }
    throw new BadRequestException('Error in Create Category');
  };

  async getAllCategories(): Promise<any> {
    const categories = await this.categoryModel.aggregate([
      {
        $project: {
          _id: 1,
          categoryName: { $ifNull: ["$categoryName", ""] },
          categoryDescription: { $ifNull: ["$categoryDescription", ""] },
          ranking: { $ifNull: ["$ranking", 1000] },
          categoryImage: { $ifNull: ["$categoryImage", ""] },
          active: { $ifNull: ["$active", false] },
        },
      },
      {
        $sort: ({ ranking: 1 })
      }
    ]).exec()
    if (!categories) {
      throw new BadRequestException('Data Not Found');
    }
    return categories;
  };

  async getCategoryInfo(id: string): Promise<GetCategoryInfoDto> {
    try {
      const data = await this.categoryModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $project: {
            _id: 1,
            categoryName: { $ifNull: ["$categoryName", ""] },
            categoryDescription: { $ifNull: ["$categoryDescription", ""] },
            ranking: { $ifNull: ["$ranking", 1000] },
            categoryImage: { $ifNull: ["$categoryImage", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCategoryInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting category details' + e);
    }
  };

  async updateCategoryInfo(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    try {
      if (updateCategoryDto.categoryImage) {
        this.categoryModel.findById(id).select("categoryImage").then((result) => {
          if (result.categoryImage) {
            RemoveFilesHelper(result.categoryImage)
          }
        })
      }
      return await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting category details' + e,);
    }
  };

  async deleteCategory(id: string): Promise<Category> {
    try {
      return await this.categoryModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting category details' + e,);
    }
  };

  async updateStatus(statusCategoryDto: StatusCategoryDto): Promise<Category> {
    try {
      return await this.categoryModel.findByIdAndUpdate(statusCategoryDto.categoryid, { active: statusCategoryDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting category details' + e,);
    }
  };
  
  async importCategory(): Promise<any> {
    try {
      await axios.get('https://gajragears.fieldkonnect.io/api/getCategoryList').then(async (response: any) => {
        if (response?.data?.status === 'success') {
          const mappedArray = await Promise.all(response?.data?.data.map(async (item: any, index: number) => {
            var category = {
              categoryName: item.category_name,
              categoryDescription: item.category_name,
              ranking: index + 1,
            }
            return category;
          })
          );
          await this.categoryModel.insertMany(mappedArray).then(async (result: any) => {
            return result;
          })
            .catch(function (error) {
              throw new BadRequestException(error);
            })
        }
      })
        .catch((error) => {
          console.log('error', error);
          throw new BadRequestException(error);
        });
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting subcategory details' + e,);
    }
  };
  
  async getCategoryDropDown(): Promise<any> {
    try {
      const data = await this.categoryModel.aggregate([
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$categoryName", ""] },
            value: { $ifNull: ["$_id", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException('error while getting country' + e,);
    }
  };
}