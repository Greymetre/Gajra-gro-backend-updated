import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Loyaltyscheme, LoyaltyschemeDocument } from '../entities/loyaltyscheme.entity';
import { Product, ProductDocument } from '../entities/product.entity';
import { CreateLoyaltyschemeDto, ImportSchemeDetailDto, LoyaltyschemeIDDto, StatusLoyaltyschemeDto, UpdateLoyaltyschemeDto } from '../user/loyaltyscheme/dto/request-loyaltyscheme.dto';
import { GetLoyaltyschemeInfoDto } from '../user/loyaltyscheme/dto/response-loyaltyscheme.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { groupBy } from 'lodash';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class LoyaltyschemeService {
  constructor(
    @InjectModel(Loyaltyscheme.name) private loyaltyschemeModel: Model<LoyaltyschemeDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async resolveImportedSchemeDetails(rows: Array<{ productNo: string; points: string | number }>): Promise<any> {
    if (!Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('The Excel file does not contain any product rows');
    }

    const normalizedRows = rows.map((row, index) => ({
      productNo: String(row.productNo || '').trim(),
      points: String(row.points ?? '').trim(),
      row: index + 2,
    }));
    const invalid = normalizedRows.filter(row => !row.productNo || row.points === '' || !Number.isFinite(Number(row.points)));
    if (invalid.length) {
      throw new BadRequestException(`Invalid GG Number or Percentage/Point at Excel row(s): ${invalid.map(row => row.row).join(', ')}`);
    }

    const duplicateCodes = normalizedRows
      .map(row => row.productNo)
      .filter((code, index, codes) => codes.indexOf(code) !== index);
    if (duplicateCodes.length) {
      throw new BadRequestException(`Duplicate GG Number(s): ${[...new Set(duplicateCodes)].join(', ')}`);
    }

    const products = await this.productModel.find({
      productNo: { $in: normalizedRows.map(row => row.productNo) },
    }).select('_id productNo categoryid subcategoryid name').lean().exec();
    const productByNumber = new Map(products.map(product => [product.productNo, product]));
    const missing = normalizedRows.filter(row => !productByNumber.has(row.productNo)).map(row => row.productNo);
    if (missing.length) {
      throw new BadRequestException(`GG Number(s) not found: ${missing.join(', ')}`);
    }

    const grouped = new Map<string, any>();
    normalizedRows.forEach(row => {
      const product: any = productByNumber.get(row.productNo);
      if (!grouped.has(row.points)) {
        grouped.set(row.points, {
          detailName: `${row.points} Percentage/Point`, products: [], categories: [], subcategories: [], points: row.points,
        });
      }
      const detail = grouped.get(row.points);
      detail.products.push(product._id);
      if (product.categoryid && !detail.categories.some(id => id.equals(product.categoryid))) detail.categories.push(product.categoryid);
      if (product.subcategoryid && !detail.subcategories.some(id => id.equals(product.subcategoryid))) detail.subcategories.push(product.subcategoryid);
    });

    return { schemeDetail: [...grouped.values()], products };
  }
  
  public async createLoyaltyscheme(createLoyaltyschemeDto: CreateLoyaltyschemeDto, req: Request): Promise<any> {
    const authInfo = await getAuthUserInfo(req.headers)
    const loyaltyscheme = new this.loyaltyschemeModel({ ...createLoyaltyschemeDto, createdBy: authInfo._id });
    if (loyaltyscheme.save()) {
      if (!loyaltyscheme) throw new BadRequestException("Error in Create Loyaltyscheme");
      return new GetLoyaltyschemeInfoDto(loyaltyscheme);
    }
    throw new BadRequestException('Error in Create Loyaltyscheme');
  };

  async getAllLoyaltyscheme(): Promise<any> {
    try {
      const data = await this.loyaltyschemeModel.aggregate([
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
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting loyaltyscheme details' + e,
      );
    }
  };

  async getLoyaltyschemeInfo(id: string): Promise<GetLoyaltyschemeInfoDto> {
    try {
      const data = await this.loyaltyschemeModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "products",
            localField: "schemeDetail.products",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, productNo: 1, categoryid : 1, subcategoryid : 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "schemeDetail.categories",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, categoryName: 1 } },
            ],
            as: "categoryInfo",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "schemeDetail.subcategories",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, subcategoryName: 1 } },
            ],
            as: "subcategoryInfo",
          },
        },
        // {
        //   $project: {
        //     _id: 1,
        //     schemeName: { $ifNull: ["$schemeName", ""] },
        //     schemeDescription: { $ifNull: ["$schemeDescription", ""] },
        //     startedAt: { $ifNull: ["$startedAt", ""] },
        //     endedAt: { $ifNull: ["$endedAt", ""] },
        //     schemeImage: { $ifNull: ["$schemeImage", ""] },
        //     schemeType: { $ifNull: ["$schemeType", ""] },
        //     customerType: { $ifNull: ["$customerType", []] },
        //     schemeDetail: { $ifNull: ["$schemeDetail", []] },
        //     customers: { $ifNull: ["$customers", []] },
        //     states: { $ifNull: ["$states", []] },
        //     cities: { $ifNull: ["$cities", []] },
        //     basedOn: { $ifNull: ["$basedOn", ""] },
        //     frequency: { $ifNull: ["$frequency", ""] },
        //     createdAt: { $ifNull: ["$createdAt", ""] },
        //     active: { $ifNull: ["$active", false] },
        //   },
        // },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetLoyaltyschemeInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting loyaltyscheme details' + e,
      );
    }
  };

  async updateLoyaltyschemeInfo(id: string, updateLoyaltyschemeDto: UpdateLoyaltyschemeDto): Promise<Loyaltyscheme> {
    try {
      return await this.loyaltyschemeModel.findByIdAndUpdate(id, updateLoyaltyschemeDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting loyaltyscheme details' + e,);
    }
  };

  async deleteLoyaltyscheme(id: string): Promise<Loyaltyscheme> {
    try {
      return await this.loyaltyschemeModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting loyaltyscheme details' + e,);
    }
  };

  async updateStatus(statusLoyaltyschemeDto: StatusLoyaltyschemeDto): Promise<Loyaltyscheme> {
    try {
      return await this.loyaltyschemeModel.findByIdAndUpdate(statusLoyaltyschemeDto.schemeid, { active: statusLoyaltyschemeDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting loyaltyscheme details' + e,);
    }
  };
  async importSchemeDetail(importSchemeDetailDto: ImportSchemeDetailDto[]): Promise<any> {
    try {
      let unique = [...new Set(importSchemeDetailDto.map(item => item.points))];
      const mappedArray = await Promise.all(unique.map(async (points: any) => {
        const rows = await importSchemeDetailDto.filter(function (rows) { return rows.points === points })
        var uniqueProducts = await [...new Set(rows.map(item => item.products))]
        var uniqueCategories = await [...new Set(rows.map(item => item.categories))]
        var uniqueSubCategories = await [...new Set(rows.map(item => item.subcategories))]
        return await {
          detailName: points,
          categories: uniqueCategories,
          products: uniqueProducts,
          subcategories: uniqueSubCategories,
          points: points
        }
      }))

      return await this.loyaltyschemeModel.findOneAndUpdate({}, { $push: { schemeDetail: mappedArray } }, { new: true, useFindAndModify: false, upsert: true }).then((setting) => {
        if (!setting) throw new BadRequestException('Error in Seen Welcome');
        return setting;
      });
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };
  async downloadSchemeData(loyaltyschemeIDDto: LoyaltyschemeIDDto): Promise<GetLoyaltyschemeInfoDto> {
    try {
      const data = await this.loyaltyschemeModel.aggregate([
        { $match: { "_id": ObjectId(loyaltyschemeIDDto.schemeid) } },
        {
          $lookup: {
            from: "products",
            localField: "schemeDetail.products",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, productNo: 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "schemeDetail.categories",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, categoryName: 1 } },
            ],
            as: "categoryInfo",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "schemeDetail.subcategories",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, subcategoryName: 1 } },
            ],
            as: "subcategoryInfo",
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetLoyaltyschemeInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting loyaltyscheme details' + e,
      );
    }
  };
}
