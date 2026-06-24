import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CouponProfile, CouponProfileDocument } from '../entities/couponprofile.entity';
import { Coupon, CouponDocument } from '../entities/coupon.entity';
import { Product, ProductDocument } from '../entities/product.entity';
import { Transaction, TransactionDocument } from '../entities/transaction.entity';
import { CouponImportDto, CouponImportMultipleDto, CouponProfileIdDto, CreateCouponDto, StatusCouponDto, UpdateCouponDto } from '../user/coupons/dto/request-coupon.dto';
import { GetCouponInfoDto } from '../user/coupons/dto/response-coupon.dto';
import { SearchRequestDto } from '../dto/pagination-dto';
import { getAuthUserInfo } from '../common/utils/jwt.helper';
import { CouponsController } from '../user/coupons/coupons.controller';
import { PackingList, PackingListDocument } from '../entities/packing-list.entity';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class CouponProfileService {
  constructor(
    @InjectModel('CouponProfile') private readonly couponProfileModel: Model<CouponProfileDocument>,
    @InjectModel('Coupon') private readonly couponModel: Model<CouponDocument>,
    @InjectModel('Product') private readonly productModel: Model<ProductDocument>,
    @InjectModel('Transaction') private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel('PackingList') private readonly packingListModel: Model<PackingListDocument>,
  ) { }

  public async createCoupon(createCouponDto: CreateCouponDto) {
    try {
      const today = new Date();
      const threeYearsLater = new Date(today.setFullYear(today.getFullYear() + 3));

      // Save coupon profile first
      const coupons = new this.couponProfileModel({
        ...createCouponDto,
        createdAt: new Date(),
        expiryDate: threeYearsLater
      });
      const savedCouponProfile = await coupons.save();

      if (!savedCouponProfile) {
        throw new BadRequestException('Error in Create Coupon Profile');
      }

      // Generate codes
      const mappedArray = await Promise.all(
        savedCouponProfile.couponInfo.map(async (coupon: any) => {
          let generated: any[] = [];

          for (const type of createCouponDto.customerType) {
            let count = 0;
            while (count < coupon.couponCount) {
              const code = Math.random().toString(36).substr(2, 8).toUpperCase();

              try {
                // Insert directly, rely on unique index
                await this.couponModel.create({
                  coupon: code,
                  customerType: type,
                  couponProfileid: savedCouponProfile._id,
                  couponInfoId: coupon._id
                });

                generated.push(code);
                count++;
              } catch (err) {
                // Duplicate key error → retry with new code
                if (err.code === 11000) continue;
                throw err;
              }
            }
          }

          return generated;
        })
      );

      return new GetCouponInfoDto(savedCouponProfile);
    } catch (e) {
      throw new InternalServerErrorException(
        'Error while creating coupon: ' + e.message,
      );
    }
  }


  async getAllCoupon(params: {
    categories: any[];
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<any> {
    try {
      const { categories, startDate, endDate } = params || ({} as any);

      /** ---------------- DATE FILTER ---------------- */
      const createdAtFilter: any = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        createdAtFilter.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = end;
      }

      // default → today
      if (!startDate && !endDate) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        createdAtFilter.$gte = todayStart;
        createdAtFilter.$lte = todayEnd;
      }

      /** ---------------- MATCH STAGE ---------------- */
      const matchStage: any = {
        createdAt: createdAtFilter,
      };

      console.log("🔥 MATCH STAGE:", matchStage);

      /** ---------------- AGGREGATION ---------------- */
      const data = await this.couponProfileModel.aggregate([
        // 🔥 FILTER FIRST (IMPORTANT)
        { $match: matchStage },

        {
          $unwind: {
            path: "$couponInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "couponInfo.productid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, productNo: 1, categoryid: 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $unwind: {
            path: "$productInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.categoryid",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, categoryName: 1 } }],
            as: "categoryInfo",
          },
        },
        {
          $unwind: {
            path: "$categoryInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            profileName: { $ifNull: ["$profileName", ""] },
            couponCount: { $ifNull: ["$couponInfo.couponCount", 0] },
            packingList: { $ifNull: ["$couponInfo.packingList", ""] },
            customerType: { $ifNull: ["$customerType", ""] },
            productName: { $ifNull: ["$productInfo.name", ""] },
            productNo: { $ifNull: ["$productInfo.productNo", ""] },
            categoryid: { $ifNull: ["$productInfo.categoryid", ""] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ""] },

            // keep Date for sorting
            dateFilter: "$createdAt",

            // string only for response
            createdAt: {
              $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: "$createdAt",
              },
            },
          },
        },
        ...(params.search
          ? [
            {
              $match: {
                $or: [
                  { packingList: { $regex: params.search, $options: "i" } },
                  { productNo: { $regex: params.search, $options: "i" } },
                  { customerType: { $regex: params.search, $options: "i" } },
                ],
              },
            },
          ]
          : []),
        { $sort: { dateFilter: -1 } },
      ]).exec();

      if (!data || data.length === 0) {
        return [];
      }

      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting coupon details " + e,
      );
    }
  }

  async getExportCoupon(params: {
    categories: any[];
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const { categories, startDate, endDate } = params || ({} as any);

      /** ---------------- DATE FILTER ---------------- */
      const createdAtFilter: any = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        createdAtFilter.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = end;
      }

      // default → today
      if (!startDate && !endDate) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        createdAtFilter.$gte = todayStart;
        createdAtFilter.$lte = todayEnd;
      }

      /** ---------------- MATCH STAGE ---------------- */
      const matchStage: any = {
        createdAt: createdAtFilter,
      };

      const data = await this.couponProfileModel.aggregate([
        { $match: matchStage },
        { $unwind: { "path": "$couponInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "products",
            localField: "couponInfo.productid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, description: 1, productNo: 1, model: 1, points: 1, productDetail: 1, measurement: 1, subcategoryid: 1, categoryid: 1 } }
            ],
            as: "productInfo",
          },
        },
        { $unwind: { "path": "$productInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.categoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, categoryName: 1 } }
            ],
            as: "categoryInfo",
          },
        },
        { $unwind: { "path": "$categoryInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "subcategories",
            localField: "productInfo.subcategoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 0, subcategoryName: 1 } }
            ],
            as: "subcategoryData",
          },
        },
        { $unwind: { "path": "$subcategoryData", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "coupons",
            localField: "couponInfo._id",
            foreignField: "couponInfoId",
            pipeline: [
              { $project: { _id: 1, coupon: 1, customerType: 1 } }
            ],
            as: "couponInfo.couponCodeInfo",
          },
        },
        {
          $project: {
            _id: 1,
            profileName: { $ifNull: ["$profileName", ""] },
            couponCount: { $ifNull: ["$couponInfo.couponCount", 0] },
            packingList: { $ifNull: ["$couponInfo.packingList", ""] },
            startDate: { $ifNull: ["$startDate", ""] },
            expiryDate: { $ifNull: ["$expiryDate", ""] },
            name: { $ifNull: ["$productInfo.name", ''] },
            productNo: { $ifNull: ["$productInfo.productNo", ''] },
            description: { $ifNull: ["$productInfo.description", ''] },
            model: { $ifNull: ["$productInfo.model", ''] },
            points: { $ifNull: ["$productInfo.points", ''] },
            mrp: { $first: "$productInfo.productDetail.mrp" },
            price: { $first: "$productInfo.productDetail.price" },
            partNo: { $first: "$productInfo.productDetail.partNo" },
            specification: { $first: "$productInfo.productDetail.specification" },
            weight: { $ifNull: ["$productInfo.measurement.weight", ''] },
            pcs: { $ifNull: ["$productInfo.measurement.pcs", ''] },
            size: { $ifNull: ["$productInfo.measurement.size", ''] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ''] },
            subcategoryName: { $ifNull: ["$subcategoryData.subcategoryName", ''] },
            customerType: { $ifNull: ["$customerType", []] },
            coupons: { $ifNull: ["$couponInfo.couponCodeInfo", []] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
            rPoints: {
              $ifNull: [
                {
                  $divide: ["$productInfo.points", 4]
                },
                ''
              ]
            }
          },
        },
        { $sort: { createdAt: -1 } },
      ]).exec()

      if (!data || data.length === 0) {
        throw new BadRequestException('Data Not Found');
      }

      // Collect all coupon codes for transaction lookup
      const allCouponCodes: string[] = [];
      data.forEach((ele) => {
        if (ele.coupons && ele.coupons.length > 0) {
          ele.coupons.forEach((coupon: any) => {
            if (coupon.coupon) {
              allCouponCodes.push(coupon.coupon);
            }
          });
        }
      });

      // Fetch transaction data for all coupons to get scan status and invoice info
      const transactionData = await this.transactionModel.find({
        coupon: { $in: allCouponCodes }
      })
        .populate({
          path: 'salesid',
          select: 'invoiceNo invoiceDate customerid parentid',
          populate: [
            { path: 'customerid', select: 'refno firmName' },
            { path: 'parentid', select: 'refno firmName' }
          ]
        })
        .lean();

      // Create maps for quick lookup
      const transactionMap = new Map<string, any>();
      transactionData.forEach((txn: any) => {
        transactionMap.set(txn.coupon, txn);
      });

      // Fetch PackingList details
      const packingListDetails = await this.packingListModel.find({
        packingList: { $in: Array.from(new Set(data.map(ele => ele.packingList).filter(Boolean))) }
      }).lean();
      const packingListDetailsMap = new Map<string, any>();
      packingListDetails.forEach(detail => {
        packingListDetailsMap.set(detail.packingList, detail);
      });

      data.forEach((ele) => {
        if (ele.coupons && ele.coupons.length > 0) {
          ele["mechanicCoupons"] = [];
          ele["retailerCoupons"] = [];
          ele.coupons.forEach((couponData: any) => {
            const txn = transactionMap.get(couponData.coupon);

            // Add QR Scan Status
            couponData.qrScanStatus = txn ? "Scanned" : "Not Scanned";

            // Add Invoice info from sales
            if (txn && txn.salesid) {
              couponData.invoiceNo = txn.salesid.invoiceNo || "";
              couponData.invoiceDate = txn.salesid.invoiceDate
                ? new Date(txn.salesid.invoiceDate).toISOString().split("T")[0]
                : "";

              // Dealer info (parentid is the dealer)
              if (txn.salesid.parentid) {
                couponData.dealerCode = txn.salesid.parentid.refno || "";
                couponData.dealerName = txn.salesid.parentid.firmName || "";
              } else if (txn.salesid.customerid) {
                // Fallback to customerid if no parentid
                couponData.dealerCode = txn.salesid.customerid.refno || "";
                couponData.dealerName = txn.salesid.customerid.firmName || "";
              } else {
                couponData.dealerCode = "";
                couponData.dealerName = "";
              }
            } else {
              couponData.invoiceNo = "";
              couponData.invoiceDate = "";
              couponData.dealerCode = "";
              couponData.dealerName = "";
              couponData.state = "";
              couponData.city = "";
            }

            // Override with data from PackingList model if available
            const plDetail = packingListDetailsMap.get(ele.packingList);
            if (plDetail) {
              if (plDetail.invoiceNo) couponData.invoiceNo = plDetail.invoiceNo;
              if (plDetail.invoiceDate) couponData.invoiceDate = plDetail.invoiceDate;
              if (plDetail.dealerCode) couponData.dealerCode = plDetail.dealerCode;
              if (plDetail.dealerName) couponData.dealerName = plDetail.dealerName;
              if (plDetail.state) couponData.state = plDetail.state;
              if (plDetail.city) couponData.city = plDetail.city;
            }

            // Add packing slip from parent
            couponData.packingSlipNo = ele.packingList || "";

            if (couponData.customerType == "Mechanic") {
              ele["mechanicCoupons"].push(couponData);
            } else if (couponData.customerType == "Retailer") {
              ele["retailerCoupons"].push(couponData);
            }
          });
        }
      });

      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting coupon details " + e,
      );
    }
  }

  async getCouponInfo(id: string): Promise<GetCouponInfoDto> {
    try {
      const data = await this.couponProfileModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        { $unwind: { "path": "$couponInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "products",
            localField: "couponInfo.productid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, description: 1, productNo: 1, model: 1, points: 1, productDetail: 1, measurement: 1, subcategoryid: 1, categoryid: 1 } }
            ],
            as: "productInfo",
          },
        },
        { $unwind: { "path": "$productInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.categoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, categoryName: 1 } }
            ],
            as: "categoryInfo",
          },
        },
        { $unwind: { "path": "$categoryInfo", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "subcategories",
            localField: "productInfo.subcategoryid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 0, subcategoryName: 1 } }
            ],
            as: "subcategoryData",
          },
        },
        { $unwind: { "path": "$subcategoryData", "preserveNullAndEmptyArrays": true } },
        {
          $lookup: {
            from: "coupons",
            localField: "couponInfo._id",
            foreignField: "couponInfoId",
            pipeline: [
              { $project: { _id: 1, coupon: 1, customerType: 1 } }
            ],
            as: "couponInfo.couponCodeInfo",
          },
        },
        {
          $project: {
            _id: 1,
            profileName: { $ifNull: ["$profileName", ""] },
            couponCount: { $ifNull: ["$couponInfo.couponCount", 0] },
            startDate: { $ifNull: ["$startDate", ""] },
            expiryDate: { $ifNull: ["$expiryDate", ""] },
            name: { $ifNull: ["$productInfo.name", ''] },
            productNo: { $ifNull: ["$productInfo.productNo", ''] },
            description: { $ifNull: ["$productInfo.description", ''] },
            model: { $ifNull: ["$productInfo.model", ''] },
            points: { $ifNull: ["$productInfo.points", ''] },
            mrp: { $first: "$productInfo.productDetail.mrp" },
            price: { $first: "$productInfo.productDetail.price" },
            partNo: { $first: "$productInfo.productDetail.partNo" },
            specification: { $first: "$productInfo.productDetail.specification" },
            weight: { $ifNull: ["$productInfo.measurement.weight", ''] },
            pcs: { $ifNull: ["$productInfo.measurement.pcs", ''] },
            size: { $ifNull: ["$productInfo.measurement.size", ''] },
            categoryName: { $ifNull: ["$categoryInfo.categoryName", ''] },
            subcategoryName: { $ifNull: ["$subcategoryData.subcategoryName", ''] },
            customerType: { $ifNull: ["$customerType", []] },
            coupons: { $ifNull: ["$couponInfo.couponCodeInfo", []] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
            rPoints: {
              $ifNull: [
                {
                  $divide: ["$productInfo.points", 4]
                },
                ''
              ]
            }
          },
        },
      ]).exec()
      if (!data) {

        throw new BadRequestException('Data Not Found');
      }
      data.forEach((ele) => {
        if (ele.coupons.length > 0) {
          ele["mechanicCoupons"] = [];
          ele["retailerCoupons"] = []
          ele.coupons.forEach((data) => {
            if (data.customerType == "Mechanic") {
              ele["mechanicCoupons"].push(data)
            } else if (data.customerType == "Retailer") {
              ele["retailerCoupons"].push(data)
            }
          })
        }

      })

      return new GetCouponInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting coupon details' + e,
      );
    }
  }
  // async getCouponInfo(id: string): Promise<GetCouponInfoDto> {
  //   try {
  //     const data = await this.couponProfileModel.aggregate([
  //       { $match: { "_id": ObjectId(id) } },
  //       { $unwind: { "path": "$couponInfo", "preserveNullAndEmptyArrays": true } },
  //       {
  //         $lookup: {
  //           from: "products",
  //           localField: "couponInfo.productid",
  //           foreignField: "_id",
  //           pipeline: [
  //             { $project: { _id: 1, name: 1, description: 1, productNo: 1, model: 1, points: 1, productDetail: 1, measurement: 1, subcategoryid: 1 } }
  //           ],
  //           as: "productInfo",
  //         },
  //       },
  //       { $unwind: { "path": "$productInfo", "preserveNullAndEmptyArrays": true } },
  //       {
  //         $lookup: {
  //           from: "categories",
  //           localField: "couponInfo.categoryid",
  //           foreignField: "_id",
  //           pipeline: [
  //             { $project: { _id: 1, categoryName: 1 } }
  //           ],
  //           as: "categoryInfo",
  //         },
  //       },
  //       { $unwind: { "path": "$categoryInfo", "preserveNullAndEmptyArrays": true } },
  //       {
  //         $lookup: {
  //           from: "subcategories",
  //           localField: "productInfo.subcategoryid",
  //           foreignField: "_id",
  //           pipeline: [
  //             { $project: { _id: 0, subcategoryName: 1 } }
  //           ],
  //           as: "subcategoryData",
  //         },
  //       },
  //       { $unwind: { "path": "$subcategoryData", "preserveNullAndEmptyArrays": true } },
  //       {
  //         $lookup: {
  //           from: "coupons",
  //           localField: "couponInfo._id",
  //           foreignField: "couponInfoId",
  //           pipeline: [
  //             { $project: { _id: 1, coupon: 1, customerType: { $ifNull: ["$customerType", 'Mechanic'] }} }
  //           ],
  //           as: "couponInfo.couponCodeInfo",
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 1,
  //           couponInfo: { $ifNull: ["$couponInfo", ""] },
  //           profileName: { $ifNull: ["$profileName", ""] },
  //           couponCount: { $ifNull: ["$couponInfo.couponCount", 0] },
  //           startDate: { $ifNull: ["$startDate", ""] },
  //           expiryDate: { $ifNull: ["$expiryDate", ""] },
  //           name: { $ifNull: ["$productInfo.name", ''] },
  //           productNo: { $ifNull: ["$productInfo.productNo", ''] },
  //           description: { $ifNull: ["$productInfo.description", ''] },
  //           model: { $ifNull: ["$productInfo.model", ''] },
  //           points: { $ifNull: ["$productInfo.points", ''] },
  //           customerType: { $ifNull: ["$customerType", []] },
  //           rPoints: {
  //             $ifNull: [
  //               {
  //                 $round: [
  //                   { $divide: ["$productInfo.points", 4] },
  //                   0 
  //                 ]
  //               },
  //               '' 
  //             ]
  //           },
  //           mrp: { $first: "$productInfo.productDetail.mrp" },
  //           price: { $first: "$productInfo.productDetail.price" },
  //           partNo: { $first: "$productInfo.productDetail.partNo" },
  //           specification: { $first: "$productInfo.productDetail.specification" },
  //           weight: { $ifNull: ["$productInfo.measurement.weight", ''] },
  //           pcs: { $ifNull: ["$productInfo.measurement.pcs", ''] },
  //           size: { $ifNull: ["$productInfo.measurement.size", ''] },
  //           categoryName: { $ifNull: ["$categoryInfo.categoryName", ''] },
  //           subcategoryName: { $ifNull: ["$subcategoryData.subcategoryName", ''] },
  //           coupons: { $ifNull: ["$couponInfo.couponCodeInfo", []] },
  //           createdAt: { $ifNull: ["$createdAt", ""] },
  //           active: { $ifNull: ["$active", false] },
  //         },
  //       },
  //       // { $unwind: { path: "$coupons", preserveNullAndEmptyArrays: true } },
  //       // {
  //       //   $group: {
  //       //     _id: "$_id",
  //       //     couponInfo: { $first: "$couponInfo" },
  //       //     customerType: { $first: "$customerType" },
  //       //     profileName: { $first: "$profileName" },
  //       //     couponCount: { $first: "$couponCount" },
  //       //     startDate: { $first: "$startDate" },
  //       //     expiryDate: { $first: "$expiryDate" },
  //       //     name: { $first: "$name" },
  //       //     productNo: { $first: "$productNo" },
  //       //     description: { $first: "$description" },
  //       //     model: { $first: "$model" },
  //       //     points: { $first: "$points" },
  //       //     rPoints: { $first: "$rPoints" },
  //       //     mrp: { $first: "$mrp" },
  //       //     price: { $first: "$price" },
  //       //     partNo: { $first: "$partNo" },
  //       //     specification: { $first: "$specification" },
  //       //     weight: { $first: "$weight" },
  //       //     pcs: { $first: "$pcs" },
  //       //     size: { $first: "$size" },
  //       //     categoryName: { $first: "$categoryName" },
  //       //     subcategoryName: { $first: "$subcategoryName" },
  //       //     // coupons: { $first: "$coupons" },
  //       //     mechanicCoupons: {
  //       //       $push: {
  //       //         $cond: [{ $eq: ["$coupons.customerType", "Mechanic"] }, "$coupons", "$$REMOVE"]
  //       //       }
  //       //     },
  //       //     retailerCoupons: {
  //       //       $push: {
  //       //         $cond: [{ $eq: ["$coupons.customerType", "Retailer"] }, "$coupons", "$$REMOVE"]
  //       //       }
  //       //     },
  //       //     createdAt: { $first: "$createdAt" },
  //       //     active: { $first: "$active" },
  //       //   }
  //       // }
  //     ]).exec();

  //     if (!data || data.length === 0) {
  //       throw new BadRequestException('Data Not Found');
  //     }

  //     return new GetCouponInfoDto(data[0]); 
  //   } catch (e) {
  //     throw new InternalServerErrorException('Error while getting coupon details: ' + e);
  //   }
  // }

  async updateCouponInfo(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponProfile> {
    try {
      return await this.couponProfileModel.findByIdAndUpdate(id, updateCouponDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' + e,);
    }
  };

  async deleteCoupon(id: string): Promise<CouponProfile> {
    try {
      return await this.couponProfileModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' + e,);
    }
  };

  async updateStatus(statusCouponDto: StatusCouponDto): Promise<CouponProfile> {
    try {
      this.couponModel.updateMany({ couponProfileid: statusCouponDto.couponprofileid }, { $set: { active: statusCouponDto.active } });
      return await this.couponProfileModel.findByIdAndUpdate(statusCouponDto.couponprofileid, { active: statusCouponDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' + e,);
    }
  };

  async couponProfileExport(couponProfileDto: CouponProfileIdDto): Promise<GetCouponInfoDto> {
    try {
      const data = await this.couponProfileModel.aggregate([
        { $match: { "_id": ObjectId(couponProfileDto.profileid) } },
        {
          $lookup: {
            from: "products",
            localField: "products",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, name: 1, description: 1, productNo: 1, model: 1, points: 1, productDetail: 1 } }
            ],
            as: "productInfo",
          },
        },
        {
          $lookup: {
            from: "coupons",
            localField: "_id",
            foreignField: "couponProfileid",
            pipeline: [
              { $project: { _id: 0, coupon: 1 } }
            ],
            as: "couponsData",
          },
        },
        { $unwind: { "path": "$categoryInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$productInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$productInfo.name", ''] },
            productNo: { $ifNull: ["$productInfo.productNo", ''] },
            description: { $ifNull: ["$productInfo.description", ''] },
            model: { $ifNull: ["$productInfo.model", ''] },
            points: { $ifNull: ["$productInfo.points", ''] },
            mrp: { $first: "$productInfo.productDetail.mrp" },
            price: { $first: "$productInfo.productDetail.price" },
            partNo: { $first: "$productInfo.productDetail.partNo" },
            specification: { $first: "$productInfo.productDetail.specification" },
            coupons: { $ifNull: ["$couponsData", []] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCouponInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting coupon details' + e,
      );
    }
  };

  private async generateCouponCode(length: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let codes = Math.random().toString(20).substr(2, length).toUpperCase();
      resolve(codes);
    });
  };

  async couponExport(): Promise<GetCouponInfoDto> {
    try {
      const data = await this.couponProfileModel.aggregate([
        {
          $lookup: {
            from: "coupons",
            localField: "_id",
            foreignField: "couponProfileid",
            as: "couponsData",
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCouponInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting coupon details' + e,
      );
    }
  };

  async couponImport(couponProfileDto: CouponImportDto): Promise<any> {
    try {
      // const mappedArray = await Promise.all(couponProfileDto.coupons.map(async (coupon: any) => {
      //   const couponprofile = await this.couponProfileModel.create({
      //     _id: coupon._id,
      //     profileName: coupon.profileName,
      //     startDate: coupon.startDate,
      //     expiryDate: coupon.expiryDate,
      //     customerType: coupon.customerType,
      //     createdAt: coupon.createdAt,
      //     createdBy: coupon.createdBy,
      //     couponInfo: [{ couponCount: coupon.couponCount, productid: coupon.products }]
      //   })
      //   return await Promise.all(coupon.couponsData.map(async (couponls: any) => {
      //     couponls.couponProfileid = couponprofile._id
      //     couponls.couponInfoId = couponprofile.couponInfo[0]._id
      //     return couponls
      //   }))
      // })
      // );
      const mappedArray = [];
      for (const coupon of couponProfileDto.coupons) {
        const couponprofile = await this.couponProfileModel.create({
          _id: coupon._id,
          profileName: coupon.profileName,
          startDate: coupon.startDate,
          expiryDate: coupon.expiryDate,
          customerType: coupon.customerType,
          createdAt: coupon.createdAt,
          createdBy: coupon.createdBy,
          couponInfo: [{ couponCount: coupon.couponCount, productid: coupon.products }]
        });

        const couponlsArray = [];
        for (const couponls of coupon.couponsData) {
          couponls.couponProfileid = couponprofile._id;
          couponls.couponInfoId = couponprofile.couponInfo[0]._id;
          couponlsArray.push(couponls);
        }

        mappedArray.push(...couponlsArray);
      }
      const flattenedArray = await mappedArray.flat();
      await this.couponModel.insertMany(flattenedArray).then((result) => {
        return result
      })
        .catch(err => {
          throw new InternalServerErrorException(err);
        });
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting coupon details' + e,);
    }
  };

  async searchCoupons(paginationDto: SearchRequestDto): Promise<any> {
    try {

      const data = await this.couponModel
        .aggregate([
          {
            $match: { coupon: { $regex: paginationDto.search, '$options': 'i' } },
          },
          {
            $lookup: {
              from: "couponprofiles",
              localField: "couponProfileid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 0, profileName: 1, createdAt: 1, couponInfo: 1 } }
              ],
              as: "couponprofileData",
            },
          },
          { $unwind: { "path": "$couponprofileData", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              _id: 1,
              coupon: { $ifNull: ["$coupon", ""] },
              createdAt: { $ifNull: ["$couponprofileData.createdAt", ''] },
              couponprofileData: {
                $filter: {
                  input: "$couponprofileData.couponInfo",
                  as: "profile",
                  cond: {
                    $eq: ["$$profile._id", "$couponInfoId"]
                  }
                }
              }
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "couponprofileData.0.productid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, productNo: 1, name: 1 } }
              ],
              as: "productsData"
            }
          },
          { $unwind: { "path": "$productsData", "preserveNullAndEmptyArrays": true } },
          {
            $match: {
              $and: [
                paginationDto.startDate ? { createdAt: { $gte: new Date(paginationDto.startDate) } } : {},
                paginationDto.endDate ? { createdAt: { $lt: new Date(paginationDto.endDate) } } : {},
                paginationDto.productid ? { "productsData._id": ObjectId(paginationDto.productid) } : {},
              ],
            },
          },
          { $sort: { createdAt: -1 } },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException("error while getting customer details" + e);
    }
  };

  async couponMultipleImport(couponImportDto: CouponImportMultipleDto): Promise<any> {
    try {
      // Create coupon profile
      const today = new Date();
      const threeYearsLater = new Date(today.setFullYear(today.getFullYear() + 3));
      const couponProfile = await this.couponProfileModel.create({
        profileName: Date.now().toString(),
        startDate: new Date(),
        expiryDate: threeYearsLater,
        createdBy: couponImportDto.createdBy,
        customerType: ["Mechanic"], // default, will update per coupon
      });

      // Add couponInfo to profile
      for (const coupon of couponImportDto.coupons) {
        const strData = coupon.customerType.split(',').map(item => item.trim().toLowerCase());
        let customerType = [];
        if (strData.includes("mechanic") && strData.includes("retailer")) customerType = ["Mechanic", "Retailer"];
        else if (strData.includes("mechanic")) customerType = ["Mechanic"];
        else if (strData.includes("retailer")) customerType = ["Retailer"];

        const product = await this.productModel.findOne({ productNo: coupon.ggNumber });
        if (product && customerType.length > 0) {
          await this.couponProfileModel.findByIdAndUpdate(
            couponProfile._id,
            { customerType, $push: { couponInfo: { couponCount: coupon.couponCount, productid: product._id, packingList: coupon.packingList } } },
            { new: true }
          );
        }
      }

      // Refetch profile to get couponInfo & updated customerType
      const profile = await this.couponProfileModel.findById(couponProfile._id);

      // Generate and insert coupons efficiently
      for (const coupon of profile.couponInfo) {
        for (const type of profile.customerType) {
          let count = 0;
          while (count < coupon.couponCount) {
            const code = Math.random().toString(36).substr(2, 8).toUpperCase();
            try {
              await this.couponModel.create({
                coupon: code,
                customerType: type,
                couponProfileid: profile._id,
                couponInfoId: coupon._id
              });
              count++;
            } catch (err) {
              if (err.code === 11000) continue; // duplicate → retry
              else throw err;
            }
          }
        }
      }

      return { message: "Coupons imported successfully", profileId: profile._id };

    } catch (e) {
      throw new InternalServerErrorException('Error while importing coupons: ' + e.message);
    }
  }

  async replacePackingSlip(oldPackingSlip: string, newPackingSlip: string): Promise<any> {
    try {
      // Update all couponInfo items where packingList matches the old value
      const result = await this.couponProfileModel.updateMany(
        { 'couponInfo.packingList': oldPackingSlip },
        { $set: { 'couponInfo.$[elem].packingList': newPackingSlip } },
        { arrayFilters: [{ 'elem.packingList': oldPackingSlip }] }
      );

      if (result.modifiedCount === 0) {
        throw new BadRequestException(`No records found with packing slip: ${oldPackingSlip}`);
      }

      return {
        message: 'Packing slip replaced successfully',
        modifiedCount: result.modifiedCount
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('Error while replacing packing slip: ' + e.message);
    }
  }
}  