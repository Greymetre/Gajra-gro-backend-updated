import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from '../../entities/sale.entity';
import { Shoppingcart, ShoppingcartDocument } from 'src/entities/shoppingcart.entity'
import { Product, ProductDocument } from 'src/entities/product.entity'
import { CreateSaleDTO } from 'src/dto/sales-dto';
import { Request } from 'express';
import { getCustomerAuthInfo } from '../../common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class SalesService {
  constructor(@InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  @InjectModel(Shoppingcart.name) private shoppingModel: Model<ShoppingcartDocument>,
  @InjectModel(Product.name) private productModel: Model<ProductDocument>) { }

  public async createNewSale(createSaleDTO: CreateSaleDTO, req: Request): Promise<any> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const redemption = new this.saleModel({ ...createSaleDTO, customerid: authInfo._id });
    if (redemption.save()) {
      return redemption
    }
    else {
      throw new BadRequestException('insufficient balance');
    }
  }
  async getAllSale(req): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.saleModel.aggregate([
        { $match: { customerid: ObjectId(authInfo._id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "parentid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "parentInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$parentInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            customerName: { $ifNull: ["$customerInfo.firmName", ""] },
            parentid: { $ifNull: ["$parentid", ""] },
            parentName: { $ifNull: ["$parentInfo.firmName", ""] },
            subTotal: { $ifNull: ["$subTotal", 0] },
            totalAmount: { $ifNull: ["$totalAmount", 0] },
            status: { $ifNull: ["$status", ""] },
            paymentStatus: { $ifNull: ["$paymentStatus", ""] },
            address: { $ifNull: ["$address", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  }

  async getSaleInfo(id: string): Promise<Sale> {
    try {
      const data = await this.saleModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "parentid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "parentInfo",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "detail.productid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, productDetail : 1 } }
            ],
            as: "productInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$parentInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            customerName: { $ifNull: ["$customerInfo.firmName", ""] },
            parentid: { $ifNull: ["$parentid", ""] },
            parentName: { $ifNull: ["$parentInfo.firmName", ""] },
            subTotal: { $ifNull: ["$subTotal", 0] },
            totalAmount: { $ifNull: ["$totalAmount", 0] },
            status: { $ifNull: ["$status", ""] },
            paymentStatus: { $ifNull: ["$paymentStatus", ""] },
            address: { $ifNull: ["$address", ""] },
            detail: {
              $map: {
                input: {
                  $filter: {
                    input: "$detail",
                    as: "detailrow",
                    cond: "$$detailrow",
                  },
                },
                as: "detailsls",
                in: {
                  productid: "$$detailsls.productid",
                  productDetailid: "$$detailsls.productDetailid",
                  products: {
                    $filter: {
                      input: '$productInfo',
                      as: 'products',
                      cond: { $eq: ['$$products._id', '$$detailsls.productid'] }
                    }
                  },
                  price: "$$detailsls.price",
                  quantity: "$$detailsls.quantity",
                  lineTotal: "$$detailsls.lineTotal",
                },
              },
            },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  }
}

