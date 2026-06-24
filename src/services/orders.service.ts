import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from 'src/entities/order.entity';
import { Shoppingcart, ShoppingcartDocument } from 'src/entities/shoppingcart.entity';
import { Product, ProductDocument } from 'src/entities/product.entity';
import { CancelOrderDto, CreateCartItemsDto, CreateOrderDTO, GetOrderInfoDto, GetQueryUserDto } from 'src/dto/order-dto';
import { Request } from 'express';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Shoppingcart.name)
    private shoppingModel: Model<ShoppingcartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  public async createNewOrder(createOrderDto: CreateOrderDTO) {
    const order = new this.orderModel(createOrderDto);
    if (order.save()) {
      return new GetOrderInfoDto(order);
    }
    throw new BadRequestException("Error in Create Loyaltyscheme");
  };

  async getAllOrder(): Promise<any> {
    try {
      const data = await this.orderModel
        .aggregate([
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, firmName: 1 } }],
              as: "customerInfo",
            },
          },
          {
            $lookup: {
              from: "customers",
              localField: "parentid",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, firmName: 1 } }],
              as: "parentInfo",
            },
          },
          {
            $unwind: {
              path: "$customerInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: { path: "$parentInfo", preserveNullAndEmptyArrays: true },
          },
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
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting transaction details" + e
      );
    }
  };

  async getOrderInfo(id: string): Promise<GetOrderInfoDto> {
    try {
      const data = await this.orderModel
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, firmName: 1 } }],
              as: "customerInfo",
            },
          },
          {
            $lookup: {
              from: "customers",
              localField: "parentid",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, firmName: 1 } }],
              as: "parentInfo",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "detail.productid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, name: 1, productDetail: 1 } },
              ],
              as: "productInfo",
            },
          },
          {
            $unwind: {
              path: "$customerInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: { path: "$parentInfo", preserveNullAndEmptyArrays: true },
          },
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
                        input: "$productInfo",
                        as: "products",
                        cond: {
                          $eq: ["$$products._id", "$$detailsls.productid"],
                        },
                      },
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
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetOrderInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting transaction details" + e
      );
    }
  };
  public async addCartItems(cartItemsDTO: CreateCartItemsDto): Promise<any> {
    const carts = new this.shoppingModel(cartItemsDTO);
    if (carts.save()) {
      return carts;
    } else {
      throw new BadRequestException("Error In Add in Cart");
    }
  };

  async getCartItems(getQueryUserDTO: GetQueryUserDto): Promise<any> {
    try {
      const data = await this.shoppingModel
        .aggregate([
          { $match: { customerid: ObjectId(getQueryUserDTO.customerid) } },
          {
            $lookup: {
              from: "products",
              localField: "productid",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, name: 1 } }],
              as: "productInfo",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productDetailid",
              foreignField: "productDetail._id",
              pipeline: [{ $project: { _id: 1, productDetail: 1 } }],
              as: "productDetailInfo",
            },
          },
          {
            $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true },
          },
          {
            $unwind: {
              path: "$productDetailInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              productid: { $ifNull: ["$productid", ""] },
              name: { $ifNull: ["$productInfo.name", ""] },
              productDetailid: { $ifNull: ["$productDetailid", ""] },
              specification: {
                $ifNull: ["$productDetailInfo.productDetail.specification", ""],
              },
              quantity: { $ifNull: ["$quantity", 1] },
              price: { $ifNull: ["$price", 0] },
              createdAt: { $ifNull: ["$createdAt", ""] },
            },
          },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting transaction details" + e
      );
    }
  };

  public async cancelledOrder(cancelOrderDto: CancelOrderDto) {
    try {
      return await this.orderModel
        .findOneAndUpdate(
          {_id: cancelOrderDto.orderid , iscancelled : false},
          {
            $set: {
              cancelReasons: cancelOrderDto.cancelReasons,
              status: "Cancelled",
              iscancelled : true
            },
            $push: {
                "statusInfo":{
                    "title": "Order Cancelled",
                    "status": "Cancelled",
                    "changedAt":new Date(),
                }
            }
          },
          { new: true, useFindAndModify: false }
        )
        .then((order) => {
          if (!order) throw new BadRequestException("Order Not Exist");
          return order;
        });
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  };
}
