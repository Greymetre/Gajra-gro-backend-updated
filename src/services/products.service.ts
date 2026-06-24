import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../entities/product.entity';
import { Category, CategoryDocument } from '../entities/category.entity';
import { Subcategory, SubcategoryDocument } from '../entities/subcategory.entity';
import { CreateProductDto, ImportProductDto, StatusProductDto, UpdateProductDto } from '../user/products/dto/request-product.dto';
import { GetProductInfoDto } from '../user/products/dto/response-product.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { CategoryIdArrayDto, FilterPaginationProductDto } from 'src/dto/product-dto';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Subcategory.name) private subcategoryModel: Model<SubcategoryDocument>) { }

    
  public async createProduct(createProductDto: CreateProductDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const product = new this.productModel({ ...createProductDto, createdBy: authInfo._id });
    if (product.save()) {
      return new GetProductInfoDto(product)
    }
    throw new BadRequestException('Error in Create Product');
  };

  async getAllProduct(paginationDto: FilterPaginationProductDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 100

      const matchFilter: any = {};

    // Search functionality (existing)
    if (paginationDto.search) {
      matchFilter.$or = [
        { name: { $regex: paginationDto.search, $options: "i" } },
        { productNo: { $regex: paginationDto.search, $options: "i" } },
        { subcategoryName: { $regex: paginationDto.search, $options: "i" } },
        { categoryName: { $regex: paginationDto.search, $options: "i" } },
      ];
    }

    // New Filters
    if (paginationDto.productNo) {
      matchFilter.productNo = {
        $regex: paginationDto.productNo,
        $options: "i",
      };
    }

    if (paginationDto.partNo) {
      matchFilter["productDetail.partNo"] = {
        $regex: paginationDto.partNo,
        $options: "i",
      };
    }

    if (paginationDto.categoryName) {
      matchFilter.categoryName = {
        $regex: paginationDto.categoryName,
        $options: "i",
      };
    }

    if (paginationDto.subcategoryName) {
      matchFilter.subcategoryName = {
        $regex: paginationDto.subcategoryName,
        $options: "i",
      };
    }

    if (paginationDto.specification) {
  matchFilter["productDetail.specification"] = {
    $regex: paginationDto.specification,
    $options: "i",
  };
}

    if (paginationDto.description) {
      matchFilter.description = {
        $regex: paginationDto.description,
        $options: "i",
      };
    }

    if (paginationDto.brand) {
      matchFilter.brand = {
        $regex: paginationDto.brand,
        $options: "i",
      };
    }

    if (paginationDto.model) {
      matchFilter.model = {
        $regex: paginationDto.model,
        $options: "i",
      };
    }
      const data = await this.productModel.aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "categoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, categoryName: 1 } }
            ],
            as: "categoryInfo",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, subcategoryName: 1 } }
            ],
            as: "subcategoryInfo",
          },
        },
        { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subcategoryInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$name", ""] },
            description: { $ifNull: ["$description", ""] },
            productNo: { $ifNull: ["$productNo", ""] },
            categoryid: { $ifNull: ["$categoryid", ""] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ""] },
            subcategoryid: { $ifNull: ["$subcategoryid", ""] },
            subcategoryName: { $ifNull: ["$subcategoryInfo.subcategoryName", ""] },
            brand: { $ifNull: ["$brand", ""] },
            model: { $ifNull: ["$model", ""] },
            mrp: { $first: "$productDetail.mrp" },
            price: { $first: "$productDetail.price" },
            productDetail: { $ifNull: ["$productDetail", []] },
            partNo: { $first: "$productDetail.partNo" },
            specification: { $first: "$productDetail.specification" },
            weight: { $ifNull: ["$measurement.weight", ''] },
            pcs: { $ifNull: ["$measurement.pcs", ''] },
            size: { $ifNull: ["$measurement.size", ''] },
            ranking: { $ifNull: ["$ranking", 10000] },
            isNewLaunch: {$ifNull: ["$isNewLaunch", false] },
            points:{$ifNull:["$points",0]},
            images: { $ifNull: ["$images", []] },
            active: { $ifNull: ["$active", false] },
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" } },
          },
        },
        {

          $match: matchFilter,
          // $match: {
          //   $or: [
          //     { name: { $regex: paginationDto.search, '$options': 'i' } },
          //     { productNo: { $regex: paginationDto.search, '$options': 'i' } },
          //     { subcategoryName: { $regex: paginationDto.search, '$options': 'i' } },
          //     { categoryName: { $regex: paginationDto.search, '$options': 'i' } },
          //   ],
          // },
        },
        { $sort: { 'createdAt': -1 } },
        {
          $facet: {
            paginate: [
              { $count: "totalDocs" },
              { $addFields: { recordPerPage: recordPerPage, currentPage: currentPage } }
            ],
            subcategory: [
            {
              $group: {
                _id: null,
                subcategory: {
                  $addToSet: "$subcategoryName"
                }
              }
            }
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
      throw new InternalServerErrorException(
        'error while getting product details' + e,
      );
    }
  };

  async getProductInfo(id: string): Promise<GetProductInfoDto> {
    try {
      const data = await this.productModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryid",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategoryid",
            foreignField: "_id",
            as: "subcategoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        { $unwind: "$subcategoryInfo" },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$name", ""] },
            description: { $ifNull: ["$description", ""] },
            categoryid: { $ifNull: ["$categoryid", ""] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ""] },
            subcategoryid: { $ifNull: ["$subcategoryid", ""] },
            subcategoryName: { $ifNull: ["$subcategoryInfo.subcategoryName", ""] },
            brand: { $ifNull: ["$brand", ""] },
            model: { $ifNull: ["$model", ""] },
            productDetail: { $ifNull: ["$productDetail", []] },
            points: { $ifNull: ["$points", 0] },
            productNo: { $ifNull: ["$productNo", ""] },
            featured: { $ifNull: ["$featured", false] },
            ranking: { $ifNull: ["$ranking", 10000] },
            measurement: { $ifNull: ["$measurement", {}] },
            discount: { $ifNull: ["$discount", 0] },
            images: { $ifNull: ["$images", []] },
            active: { $ifNull: ["$active", false] },
            isNewLaunch: {$ifNull: ["$isNewLaunch", false] }
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetProductInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting product details' + e,
      );
    }
  };

  async updateProductInfo(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    try {
      return await this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async deleteProduct(id: string): Promise<Product> {
    try {
      return await this.productModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async updateStatus(statusProductDto: StatusProductDto): Promise<Product> {
    try {
      return await this.productModel.findByIdAndUpdate(statusProductDto.productid, { active: statusProductDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async importProducts(createProductDto: ImportProductDto[]): Promise<any> {
    try {
      const dataArray = Array.isArray(createProductDto) ? createProductDto : Object.values(createProductDto);
      const mappedArray = await Promise.all(dataArray.map(async (product: any) => {
        const existproduct = await this.productModel.findOne({ productNo: product.productNo }).select('_id').exec()
        product.categoryid = ObjectId(product.categoryid);
        product.subcategoryid = ObjectId(product.subcategoryid);
        product.measurement = {
          weight: product.weight,
          pcs: product.pcs,
          size: product.size,
        }
        product.productDetail = [{
          mrp: parseFloat(product.mrp),
          price: parseFloat(product.price),
          partNo: product.partNo,
          specification: product.specification,
        }]
        await ['weight', 'pcs', 'size', 'mrp', 'price', 'partNo', 'specification'].forEach(e => delete product[e]);
        if (existproduct === null) {
          await this.productModel.create(product, function (err, doc) {
            return doc
          })
        }
        else {
          await this.productModel.findOneAndUpdate({ productNo: product.productNo },
            {
              $set: product,
            },
            { new: true, setDefaultsOnInsert: false }
          )
            .lean();
        }
      })
      );
      //   const response = await this.productModel.insertMany(mappedArray).then(async (result: any) => {
      //     return result;
      //   })
      //     .catch(function (error) {
      //       throw new BadRequestException(error);
      //     })
      return new GetProductInfoDto(mappedArray);
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async getCategoryProducts(categoryIdDto: CategoryIdArrayDto): Promise<any> {
    try {
      const data = await this.productModel.aggregate([
        {
          $match: {
            categoryid: { $nin: categoryIdDto.category },
            _id: { $nin: categoryIdDto.exceptids },
            active: true
          }
        },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$name", ""] },
          },
        },
        { $sort: { 'ranking': 1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetProductInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting product details' + e,
      );
    }
  };

  async getCategoryies(): Promise<any> {
    try {
      const data = await this.categoryModel.aggregate([
        {
          $match: { active: true }
        },
        {
          $project: {
            _id: 1,
            categoryName: { $ifNull: ["$categoryName", ""] },
          },
        },
        { $sort: { 'ranking': 1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetProductInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting product details' + e,
      );
    }
  };

  async getProductDropDown(categories): Promise<any> {
    try {
      const data = await this.productModel.aggregate([
        {
          $match: {
            $or: [
              { categoryid: { $in: categories } },
              { $expr: { $eq: [[], categories] } }
            ]
          }
        },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$name", "$productNo"] },
            value: { $ifNull: ["$_id", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting country' + e,
      );
    }
  };
}

