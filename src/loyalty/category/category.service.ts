import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../../entities/category.entity';
import { GetCategoryInfoDto } from './dto/response-category.dto';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}
  async getAllCategories(): Promise<any> {
    const categories = await this.categoryModel.aggregate([
      { $match: {"active":  true} },
      {
        $project: {
          _id: 1,
          categoryName: { $ifNull: ["$categoryName", ""] },
          categoryDescription: { $ifNull: ["$categoryDescription", ""] },
          categoryImage: { $ifNull: ["$ccategoryImage", ""] },
        },
      },
      {
        $sort : ({ ranking : 1})
      }
    ]).exec()
    if(!categories)
    {
      throw new BadRequestException('Data Not Found');
    }
    return categories;
  };

  async getCategoryInfo(id: string): Promise<GetCategoryInfoDto> {
    try {
      const data = await this.categoryModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            categoryName: { $ifNull: ["$categoryName", ""] },
            categoryDescription: { $ifNull: ["$categoryDescription", ""] },
            categoryImage: { $ifNull: ["$ccategoryImage", ""] },
          },
        },
        { $limit : 1 },
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCategoryInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting category details' +e,
      );
    }
  };
}