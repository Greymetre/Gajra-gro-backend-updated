import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../entities/transaction.entity';
import { Loyaltyscheme, LoyaltyschemeDocument } from '../entities/loyaltyscheme.entity';
import { Coupon, CouponDocument } from '../entities/coupon.entity';
import { Customer, CustomerDocument } from '../entities/customer.entity';
import { Product, ProductDocument } from '../entities/product.entity';
import { SettingProject, SettingProjectDocument } from '../entities/setting.project.entity';
import { CouponsScanDTO, CreateTransactionDto, ProductDropdownDto, StatusCouponDtos, StatusTransactionDto, UpdateTransactionDto } from '../user/transactions/dto/request-transaction.dto';
import { AddInvalidCouponDTO, AdminCouponsScanDTO, FilterPaginationInvalidCouponDto, FilterPaginationTransactionDto, ImportCouponTransactionDTO, ImportTransactionDTO } from '../dto/transaction.dto';
import { GetTransactionInfoDto, GetAllTransactionDto } from '../user/transactions/dto/response-transaction.dto';
import { Request } from 'express';
import { RemoveFilesHelper, PushNotification, listImagesByTimeWithVersions, uploadFolderToS3 } from "src/common/utils/helper.service";
import { getAuthUserInfo, getCustomerAuthInfo } from '../common/utils/jwt.helper';
import { dateFromFrequency, schemeBasedOnScan } from 'src/common/utils/loyalty.helper';
import { PaginationRequestDto } from 'src/dto/pagination-dto';
import { asyncScheduler } from 'rxjs';
import { StatusCouponDto } from 'src/user/coupons/dto/request-coupon.dto';
import { InvalidCoupon, InvalidCouponDocument } from 'src/entities/invalidcoupon.entity';
import { CouponProfile, CouponProfileDocument } from 'src/entities/couponprofile.entity';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
import { PackingList, PackingListDocument } from 'src/entities/packing-list.entity';
const ObjectId = require('mongoose').Types.ObjectId;
const path = require('path');
const fs = require('fs');
interface TransactionQuery {
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
};


interface CustomerIn {
  _id: string;
  firmName: string;
  contactPerson: string;
  mobile: string;
  customerType: string;
  address?: {
    city?: string;
    state?: string;
  };
};

interface CreatedByIn {
  _id: string;
  firstName: string;
  lastName: string;

};

function isCreatedByIn(createdBy: any): createdBy is CreatedByIn {
  return (
    createdBy &&
    typeof createdBy === "object" &&
    typeof createdBy.firstName === "string" &&
    typeof createdBy.lastName === "string"
  );
}


function isCustomerIn(customer: any): customer is CustomerIn {
  return (
    customer &&
    typeof customer === "object" &&
    typeof customer.firmName === "string" &&
    typeof customer.contactPerson === "string" &&
    typeof customer.mobile === "string" &&
    typeof customer.customerType === "string"
  );
}


interface ProductIn {
  productNo: string;
  categoryid: {
    categoryName: string;
  };
}


// Type guard function
function isProductIn(product: any): product is ProductIn {
  return (
    product &&
    typeof product.productNo === "string" &&
    product.categoryid &&
    typeof product.categoryid.categoryName === "string"
  );
}



@Injectable()
export class TransactionsService {
  constructor(@InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Loyaltyscheme.name) private schemeModel: Model<LoyaltyschemeDocument>,
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(SettingProject.name) private projectSettingModel: Model<SettingProjectDocument>,
    @InjectModel(InvalidCoupon.name) private invalidCouponModel: Model<InvalidCouponDocument>,
    @InjectModel(CouponProfile.name) private couponProfileModel: Model<CouponProfileDocument>,
    @InjectModel(PackingList.name) private packingListModel: Model<PackingListDocument>,
  ) { }

  public async createTransaction(createTransactionDto: CreateTransactionDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.header)
    const refno = await this.getNewRefNoTransaction()
    const customerType = await this.customerModel.findOne({ _id: createTransactionDto.customerid })
    const transaction = new this.transactionModel({ ...createTransactionDto, refno: refno, createdBy: authInfo._id, customerType: customerType.customerType });
    if (transaction.save()) {
      return new GetTransactionInfoDto(transaction)
    }
    throw new BadRequestException('Error in Create Transaction');
  };

  async getAllTransaction(paginationDto: FilterPaginationTransactionDto): Promise<any> {
    try {
      let condition = {}
      if (paginationDto.pointType.includes("all")) {
        condition = { transactionType: "Cr" }
      } else {
        condition = { pointType: { $in: paginationDto.pointType } }
      }

      let customerTypeCond = {};

      if (paginationDto.customerType && paginationDto.customerType.length === 1) {
        const customerType = paginationDto.customerType[0];
        if (customerType == "Mechanic" || customerType == "Retailer") {
          customerTypeCond = { customerType: customerType };
        }
      }

      const startDate1 = paginationDto.startDate ? new Date(`${paginationDto.startDate}T00:00:00.000Z`) : null;
      const endDate1 = paginationDto.endDate ? new Date(`${paginationDto.endDate}T23:59:59.999Z`) : null;
      const query: { createdAt?: { $gte?: Date; $lte?: Date } } = {};


      if (startDate1 && !isNaN(startDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$gte = startDate1;
      }

      if (endDate1 && !isNaN(endDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = endDate1; // Use endDate1 here
      }

      let ids = [];
      let searchQuery = {};
      if (paginationDto.search) {
        searchQuery = {
          $or: [
            { "firmName": { $regex: paginationDto.search, $options: 'i' } },
            { "contactPerson": { $regex: paginationDto.search, $options: 'i' } },
            { "customerType": { $regex: paginationDto.search, $options: 'i' } },
            { "mobile": { $regex: paginationDto.search, $options: 'i' } },
            { "address.city": { $regex: paginationDto.search, $options: 'i' } },
            { "address.state": { $regex: paginationDto.search, $options: 'i' } }
          ]
        };

        let data1 = await this.customerModel.aggregate([
          {
            $match: searchQuery,
          },
        ]
        )
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        ids = data1.map((ele) => ele._id);
        let finalQuery1 = {}
        if (ids.length > 0) {

          finalQuery1 = {
            $or: [
              { customerid: { $in: ids } },
              paginationDto.search
                ? { coupon: { $regex: paginationDto.search, $options: "i" } }
                : {}
            ],
            transactionType: "Cr",
            ...(customerTypeCond ? customerTypeCond : {}),
            ...query,
            ...paginationDto.pointType.length ? condition : {},

          }
        } else {

          finalQuery1 = {
            ...(paginationDto.search
              ? { coupon: { $regex: paginationDto.search, $options: "i" } }
              : {}
            ),
            // transactionType: "Cr" ,
            ...(customerTypeCond ? customerTypeCond : {}),
            ...query,
            ...paginationDto.pointType.length ? condition : {},


          }
        }

        // await delay(2000);

        let totalDocs = await this.transactionModel.countDocuments(finalQuery1);
        let data = await this.transactionModel
          .find(finalQuery1)
          .populate('customerid', 'firmName contactPerson mobile address customerType')
          .populate('createdBy', 'firstName lastName')
          .populate({
            path: 'productid',
            populate: {
              path: 'categoryid',
              select: 'categoryName',
            },
            select: 'productNo categoryid',
          })
          .sort({ createdAt: -1 })
          .skip((paginationDto.currentPage - 1) * paginationDto.recordPerPage)
          .limit(paginationDto.recordPerPage)
          .lean();

        // Fetch packingList data from coupons and couponprofiles
        const couponCodes = data.map((t) => t.coupon).filter(Boolean);
        const couponDataList = await this.couponModel.find({ coupon: { $in: couponCodes } })
          .populate({
            path: 'couponProfileid',
            select: 'couponInfo createdAt',
          })
          .lean();

        // Create a map for quick lookup: coupon -> packingList & profileCreatedAt
        const packingListMap = new Map<string, string>();
        const profileCreatedAtMap = new Map<string, Date>();

        couponDataList.forEach((couponData: any) => {
          if (couponData.couponProfileid) {
            if (couponData.couponProfileid.createdAt) {
              profileCreatedAtMap.set(couponData.coupon, couponData.couponProfileid.createdAt);
            }

            if (couponData.couponProfileid.couponInfo) {
              const couponInfo = couponData.couponProfileid.couponInfo.find(
                (info: any) => info._id?.toString() === couponData.couponInfoId?.toString()
              );
              if (couponInfo && couponInfo.packingList) {
                packingListMap.set(couponData.coupon, couponInfo.packingList);
              }
            }
          }
        });

        // Fetch PackingList details from the new model
        const packingListStrings = Array.from(new Set(Array.from(packingListMap.values())));
        const packingListDetails = await this.packingListModel.find({ packingList: { $in: packingListStrings } }).lean();
        const packingListDetailsMap = new Map<string, any>();
        packingListDetails.forEach(detail => {
          packingListDetailsMap.set(detail.packingList, detail);
        });

        let paginatedData = data.map((transaction) => {

          const creadtedByContactPerson = isCreatedByIn(transaction.createdBy) ? transaction.createdBy.firstName + " " + transaction.createdBy.lastName : "";
          const productid = transaction.productid ? transaction.productid : "";
          const customerid = transaction.customerid ? transaction.customerid._id : "";
          const firmName = isCustomerIn(transaction.customerid) ? transaction.customerid.firmName : "";
          const contactPerson = isCustomerIn(transaction.customerid) ? transaction.customerid.contactPerson : "";
          const customerType = isCustomerIn(transaction.customerid) ? transaction.customerid.customerType : "";
          const mobile = isCustomerIn(transaction.customerid) ? transaction.customerid.mobile : "";
          const city = isCustomerIn(transaction.customerid) ? transaction.customerid.address.city : "";
          const state = isCustomerIn(transaction.customerid) ? transaction.customerid.address.state : "";
          const productNo = isProductIn(transaction.productid) ? transaction.productid.productNo : "";
          const categoryName = isProductIn(transaction.productid) ? transaction.productid.categoryid.categoryName : "";
          const packingList = packingListMap.get(transaction.coupon) || "";
          return {
            _id: transaction._id,
            refno: transaction.refno || 0,
            customerid,
            firmName,
            contactPerson,
            creadtedByContactPerson,
            customerType,
            mobile,
            city,
            state,
            productNo,
            categoryName,
            points: transaction.points || 0,
            redemStatus: transaction.redemStatus || 0,
            coupon: transaction.coupon || "",
            packingList,
            redemBalance: transaction.redemStatus === 0 ? transaction.points : transaction.redemBalance,
            pointType: transaction.pointType || "",
            createdAt: transaction.createdAt ? transaction.createdAt.toISOString().split("T")[0] : "",
            yearMonthPkd: profileCreatedAtMap.has(transaction.coupon) ? profileCreatedAtMap.get(transaction.coupon).toISOString().split("T")[0] : "",
            totalDaysGenToScan: (transaction.createdAt && profileCreatedAtMap.has(transaction.coupon))
              ? Math.floor((new Date(transaction.createdAt).getTime() - new Date(profileCreatedAtMap.get(transaction.coupon)).getTime()) / (1000 * 3600 * 24))
              : "",
            invoice_no: packingListDetailsMap.get(packingList)?.invoiceNo || "",
            invoice_date: packingListDetailsMap.get(packingList)?.invoiceDate || "",
            dealer_code: packingListDetailsMap.get(packingList)?.dealerCode || "",
            dealer_name: packingListDetailsMap.get(packingList)?.dealerName || "",
          };
        });


        return {
          totalDocs,
          paginate: [
            { totalDocs },
            { recordPerPage: paginationDto.recordPerPage || 100 },
            { currentPage: paginationDto.currentPage || 1 },
          ],
          docs: paginatedData,
        };
      } else {

        let finalQuery = {
          transactionType: "Cr",
          ...(customerTypeCond ? customerTypeCond : {}),
          ...query,
          ...paginationDto.pointType.length ? condition : {},

        }
        let totalDocs = await this.transactionModel.countDocuments(finalQuery);
        let data = await this.transactionModel
          .find(finalQuery)
          .populate('customerid', 'firmName contactPerson mobile address customerType')
          .populate('createdBy', 'firstName lastName')
          .populate({
            path: 'productid',
            populate: {
              path: 'categoryid',
              select: 'categoryName',
            },
            select: 'productNo categoryid',
          })
          .sort({ createdAt: -1 })
          .skip((paginationDto.currentPage - 1) * paginationDto.recordPerPage)
          .limit(paginationDto.recordPerPage)
          .lean();

        // Fetch packingList data from coupons and couponprofiles
        const couponCodes = data.map((t) => t.coupon).filter(Boolean);
        const couponDataList = await this.couponModel.find({ coupon: { $in: couponCodes } })
          .populate({
            path: 'couponProfileid',
            select: 'couponInfo createdAt',
          })
          .lean();

        // Create a map for quick lookup: coupon -> packingList & profileCreatedAt
        const packingListMap = new Map<string, string>();
        const profileCreatedAtMap = new Map<string, Date>();

        couponDataList.forEach((couponData: any) => {
          if (couponData.couponProfileid) {
            if (couponData.couponProfileid.createdAt) {
              profileCreatedAtMap.set(couponData.coupon, couponData.couponProfileid.createdAt);
            }

            if (couponData.couponProfileid.couponInfo) {
              const couponInfo = couponData.couponProfileid.couponInfo.find(
                (info: any) => info._id?.toString() === couponData.couponInfoId?.toString()
              );
              if (couponInfo && couponInfo.packingList) {
                packingListMap.set(couponData.coupon, couponInfo.packingList);
              }
            }
          }
        });

        // Fetch PackingList details from the new model
        const packingListStrings = Array.from(new Set(Array.from(packingListMap.values())));
        const packingListDetails = await this.packingListModel.find({ packingList: { $in: packingListStrings } }).lean();
        const packingListDetailsMap = new Map<string, any>();
        packingListDetails.forEach(detail => {
          packingListDetailsMap.set(detail.packingList, detail);
        });

        let paginatedData = data.map((transaction) => {
          const productid = transaction.productid ? transaction.productid : "";
          const customerid = transaction.customerid ? transaction.customerid._id : "";
          const firmName = isCustomerIn(transaction.customerid) ? transaction.customerid.firmName : "";
          const contactPerson = isCustomerIn(transaction.customerid) ? transaction.customerid.contactPerson : "";
          const creadtedByContactPerson = isCreatedByIn(transaction.createdBy) ? transaction.createdBy.firstName + " " + transaction.createdBy.lastName : "";
          const customerType = isCustomerIn(transaction.customerid) ? transaction.customerid.customerType : "";
          const mobile = isCustomerIn(transaction.customerid) ? transaction.customerid.mobile : "";
          const city = isCustomerIn(transaction.customerid) ? transaction.customerid.address.city : "";
          const state = isCustomerIn(transaction.customerid) ? transaction.customerid.address.state : "";
          const productNo = isProductIn(transaction.productid) ? transaction.productid.productNo : "";
          const categoryName = isProductIn(transaction.productid) ? transaction.productid.categoryid.categoryName : "";
          const packingList = packingListMap.get(transaction.coupon) || "";

          return {
            _id: transaction._id,
            refno: transaction.refno || 0,
            customerid,
            firmName,
            creadtedByContactPerson,
            contactPerson,
            customerType,
            mobile,
            city,
            state,
            productNo,
            categoryName,
            points: transaction.points || 0,
            redemStatus: transaction.redemStatus || 0,
            coupon: transaction.coupon || "",
            packingList,
            redemBalance: transaction.redemStatus === 0 ? transaction.points : transaction.redemBalance,
            pointType: transaction.pointType || "",
            createdAt: transaction.createdAt ? transaction.createdAt.toISOString().split("T")[0] : "",
            yearMonthPkd: profileCreatedAtMap.has(transaction.coupon) ? profileCreatedAtMap.get(transaction.coupon).toISOString().split("T")[0] : "",
            totalDaysGenToScan: (transaction.createdAt && profileCreatedAtMap.has(transaction.coupon))
              ? Math.floor((new Date(transaction.createdAt).getTime() - new Date(profileCreatedAtMap.get(transaction.coupon)).getTime()) / (1000 * 3600 * 24))
              : "",
            invoice_no: packingListDetailsMap.get(packingList)?.invoiceNo || "",
            invoice_date: packingListDetailsMap.get(packingList)?.invoiceDate || "",
            dealer_code: packingListDetailsMap.get(packingList)?.dealerCode || "",
            dealer_name: packingListDetailsMap.get(packingList)?.dealerName || "",
          };
        });




        return {
          paginate: [
            { totalDocs },
            { recordPerPage: paginationDto.recordPerPage || 100 },
            { currentPage: paginationDto.currentPage || 1 },
          ],
          docs: paginatedData,
        };
      }



    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  // async getAllTransaction(paginationDto: FilterPaginationTransactionDto): Promise<any> {
  //   try {
  //     let condition = {}
  //     if (paginationDto.pointType.includes("all")) {
  //       condition = { transactionType: "Cr" }
  //     } else {
  //       condition = { pointType: { $in: paginationDto.pointType } }
  //     }

  //     let customerTypeCond = {};
  //     if (paginationDto.customerType && paginationDto.customerType.length === 1) {
  //       const customerType = paginationDto.customerType[0];
  //       if (customerType == "Mechanic" || customerType == "Retailer") {
  //         customerTypeCond = { customerType: customerType };
  //       }
  //     }

  //     const startDate1 = paginationDto.startDate ? new Date(`${paginationDto.startDate}T00:00:00.000Z`) : null;
  //     const endDate1 = paginationDto.endDate ? new Date(`${paginationDto.endDate}T23:59:59.999Z`) : null;
  //     const query: { createdAt?: { $gte?: Date; $lte?: Date } } = {};

  //     if (startDate1 && !isNaN(startDate1.getTime())) {
  //       query.createdAt = query.createdAt || {};
  //       query.createdAt.$gte = startDate1;
  //     }

  //     if (endDate1 && !isNaN(endDate1.getTime())) {
  //       query.createdAt = query.createdAt || {};
  //       query.createdAt.$lte = endDate1;
  //     }

  //     let finalQuery: any = {};

  //     if (paginationDto.search) {
  //       const searchQuery = {
  //         $or: [
  //           { "firmName": { $regex: paginationDto.search, $options: 'i' } },
  //           { "contactPerson": { $regex: paginationDto.search, $options: 'i' } },
  //           { "customerType": { $regex: paginationDto.search, $options: 'i' } },
  //           { "mobile": { $regex: paginationDto.search, $options: 'i' } },
  //           { "address.city": { $regex: paginationDto.search, $options: 'i' } },
  //           { "address.state": { $regex: paginationDto.search, $options: 'i' } }
  //         ]
  //       };

  //       const customers = await this.customerModel.find(searchQuery).select('_id').lean();
  //       const ids = customers.map((ele) => ObjectId(ele._id));

  //       finalQuery = {
  //         transactionType: "Cr",
  //         ...(customerTypeCond ? customerTypeCond : {}),
  //         ...query,
  //         ...(paginationDto.pointType.length ? condition : {}),
  //         $or: [
  //           { customerid: { $in: ids } },
  //           { coupon: { $regex: paginationDto.search, $options: "i" } }
  //         ]
  //       };
  //     } else {
  //       finalQuery = {
  //         transactionType: "Cr",
  //         ...(customerTypeCond ? customerTypeCond : {}),
  //         ...query,
  //         ...(paginationDto.pointType.length ? condition : {}),
  //       };
  //     }

  //     const totalDocs = await this.transactionModel.countDocuments(finalQuery);
  //     const data = await this.transactionModel
  //       .find(finalQuery)
  //       .populate('customerid', 'firmName contactPerson mobile address customerType')
  //       .populate('createdBy', 'firstName lastName')
  //       .populate({
  //         path: 'productid',
  //         populate: {
  //           path: 'categoryid',
  //           select: 'categoryName',
  //         },
  //         select: 'productNo categoryid',
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip((paginationDto.currentPage - 1) * paginationDto.recordPerPage)
  //       .limit(paginationDto.recordPerPage)
  //       .lean();

  //     // Fetch packingList data from coupons and couponprofiles
  //     const couponCodes = data.map((t) => t.coupon).filter(Boolean);
  //     const couponDataList = await this.couponModel.find({ coupon: { $in: couponCodes } })
  //       .populate({
  //         path: 'couponProfileid',
  //         select: 'couponInfo',
  //       })
  //       .lean();

  //     // Create a map for quick lookup: coupon -> packingList
  //     const packingListMap = new Map<string, string>();
  //     couponDataList.forEach((couponData: any) => {
  //       if (couponData.couponProfileid && couponData.couponProfileid.couponInfo) {
  //         const couponInfo = couponData.couponProfileid.couponInfo.find(
  //           (info: any) => info._id?.toString() === couponData.couponInfoId?.toString()
  //         );
  //         if (couponInfo && couponInfo.packingList) {
  //           packingListMap.set(couponData.coupon, couponInfo.packingList);
  //         }
  //       }
  //     });

  //     const paginatedData = data.map((transaction) => {
  //       const productid = transaction.productid ? transaction.productid : "";
  //       const customerid = transaction.customerid ? transaction.customerid._id : "";
  //       const firmName = isCustomerIn(transaction.customerid) ? transaction.customerid.firmName : "";
  //       const contactPerson = isCustomerIn(transaction.customerid) ? transaction.customerid.contactPerson : "";
  //       const creadtedByContactPerson = isCreatedByIn(transaction.createdBy) ? transaction.createdBy.firstName + " " + transaction.createdBy.lastName : "";
  //       const customerType = isCustomerIn(transaction.customerid) ? transaction.customerid.customerType : "";
  //       const mobile = isCustomerIn(transaction.customerid) ? transaction.customerid.mobile : "";
  //       const city = isCustomerIn(transaction.customerid) ? transaction.customerid.address.city : "";
  //       const state = isCustomerIn(transaction.customerid) ? transaction.customerid.address.state : "";
  //       const productNo = isProductIn(transaction.productid) ? transaction.productid.productNo : "";
  //       const categoryName = isProductIn(transaction.productid) ? transaction.productid.categoryid.categoryName : "";
  //       const packingList = packingListMap.get(transaction.coupon) || "";

  //       return {
  //         _id: transaction._id,
  //         refno: transaction.refno || 0,
  //         customerid,
  //         firmName,
  //         creadtedByContactPerson,
  //         contactPerson,
  //         customerType,
  //         mobile,
  //         city,
  //         state,
  //         productNo,
  //         categoryName,
  //         points: transaction.points || 0,
  //         redemStatus: transaction.redemStatus || 0,
  //         coupon: transaction.coupon || "",
  //         packingList,
  //         redemBalance: transaction.redemStatus === 0 ? transaction.points : transaction.redemBalance,
  //         pointType: transaction.pointType || "",
  //         transactionid: transaction._id.toString(),
  //         createdAt: transaction.createdAt ? transaction.createdAt.toISOString().split("T")[0] : "",
  //       };
  //     });

  //     return {
  //       totalDocs,
  //       paginate: [
  //         { totalDocs },
  //         { recordPerPage: paginationDto.recordPerPage || 100 },
  //         { currentPage: paginationDto.currentPage || 1 },
  //       ],
  //       docs: paginatedData,
  //     };



  //   } catch (e) {
  //     throw new InternalServerErrorException(
  //       'error while getting transaction details' + e,
  //     );
  //   }
  // };

  async getTransactionInfo(id: string): Promise<GetTransactionInfoDto> {
    try {
      const data = await this.transactionModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            refno: { $ifNull: ["$refno", 0] },
            customerid: { $ifNull: ["$customerid", ""] },
            schemeid: { $ifNull: ["$schemeid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            points: { $ifNull: ["$points", 0] },
            coupon: { $ifNull: ["$coupon", ""] },
            pointType: { $ifNull: ["$pointType", ""] },
            transactionType: { $ifNull: ["$transactionType", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetTransactionInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  async updateTransactionInfo(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    try {
      return await this.transactionModel.findByIdAndUpdate(id, updateTransactionDto, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e,);
    }
  };

  async deleteTransaction(id: string): Promise<Transaction> {
    try {
      return await this.transactionModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e,);
    }
  };

  async updateStatus(statusTransactionDto: StatusTransactionDto): Promise<Transaction> {
    try {
      return await this.transactionModel.findByIdAndUpdate(statusTransactionDto.transactionid, { active: statusTransactionDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e,);
    }
  };

  private async handleTransactions(
    transactions: any[],
    customerInfo: any,
  ): Promise<void> {
    try {
      // Add creation timestamp
      transactions.forEach(transaction => {
        transaction["createdAt"] = new Date();
      });

      // Add customer type to transactions
      for (const transaction of transactions) {
        const customer = await this.customerModel.findOne({ _id: transaction.customerid });
        if (customer) {
          transaction["customerType"] = customer.customerType;
        }
      }

      // Check if transactions exist and process them
      if (transactions.length > 0) {
        const findPoint = await this.transactionModel.aggregate([
          { $match: { customerid: ObjectId(customerInfo._id) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              as: "customerInfo",
            },
          },
          {
            $lookup: {
              from: "transactions",
              let: { customerId: "$customerid" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$customerid", "$$customerId"] },
                        { $eq: ['$transactionType', "Cr"] }
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: "$customerid",
                    totalCreditPoints: { $sum: "$points" }
                  }
                }
              ],
              as: "creditPoints"
            }
          },
          {
            $unwind: {
              path: "$creditPoints",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: "$customerInfo",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              totalTransaction: { $ifNull: ["$creditPoints.totalCreditPoints", 0] },
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            }
          },
        ]);

        if (findPoint.length > 0 && findPoint[0].totalTransaction < 300) {
          let totalPoints = transactions.reduce((acc, t) => acc + (t.points || 0), 0);
          let totalTransactionPoints = totalPoints + findPoint[0].totalTransaction;

          if (totalTransactionPoints >= 300) {
            await PushNotification(
              findPoint[0].deviceToken,
              "Redemption is ON!! 💸💸",
              `${findPoint[0].firmName}, You are eligible to redeem points`,
              "Profile"
            );
          }
        }

        // Insert transactions and send notifications
        await this.transactionModel.insertMany(transactions).then(async () => {
          const findRedemption = await this.transactionModel.aggregate([
            { $match: { customerid: ObjectId(customerInfo._id) } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [{ $project: { _id: 1, firmName: 1, deviceInfo: 1 } }],
                as: "customerInfo",
              },
            },
            { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              },
            },
          ]);

          if (findRedemption.length > 0) {
            transactions.forEach(async (transaction) => {
              const pointTypeMessages = {
                "Gajra Loyalty2": "Gajra Gro + Loyalty",
                "boaster Scheme": "MRP Lable scheme",
                "Gajra Gro Loyalty Program": "Gajra Gro + Loyalty",
                "MRP LABEL SCHEME": "MRP Lable scheme",
              };

              const pointTypeMessage = pointTypeMessages[transaction.pointType] || transaction.pointType;
              await PushNotification(
                findRedemption[0].deviceToken,
                "Scan Successful 💸💸",
                `${findRedemption[0].firmName}, you have successfully earned ${transaction.points} points in ${pointTypeMessage}`,
                "History"
              );
            });
          }
        });
      }
    } catch (error) {
      throw new InternalServerErrorException('Error in handleTransactions: ' + error.message);
    }
  }

  async couponScans(couponsScanDTO: AdminCouponsScanDTO, req?: Request): Promise<any> {
    try {
      const setting = await this.projectSettingModel
        .findOne({})
        .select('loyaltyscheme')
        .exec();

      const customerInfo = await this.getCustomerProfileInfo(couponsScanDTO.customerid);
      const schemes = await this.getActiveSchemes();

      const toScanedCoupons = couponsScanDTO.coupons.map((el) => el.coupon);
      const scannedCoupons = await this.getScanedCoupons(toScanedCoupons);
      const coupons = await this.getCouponsToScans(toScanedCoupons);
      let refno = await this.getNewRefNoTransaction();
      refno--;

      const scanActions = await Promise.all(
        couponsScanDTO.coupons.map(async (item) => {
          const couponInfo = coupons.find((obj) => obj.coupon === item.coupon);
          const couponDetailInfo = couponInfo?.couponInfo || {};
          const scannedCoupon = scannedCoupons.find((obj) => obj.coupon === item.coupon);
          const findCustomer = await this.couponModel.findOne({ coupon: item.coupon });
          if (
            findCustomer &&
            (findCustomer.customerType !== customerInfo.customerType ||
              (!findCustomer.customerType && "Mechanic" !== customerInfo.customerType))
          ) {
            return { ...item, isError: true, errorMessage: `This is ${findCustomer.customerType} coupon` };
          }

          if (!couponInfo) {
            return { ...item, isError: true, errorMessage: 'QRCODE_INVALID' };
          }
          if (!customerInfo._id) {
            return { ...item, isError: true, errorMessage: 'CUSTOMER_INVALID' };
          }
          if (
            setting?.loyaltyscheme?.customerType_based &&
            couponInfo.customerType &&
            !couponInfo.customerType.includes(customerInfo.customerType)
          ) {
            return { ...item, isError: true, errorMessage: 'QRCODE_NOT_FOR_CUSTOMERTYPE' };
          }
          if (scannedCoupon) {
            return { ...item, isError: true, errorMessage: 'QRCODE_ALREADY_SCANNED' };
          }
          if (couponInfo.startDate > new Date() || couponInfo.expiryDate < new Date()) {
            return { ...item, isError: true, errorMessage: 'QRCODE_EXPIRE' };
          }

          const validSchemes = schemes.filter((scheme) =>
            scheme.customerType.includes(customerInfo.customerType)
          );

          if (validSchemes.length === 0) {
            return { ...item, isError: true, errorMessage: 'NO_VALID_SCHEMES_FOUND' };
          }

          const results = await Promise.all(
            validSchemes.map(async (scheme) => {
              const matchedProducts = scheme.schemeDetail.find((obj) =>
                obj.products.includes(couponDetailInfo.productid)
              );

              if (
                setting?.loyaltyscheme?.customerType_based &&
                !scheme.customerType.includes(customerInfo.customerType)
              ) {
                return { ...item, isError: true, errorMessage: 'PROGRAM_NOT_FOR_CUSTOMERTYPE' };
              }

              if (
                setting?.loyaltyscheme?.states_based &&
                !scheme.states.includes(customerInfo.state)
              ) {
                return { ...item, isError: true, errorMessage: 'PROGRAM_NOT_FOR_STATE' };
              }

              if (
                setting?.loyaltyscheme?.city_based &&
                !scheme.cities.includes(customerInfo.city)
              ) {
                return { ...item, isError: true, errorMessage: 'QRCODE_NOT_FOR_CITY' };
              }

              if (!matchedProducts) {
                return { ...item, isError: true, errorMessage: 'PRODUCT_NOT_IN_PROGRAM' };
              }

              if (matchedProducts.points === 0) {
                return { ...item, isError: true, errorMessage: 'PRODUCT_EXIST_WITHOUT_POINTS_IN_PROGRAM' };
              }

              const points =
                scheme.basedOn === 'Percentage'
                  ? Math.round((matchedProducts.points / 100) * couponInfo.mrp)
                  : matchedProducts.points;

              refno++;
              return {
                coupon: item.coupon,
                productid: couponDetailInfo.productid,
                customerid: ObjectId(customerInfo._id) ? ObjectId(customerInfo._id) : couponsScanDTO.customerid,
                schemeid: scheme._id,
                points,
                pointType: scheme.schemeName || "Coupon Scan",
                transactionType: "Cr",
                refno,
              };
            })
          );

          return results.flat();
        })
      );

      const flattenedResults = scanActions.flat();
      const transactions = flattenedResults.filter((transaction) => transaction.transactionType === 'Cr');
      transactions.forEach((transaction) => (transaction.createdAt = new Date()));

      for (const transaction of transactions) {
        const customer = await this.customerModel.findOne({ _id: transaction.customerid });
        if (customer) {
          transaction.customerType = customer.customerType;
        }
      }

      if (transactions.length > 0) {
        await this.handleTransactions(transactions, customerInfo);
      }

      return flattenedResults;
    } catch (error) {
      throw new InternalServerErrorException('Error while processing transactions: ' + error.message);
    }
  }

  // async couponScans(couponsScanDTO: AdminCouponsScanDTO, req?: Request): Promise<any> {
  //   try {

  //     const setting = await this.projectSettingModel.findOne({}).select('loyaltyscheme').exec()
  //     const customerInfo = await this.getCustomerProfileInfo(couponsScanDTO.customerid);

  //     const schemes = await this.getActiveSchemes()
  //     var toscaned = couponsScanDTO.coupons.map(function (el) { return el.coupon; });
  //     const scanedcoupons = await this.getScanedCoupons(toscaned)
  //     const coupons = await this.getCouponsToScans(toscaned)
  //     var refno = await this.getNewRefNoTransaction()


  //     refno = refno - 1
  //     const scanActions = await Promise.all(couponsScanDTO.coupons.map(async (item) => {

  //       const couponInfo = await coupons && coupons.find(obj => obj.coupon === item.coupon);
  //       const couponDetailInfo = (couponInfo && couponInfo.couponInfo) ? couponInfo.couponInfo : {}
  //       const couponScaned = await scanedcoupons.find(obj => obj.coupon === item.coupon);
  //       const customerInfo = await this.getCustomerProfileInfo(couponsScanDTO.customerid);
  //       // const today = new Date(couponInfo.startDate);
  //       // const threeYearsLater = new Date(today.setFullYear(today.getFullYear() + 3));
  //       const findCustomer = await this.couponModel.findOne({ coupon: item.coupon });

  //       if ((findCustomer && findCustomer.customerType != customerInfo.customerType) || (findCustomer && !findCustomer.customerType && "Mechanic" != customerInfo.customerType)) {

  //         return { ...item, isError: true, errorMessage: `This is ${findCustomer.customerType} coupon` };
  //       }

  //       //Check Customer Type For Coupons
  //       if (!couponInfo) {
  //         return { ...item, isError: true, errorMessage: 'QRCODE_INVALID' }
  //       }
  //       else if (!customerInfo._id) {
  //         return { ...item, isError: true, errorMessage: 'CUSTOMER_INVALID' }
  //       }
  //       else if (setting?.loyaltyscheme?.customerType_based && couponInfo.customerType && !couponInfo.customerType.includes(customerInfo.customerType)) {
  //         return { ...item, isError: true, errorMessage: 'QRCODE_NOT_FOR_CUSTOMERTYPE' }
  //       }
  //       //Check Coupons Alread Scaneed
  //       else if (couponScaned) {
  //         return { ...item, isError: true, errorMessage: 'QRCODE_ALREADY_SCANNED' }
  //       }
  //       //Check Coupons Expire Date


  //       else if (couponInfo.startDate > new Date() && couponInfo.expiryDate < new Date()) {
  //         // else if (couponInfo.startDate > new Date() && (couponInfo.expiryDate < new Date() || threeYearsLater < new Date() )) {
  //         return { ...item, isError: true, errorMessage: 'QRCODE_EXPIRE' }
  //       }
  //       else {
  //         let schemes1 = []
  //         schemes.forEach((ele) => {

  //           if (ele.customerType.includes(customerInfo.customerType)) {
  //             schemes1.push(ele)

  //           }
  //         });

  //         if (schemes1.length > 0) {
  //           const results = await Promise.all(
  //               schemes1.map(async (scheme) => {
  //                   console.log("Processing scheme:", scheme.schemeName); // Debug log for scheme
  //                   const matchedProducts = scheme.schemeDetail.find(obj =>
  //                       obj.products.includes(couponDetailInfo.productid)
  //                   );

  //                   // Check customerType-based validation
  //                   if (
  //                       setting?.loyaltyscheme?.customerType_based &&
  //                       !scheme.customerType.includes(customerInfo.customerType)
  //                   ) {
  //                       console.log("CustomerType mismatch:", scheme.customerType, customerInfo.customerType);
  //                       return { ...item, isError: true, errorMessage: 'PROGRAM_NOT_FOR_CUSTOMERTYPE' };
  //                   }

  //                   // Check state-based validation
  //                   if (
  //                       setting?.loyaltyscheme?.states_based &&
  //                       !scheme.states.includes(customerInfo.state)
  //                   ) {
  //                       console.log("State mismatch:", scheme.states, customerInfo.state);
  //                       return { ...item, isError: true, errorMessage: 'PROGRAM_NOT_FOR_STATE' };
  //                   }

  //                   // Check city-based validation
  //                   if (
  //                       setting?.loyaltyscheme?.city_based &&
  //                       !scheme.cities.includes(customerInfo.city)
  //                   ) {
  //                       console.log("City mismatch:", scheme.cities, customerInfo.city);
  //                       return { ...item, isError: true, errorMessage: 'QRCODE_NOT_FOR_CITY' };
  //                   }

  //                   // Check product matching
  //                   if (!matchedProducts) {
  //                       console.log("Product not in program:", couponDetailInfo.productid);
  //                       return { ...item, isError: true, errorMessage: 'PRODUCT_NOT_IN_PROGRAM' };
  //                   }

  //                   // Check points validation
  //                   if (matchedProducts.points === 0) {
  //                       console.log("Product exists without points:", matchedProducts);
  //                       return { ...item, isError: true, errorMessage: 'PRODUCT_EXIST_WITHOUT_POINTS_IN_PROGRAM' };
  //                   }

  //                   // If all validations pass, calculate points
  //                   const points = scheme.basedOn === 'Percentage'
  //                       ? Math.round((matchedProducts.points / 100) * couponInfo.mrp)
  //                       : matchedProducts.points;

  //                   refno += 1;
  //                   return {
  //                       coupon: item.coupon,
  //                       productid: couponDetailInfo.productid,
  //                       customerid: ObjectId(customerInfo._id),
  //                       schemeid: scheme._id,
  //                       points,
  //                       pointType: scheme.schemeName || "Coupon Scan",
  //                       transactionType: "Cr",
  //                       refno,
  //                   };
  //               })
  //           );

  //           // Log and handle results
  //           console.log("Results from Promise.all:", results);

  //           // Separate errors and successes
  //           const errors = results.filter(result => result);
  //           const successes = results.filter(result => !result);

  //           // Log details
  //           if (errors.length > 0) {
  //               console.log("Errors found in results:", errors);
  //               return errors; // Return all errors for debugging
  //           }

  //           console.log("Successful results:", successes);
  //           return successes; // Return success results if no errors
  //       }


  //       }
  //     }))
  //     const flattenedArray = await scanActions.flat();

  //     var transactionData = await flattenedArray.filter(function (transaction) { return transaction.transactionType == 'Cr' });
  //     transactionData.map(async (ele) => { ele["createdAt"] = new Date() })
  //     transactionData.forEach(async (ele) => {
  //       let customers = await this.customerModel.findOne({ _id: ele.customerid });
  //       if (customers) {
  //         ele["customerType"] = customers.customerType;
  //       }
  //     })
  //     if (Array.isArray(transactionData) && transactionData.length) {
  //       const findPoint = await this.transactionModel.aggregate([
  //         { $match: { customerid: ObjectId(customerInfo._id) } },
  //         {
  //           $lookup: {
  //             from: "customers",
  //             localField: "customerid",
  //             foreignField: "_id",
  //             as: "customerInfo",
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: "transactions",
  //             let: { customerId: "$customerid" },
  //             pipeline: [
  //               {
  //                 $match: {
  //                   $expr: {
  //                     $and: [
  //                       { $eq: ["$customerid", "$$customerId"] },
  //                       { $eq: ['$transactionType', "Cr"] }
  //                     ]
  //                   }
  //                 }
  //               },
  //               {
  //                 $group: {
  //                   _id: "$customerid",
  //                   totalCreditPoints: { $sum: "$points" }
  //                 }
  //               }
  //             ],
  //             as: "creditPoints"
  //           }
  //         },
  //         {
  //           $unwind: {
  //             path: "$creditPoints",
  //             preserveNullAndEmptyArrays: true
  //           }
  //         },
  //         {
  //           $unwind: {
  //             path: "$customerInfo",
  //             preserveNullAndEmptyArrays: true
  //           }
  //         },
  //         {
  //           $project: {
  //             totalTransaction: { $ifNull: ["$creditPoints.totalCreditPoints", 0] },
  //             firmName: { $ifNull: ["$customerInfo.firmName", ""] },
  //             deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },

  //           }
  //         },

  //       ])
  //       if (findPoint.length > 0 && findPoint[0].totalTransaction < 300) {

  //         let totalAmount = 0;
  //         for (const obj of transactionData) {

  //           if (!isNaN(obj.points)) {
  //             totalAmount += Number(obj.points);
  //           }
  //         }
  //         let totalPoint = Number(totalAmount) + Number(findPoint[0].totalTransaction);
  //         if (totalPoint > 300 || totalPoint == 300) {

  //           await PushNotification(`${findPoint[0].deviceToken}`, "Redemption is ON!! 💸💸", `${findPoint[0].firmName}, You are eligible to redeem points `, "Profile");


  //         }
  //       }
  //       await this.transactionModel.insertMany(transactionData).then(async (result) => {

  //         const findRedemption = await this.transactionModel.aggregate([
  //           { $match: { customerid: ObjectId(customerInfo._id), } },
  //           {
  //             $lookup: {
  //               from: "customers",
  //               localField: "customerid",
  //               foreignField: "_id",
  //               pipeline: [
  //                 { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
  //               ],
  //               as: "customerInfo",
  //             },
  //           },
  //           { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
  //           {
  //             $project: {
  //               firmName: { $ifNull: ["$customerInfo.firmName", ""] },
  //               deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
  //             }
  //           }

  //         ])


  //         if (findRedemption.length > 0) {
  //           transactionData.forEach(async (ele) => {
  //             if (ele.pointType == "Gajra Loyalty2") {
  //               await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `, "History");
  //             }
  //             if (ele.pointType == "boaster Scheme") {

  //               await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in MRP Lable scheme . `, "History");

  //             }

  //             if (ele.pointType == "Gajra Gro Loyalty Program") {
  //               await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `, "History");

  //             }
  //             if (ele.pointType == "MRP LABEL SCHEME") {
  //               await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned  ${ele.points} points in MRP Lable scheme . `, "History");

  //             }
  //           })
  //         }

  //         return flattenedArray;
  //       })
  //         .catch(err => {
  //           throw new InternalServerErrorException(err);
  //         });
  //     }

  //     return flattenedArray
  //   }
  //   catch (e) {
  //     throw new InternalServerErrorException('error while getting transaction details' + e,);
  //   }
  // };

  async getActiveSchemes(): Promise<any> {
    return await this.schemeModel.find({ startedAt: { $lt: new Date() }, endedAt: { $gt: new Date() }, active: true }).select('schemeDetail schemeType schemeName customerType customers states cities basedOn frequency').exec()
  };

  async getScanedCoupons(toscaned: any): Promise<any> {
    return await this.transactionModel.aggregate([
      { $match: { coupon: { $in: toscaned } } },
      {
        $lookup: {
          from: "customers",
          localField: "customerid",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, customerType: 1, "address.city": 1, "address.state": 1 } }
          ],
          as: "customerInfo",
        },
      },
      { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
      {
        $project: {
          _id: 0,
          refno: { $ifNull: ["$refno", 0] },
          coupon: { $ifNull: ["$coupon", ""] },
          customerType: { $ifNull: ["$customerInfo.customerType", ""] },
          city: { $ifNull: ["$customerInfo.address.city", ""] },
          state: { $ifNull: ["$customerInfo.address.state", ""] },
        },
      },
    ]).exec()
  };

  async getCouponsToScans(toscaned: any): Promise<any> {
    return await this.couponModel.aggregate([
      { $match: { coupon: { $in: toscaned } } },
      {
        $lookup: {
          from: "couponprofiles",
          localField: "couponProfileid",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, startDate: 1, expiryDate: 1, customerType: 1, couponInfo: 1 } }
          ],
          as: "profileInfo",
        },
      },
      { $unwind: { "path": "$profileInfo", "preserveNullAndEmptyArrays": true } },
      {
        $project: {
          _id: 0,
          coupon: { $ifNull: ["$coupon", ""] },
          couponInfoId: { $ifNull: ["$couponInfoId", ""] },
          startDate: { $ifNull: ["$profileInfo.startDate", ""] },
          expiryDate: { $ifNull: ["$profileInfo.expiryDate", ""] },
          customerType: 1,
          couponInfo: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$profileInfo.couponInfo',
                  as: 'info',
                  cond: { $eq: ['$$info._id', "$couponInfoId"] }
                }
              },
              0
            ]
          }
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "couponInfo.productid",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, productNo: 1, productDetail: 1 } }
          ],
          as: "productInfo"
        }
      },
      { $unwind: { "path": "$productInfo", "preserveNullAndEmptyArrays": true } },
      {
        $project: {
          coupon: 1,
          couponInfoId: 1,
          startDate: 1,
          expiryDate: 1,
          customerType: 1,
          couponInfo: 1,
          mrp: { $first: "$productInfo.productDetail.mrp" },
          price: { $first: "$productInfo.productDetail.price" },
        },
      },
    ]).exec()
  };

  async getScanSchemeDetail(getdate: any, customerid: string): Promise<any> {
    var data = await this.transactionModel.aggregate([
      { $match: { createdAt: { $gte: new Date(getdate.fromDate), $lte: new Date(getdate.toDate) }, customerid: ObjectId(customerid), transactionType: "Cr" } },
      { $group: { _id: null, points: { $sum: "$points" }, counts: { $sum: 1 } } },
      { $limit: 1 },
    ]).exec()
    return (Array.isArray(data) && data.length) ? data[0] : { _id: null, points: 1, counts: 1 }
  };

  async getSchemeDetailByProduct(schemeid: any, products: any): Promise<any> {
    // var data = await this.transactionModel.aggregate([
    //   { $match: { _id: ObjectId(schemeid) } },
    //   { $unwind: "$data.schemeDetail" },
    //   {
    //     $match: { $in: { "data.schemeDetail.products": [products] } }
    //   },
    //   {
    //     $project: {
    //       id: 1,
    //       "data.schemeDetail.points": 1,
    //     }
    //   },
    //   { $limit: 1 },
    // ]).exec()
    // console.log(data);
    var data = await this.schemeModel.findById(schemeid).select('schemeDetail').exec()
    var details = await data.schemeDetail.filter(item => {
      return item.products.includes(products)
    });
    return details
  };

  async getCustomerProfileInfo(customerid: any): Promise<any> {
    try {
      const data = await this.customerModel.aggregate([
        { $match: { "_id": ObjectId(customerid) } },
        {
          $project: {
            _id: 1,
            firmName: { $ifNull: ["$firmName", ""] },
            customerType: { $ifNull: ["$customerType", ""] },
            country: { $ifNull: ["$address.country", ""] },
            state: { $ifNull: ["$address.state", ""] },
            city: { $ifNull: ["$address.city", ""] },
            parentid: { $ifNull: ["$parentid", []] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return (Array.isArray(data) && data.length) ? data[0] : { _id: null }
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting customer details' + e,
      );
    }
  };

  async leaderboard(req): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.transactionModel.aggregate([
        { $match: { transactionType: "Cr" } },
        { $group: { _id: "$customerid", total_point: { $sum: "$points" } } },
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: "$customerInfo" },
        {
          $project: {
            _id: 1,
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            points: { $ifNull: ["$total_point", 0] },
          },
        },
        { $sort: { points: -1 } },
        { $limit: 10 },
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
  };

  public async welcomePoints(customerid: any): Promise<any> {
    const refno = await this.getNewRefNoTransaction()
    this.transactionModel.create({ customerid: ObjectId(customerid), points: 50, pointType: 'WelCome Point', transactionType: 'Cr', refno: refno }, function (err, data) {
      if (err) throw new BadRequestException('Error in Create Transaction');
      return data;
    });
  };
  async getAllCustomerTransaction(startDate: string, endDate: string, customerIdDTO: CustomerIdDTO): Promise<any> {
    try {
      const startDate1 = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
      const endDate1 = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

      const query: { createdAt?: { $gte?: Date; $lte?: Date } } = {};

      if (startDate1 && !isNaN(startDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$gte = startDate1;
      }

      if (endDate1 && !isNaN(endDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = endDate1;
      }

      const data = await this.transactionModel.aggregate([
        {
          $match: {
            transactionType: "Cr",
            customerid: ObjectId(customerIdDTO.customerid),
          }
        },
        { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "products",
            localField: "productid",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, productNo: 1, name: 1, categoryid: 1 } }],
            as: "productInfo",
          }
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.categoryid",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, categoryName: 1 } }],
            as: "categoryInfo",
          }
        },
        {
          $project: {
            _id: 1,
            city: { $ifNull: ["$city", ""] },
            customerid: { $ifNull: ["$customerid", ""] },
            points: { $ifNull: ["$points", 0] },
            refno: { $ifNull: ["$refno", 0] },
            redemStatus: { $ifNull: [0, 0] },
            redemBalance: { $ifNull: ["$points", 0] },
            coupon: { $ifNull: ["$coupon", ""] },
            pointType: { $ifNull: ["$pointType", ""] },
            createdAt: "$createdAt",
            productNo: { $ifNull: ["$productInfo.productNo", ""] },
            categoryName: { $ifNull: [{ $first: "$categoryInfo.categoryName" }, ""] },
          },
        },
        {
          $match: query,
        },
        { $sort: { createdAt: -1 } },
      ]).exec();

      // if (!data || data.length === 0) {
      //   throw new BadRequestException('Data Not Found');
      // }

      // Redemption points logic remains unchanged
      const redemPoint = await this.transactionModel.aggregate([
        { $match: { customerid: ObjectId(customerIdDTO.customerid), transactionType: "Cr" } },
        {
          $lookup: {
            from: "redemptions",
            localField: "customerid",
            foreignField: "customerid",
            pipeline: [
              {
                $match: { customerid: ObjectId(customerIdDTO.customerid), $or: [{ status: "Success" }, { status: "success" }] }
              },
              { $project: { _id: 1, transactionid: 1, points: 1 } }
            ],
            as: "redemptionInfo",
          }
        },
        {
          $project: {
            _id: 0,
            redemptionInfo: "$redemptionInfo",
            totalPoints: { $sum: "$redemptionInfo.points" }
          }
        }
      ]);

      let targetSum = redemPoint[0]?.totalPoints || 0;

      data.forEach((currentPoint, index) => {
        let redem = Math.min(currentPoint.points, targetSum);
        let balance = targetSum - redem;

        currentPoint.redemStatus = redem;
        currentPoint.redemBalance = index === data.length - 1 ? currentPoint.points - redem : currentPoint.points - redem;

        targetSum -= redem;
      });

      return data;
    } catch (e) {
      throw new InternalServerErrorException('Error while getting transaction details: ' + e);
    }
  }

  public async getNewRefNoTransaction(): Promise<number> {
    const transaction = await this.transactionModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (transaction && transaction.refno) ? transaction.refno + 1 : 1;
  };

  async importScanTransactions(createTransactionDto: ImportCouponTransactionDTO[]): Promise<any> {
    try {
      const setting = await this.projectSettingModel.findOne({}).select('loyaltyscheme').exec()
      const schemes = await this.getActiveSchemes()
      const dataArray = Array.isArray(createTransactionDto) ? createTransactionDto : Object.values(createTransactionDto);
      var refno = await this.getNewRefNoTransaction()
      refno = refno - 1
      const mappedArray = await Promise.all(dataArray.map(async (transaction: any) => {
        const customerInfo = await this.getCustomerProfileInfo(transaction.customerid)
        const couponInfo = await this.checkCouponValidation(transaction.coupon)
        const couponDetailInfo = (couponInfo.couponInfo) ? couponInfo.couponInfo[0] : {};
        const today = new Date(couponInfo.startDate);
        const threeYearsLater = new Date(today.setFullYear(today.getFullYear() + 3));
        const couponScaned = await this.checkCouponScanedBefore(transaction.coupon);
        if (Object.keys(couponInfo).length === 0) {
          return { ...transaction, isError: true, errorMessage: 'QRCODE_INVALID' }
        }
        else if (!customerInfo._id) {
          return { ...transaction, isError: true, errorMessage: 'CUSTOMER_INVALID' }
        }
        else if (setting?.loyaltyscheme?.customerType_based && couponInfo.customerType && !couponInfo.customerType.includes(customerInfo.customerType)) {
          return { ...transaction, isError: true, errorMessage: 'QRCODE_NOT_FOR_CUSTOMERTYPE' }
        } //Check Coupons Alread Scaneed
        else if (couponScaned) {
          return { ...transaction, isError: true, errorMessage: 'QRCODE_ALREADY_SCANNED' }
        }
        //Check Coupons Expire Date
        else if (couponInfo.startDate > new Date() && (couponInfo.expiryDate < new Date() || threeYearsLater < new Date())) {
          return { ...transaction, isError: true, errorMessage: 'QRCODE_EXPIRE' }
        }
        else {
          return await Promise.all(schemes.map(async (scheme) => {
            const matchedProducts = await scheme.schemeDetail.find(obj => obj.products.includes(couponDetailInfo.productid));
            console.log('match', matchedProducts);

            if (setting?.loyaltyscheme?.customerType_based && !scheme.customerType.includes(customerInfo.customerType)) {
              return { ...transaction, isError: true, errorMessage: 'PROGRAM_NOT_FOR_CUSTOMERTYPE' }
            }
            //Check Program For State
            if (setting?.loyaltyscheme?.states_based && !scheme.states.includes(customerInfo.state)) {
              return { ...transaction, isError: true, errorMessage: 'PROGRAM_NOT_FOR_STATE' }
            }
            //Check Program For City
            else if (setting?.loyaltyscheme?.city_based && !scheme.cities.includes(customerInfo.city)) {
              return { ...transaction, isError: true, errorMessage: 'QRCODE_NOT_FOR_CITY' }
            }
            //Check Product in Program
            else if (!matchedProducts) {
              return { ...transaction, isError: true, errorMessage: 'PRODUCT_NOT_IN_PROGRAM' }
            }
            //Check Product in Program With 0 Point
            else if (matchedProducts.points === 0) {
              return { ...transaction, isError: true, errorMessage: 'PRODUCT_EXIST_WITHOUT_POINTS_IN_PROGRAM' }
            }
            else {
              const points = (scheme.basedOn === 'Percentage') ? Math.round((matchedProducts.points / couponInfo[0].price) * 100) : matchedProducts.points
              refno = refno + 1
              return { ...transaction, productid: couponDetailInfo.productid, customerid: ObjectId(customerInfo._id), schemeid: scheme._id, points: points, pointType: "Coupon Scan", transactionType: "Cr", refno: refno }
            }
          }))
        }

      })
      );
      const flattenedArray = await mappedArray.flat();
      var transactionData = await flattenedArray.filter(function (transaction) { return transaction.transactionType == 'Cr' });
      transactionData.forEach(async (ele) => {
        let customers = await this.customerModel.findOne({ _id: ele.customerid });
        ele["customerType"] = customers.customerType
      })
      if (Array.isArray(transactionData) && transactionData.length) {
        await this.transactionModel.insertMany(transactionData).then(async (result) => {
          //     transactionData.forEach(async(ele)=>{
          //  const findRedemption = await this.transactionModel.aggregate([
          //       {$match:{customerid: ObjectId(ele._id)}},
          //       {
          //         $lookup: {
          //           from: "customers",
          //           localField: "customerid",
          //           foreignField: "_id",
          //           pipeline: [
          //             { $project: { _id: 1, firmName: 1, deviceInfo: 1,  } }
          //           ],
          //           as: "customerInfo",
          //         },
          //       },
          //     { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          //     {
          //       $project:{
          //         firmName: { $ifNull: ["$customerInfo.firmName", ""] },
          //         deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
          //       }
          //     }

          //     ])
          //     if (findRedemption.length > 0) {
          //           transactionData.forEach(async(ele)=>{
          //               if(ele.pointType == "Gajra Loyalty2"){
          //                   await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `,"History");
          //               }
          //               if(ele.pointType == "boaster Scheme"){

          //                   await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in MRP Lable scheme . `,"History");

          //               }

          //                if(ele.pointType == "Gajra Gro Loyalty Program"){
          //                 await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `,"History");

          //               }
          //               if(ele.pointType == "MRP LABEL SCHEME"){
          //                 await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned  ${ele.points} points in MRP Lable scheme . `,"History");

          //               }
          //           })
          //   }
          //     })
          return flattenedArray;
        })
          .catch(err => {
            throw new InternalServerErrorException(err);
          });

      }
      return new GetTransactionInfoDto(flattenedArray);
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async checkCouponValidation(coupon: string): Promise<any> {
    try {
      const data = await this.couponModel.aggregate([
        { $match: { coupon: coupon } },
        {
          $lookup: {
            from: "couponprofiles",
            localField: "couponProfileid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, startDate: 1, expiryDate: 1, customerType: 1, couponInfo: 1 } },

            ],
            as: "profileInfo",
          },
        },
        { $unwind: { "path": "$profileInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            coupon: { $ifNull: ["$coupon", ""] },
            couponInfoId: { $ifNull: ["$couponInfoId", ""] },
            startDate: { $ifNull: ["$profileInfo.startDate", ""] },
            expiryDate: { $ifNull: ["$profileInfo.expiryDate", ""] },
            customerType: { $ifNull: ["$profileInfo.customerType", []] },
            couponInfo: {
              $filter: {
                input: '$profileInfo.couponInfo',
                as: 'info',
                cond: { $eq: ['$$info._id', "$couponInfoId"] }
              }
            }
          },
        },
        { $limit: 1 },
      ]).exec()
      return (Array.isArray(data) && data.length) ? data[0] : {}
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  async checkCouponScanedBefore(coupon: string): Promise<any> {
    return await this.transactionModel.findOne({ coupon: coupon }).select('coupon customerid').exec()
  };

  async importTransactions(createTransactionDto: ImportTransactionDTO[]): Promise<any> {
    try {
      const dataArray = Array.isArray(createTransactionDto) ? createTransactionDto : Object.values(createTransactionDto);
      var refno = await this.getNewRefNoTransaction()
      refno = refno - 1
      const mappedArray = await Promise.all(dataArray.map(async (transaction: any) => {
        const customerInfo = await this.getCustomerProfileInfo(transaction.customerid)
        if (!customerInfo._id) {
          return { ...transaction, isError: true, errorMessage: 'CUSTOMER_INVALID' }
        }
        else {
          transaction.customerid = ObjectId(transaction.customerid)
          refno = refno + 1
          return { ...transaction, transactionType: "Cr", refno: refno }
        }
      })
      );
      const flattenedArray = await mappedArray.flat();
      var transactionData = await flattenedArray.filter(function (transaction) { return transaction.transactionType == 'Cr' });
      if (Array.isArray(transactionData) && transactionData.length) {
        transactionData.forEach(async (ele) => {
          let customers = await this.customerModel.findOne({ _id: ele.customerid });
          ele["customerType"] = customers.customerType
        })
        await this.transactionModel.insertMany(transactionData).then((result) => {

          // transactionData.forEach(async(ele)=>{
          //  const findRedemption = await this.transactionModel.aggregate([
          //       {$match:{customerid: ObjectId(ele._id)}},
          //       {
          //         $lookup: {
          //           from: "customers",
          //           localField: "customerid",
          //           foreignField: "_id",
          //           pipeline: [
          //             { $project: { _id: 1, firmName: 1, deviceInfo: 1,  } }
          //           ],
          //           as: "customerInfo",
          //         },
          //       },
          //     { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          //     {
          //       $project:{
          //         firmName: { $ifNull: ["$customerInfo.firmName", ""] },
          //         deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
          //       }
          //     }

          //     ])
          //     if (findRedemption.length > 0) {
          //           transactionData.forEach(async(ele)=>{
          //               if(ele.pointType == "Gajra Loyalty2"){
          //                   await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `,"History");
          //               }
          //               if(ele.pointType == "boaster Scheme"){

          //                   await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in MRP Lable scheme . `,"History");

          //               }

          //                if(ele.pointType == "Gajra Gro Loyalty Program"){
          //                 await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful  💸 💸", `${findRedemption[0].firmName}, you have successfully earned ${ele.points} points in Gajra Gro + Loyalty `,"History");

          //               }
          //               if(ele.pointType == "MRP LABEL SCHEME"){
          //                 await PushNotification(`${findRedemption[0].deviceToken}`, "Scan Successful 💸 💸", `${findRedemption[0].firmName}, you have successfully earned  ${ele.points} points in MRP Lable scheme . `,"History");

          //               }
          //           })
          //   }
          //     })
          return flattenedArray;
        })
          .catch(err => {
            throw new InternalServerErrorException(err);
          });

      }
      return new GetTransactionInfoDto(flattenedArray);
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async addInvalidCoupon(addInvalidCouponDTO: AddInvalidCouponDTO): Promise<any> {
    try {
      let findCustomer = await this.customerModel.findOne({
        _id: ObjectId(addInvalidCouponDTO.customerid)
      })
      if (!findCustomer) {
        throw new BadRequestException("Customer not exit")
      }

      const coupon = new this.invalidCouponModel({ ...addInvalidCouponDTO, createdAt: new Date() });


      if (coupon.save()) {
        return new GetTransactionInfoDto(coupon)
      }
    } catch (e) {
      throw new InternalServerErrorException(e)
    }
  };
  async getAllInvalidCoupon(paginationDto: FilterPaginationInvalidCouponDto): Promise<any> {
    try {

      const currentPage = paginationDto.currentPage || 1;
      const recordPerPage = paginationDto.recordPerPage || 100;


      const startDate = paginationDto.startDate ? new Date(`${paginationDto.startDate}T00:00:00.000Z`) : null;
      const endDate = paginationDto.endDate ? new Date(`${paginationDto.endDate}T23:59:59.999Z`) : null;
      const dateQuery: { createdAt?: { $gte?: Date; $lte?: Date } } = {};
      if (startDate) dateQuery.createdAt = { $gte: startDate };
      if (endDate) dateQuery.createdAt = { ...dateQuery.createdAt, $lte: endDate };


      const statusCondition = paginationDto.statusType ? { statusType: paginationDto.statusType } : {};

      let finalQuery: any;
      let ids: any[] = [];
      let totalDocs = 0;
      let data: any[] = [];


      if (paginationDto.search) {
        const searchQuery = {
          $or: [
            { firmName: { $regex: paginationDto.search, $options: "i" } },
            { contactPerson: { $regex: paginationDto.search, $options: "i" } },
            { mobile: { $regex: paginationDto.search, $options: "i" } },
          ],
        };


        const matchedCustomers = await this.customerModel.aggregate([{ $match: searchQuery }]);
        ids = matchedCustomers.map((customer) => customer._id);


        finalQuery = {
          ...dateQuery,
          ...statusCondition,
          ...(paginationDto.search
            ? {
              $or: [
                { couponCode: { $regex: paginationDto.search, $options: "i" } },
                { remark: { $regex: paginationDto.search, $options: "i" } },
                { couponGg: { $regex: paginationDto.search, $options: "i" } },
                { customerid: { $in: ids } }
              ],
            }
            : {}),
        };
      } else {
        finalQuery = {
          ...dateQuery,
          ...statusCondition,
        };
      }

      totalDocs = await this.invalidCouponModel.countDocuments(finalQuery);
      data = await this.invalidCouponModel
        .find(finalQuery)
        .populate("customerid", "firmName contactPerson mobile address customerType")
        .populate("modifyByid", "firmName contactPerson mobile address customerType")
        .sort({ createdAt: paginationDto.statusType === "Pending" ? 1 : -1 })
        .skip((currentPage - 1) * recordPerPage)
        .limit(recordPerPage)
        .lean();


      const paginatedData = data.map((coupon) => {
        const customer = coupon.customerid || {};
        const modifier = coupon.modifyByid || {};

        return {
          _id: coupon._id,
          createdAt: coupon.createdAt ? coupon.createdAt.toISOString().split("T")[0] : "",
          firmName: customer.firmName || "",
          customerType: customer.customerType || "Mechanic",
          contactPerson: customer.contactPerson || "",
          modifyFirmName: modifier.firmName || "",
          modifyContactPerson: modifier.contactPerson || "",
          mobile: customer.mobile || 0,
          couponCode: coupon.couponCode || "",
          couponGg: coupon.couponGg || "",
          statusType: coupon.statusType || "Pending",
          active: coupon.active !== undefined ? coupon.active : true,
          couponImage: coupon.couponImage || [],
          remark: coupon.remark || "",
        };
      });


      return [{
        paginate: [
          {
            totalDocs,
            recordPerPage,
            currentPage
          },
        ],
        docs: paginatedData,
      }];
    } catch (e) {
      throw new InternalServerErrorException(
        `Error while fetching invalid coupons: ${e.message}`
      );
    }
  }

  async productDropdown(statusCouponDto: ProductDropdownDto): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const findInvalidCoupon = await this.invalidCouponModel.findOne({ _id: ObjectId(statusCouponDto.invalidCouponid) });
        if (!findInvalidCoupon) {
          return reject(new BadRequestException("Coupon not exist"));
        }

        const findCustomer = await this.customerModel.find({ _id: findInvalidCoupon.customerid });
        if (findCustomer.length <= 0) {
          return reject(new BadRequestException("Customer not exist"));
        }

        let condition: any = {};

        if (statusCouponDto.pointSearch) {
          const pointValue = parseFloat(statusCouponDto.pointSearch);
          if (!isNaN(pointValue)) {
            condition['points'] = pointValue;
          }
        }

        if (statusCouponDto.partNumberSearch) {
          condition['productInfo'] = { $regex: statusCouponDto.partNumberSearch.toString(), $options: 'i' };
        }


        if (statusCouponDto.descriptionSearch) {
          condition['description'] = { $regex: statusCouponDto.descriptionSearch.toString(), $options: 'i' };
        }

        if (statusCouponDto.numberSearch) {
          condition['GgNumber'] = { $regex: statusCouponDto.numberSearch.toString(), $options: 'i' };
        }


        const pipeline = [
          {
            $match: {
              customerType: {
                $in: Array.isArray(findCustomer[0].customerType) ? findCustomer[0].customerType : [findCustomer[0].customerType],
              },
            },
          },
          {
            $project: {
              schemeDetail: 1,
              _id: 1,
              schemeName: 1,
            },
          },
          {
            $unwind: {
              path: "$schemeDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$schemeDetail.products",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $lookup: {
              from: "products",
              localField: "schemeDetail.products",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, productNo: 1, name: 1, categoryid: 1, description: 1, partNo: { $ifNull: [{ $first: "$productDetail.partNo" }, ""] } } },
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
              pipeline: [
                { $project: { _id: 1, categoryName: 1 } }
              ],
              as: "categoryInfo",
            },
          },
          {
            $project: {
              product: "$productInfo.name",
              description: "$productInfo.description",
              productid: "$productInfo._id",
              partNo: "$productInfo.partNo",
              points: { $toDouble: "$schemeDetail.points" },
              GgNumber: "$productInfo.productNo",
              pointType: "$schemeName",
              categoryName: { $ifNull: [{ $first: "$categoryInfo.categoryName" }, ""] },
            },
          },
        ];

        if (Object.keys(condition).length > 0) {
          pipeline.push({
            $match: condition,
          });
        }



        const results = await this.schemeModel.aggregate(pipeline).exec();

        resolve(results.length > 0 ? results : []);
      } catch (e) {
        reject(new InternalServerErrorException('Error while getting transaction details: ' + e.message));
      }
    });
  }

  async updateCouponStatus(req: Request, statusCouponDto: StatusCouponDtos): Promise<any> {
    try {
      const findInvalidCoupon = await this.invalidCouponModel.findOne({ _id: ObjectId(statusCouponDto.invalidCouponid) })
      const authInfo = await getCustomerAuthInfo(req.headers)
      if (!findInvalidCoupon) {
        throw new BadRequestException("Coupon not exist")
      } else {
        const findCustomer = await this.customerModel.findOne({ _id: ObjectId(findInvalidCoupon.customerid) });
        if (!findCustomer) {
          throw new BadRequestException("Customer not exist")
        } else {

          if (statusCouponDto.statusType == "Approved") {

            const findTransaction = await this.transactionModel.aggregate([
              { $match: { coupon: { $regex: new RegExp(`^${statusCouponDto.couponCode}$`, 'i') } } },
              {
                $lookup: {
                  from: "customers",
                  localField: "customerid",
                  foreignField: "_id",
                  pipeline: [
                    { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
                  ],
                  as: "customerInfo",
                },
              },
              { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
              {
                $project: {
                  firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                  mobile: { $ifNull: ["$customerInfo.mobile", ""] },
                  createdAt: { $ifNull: ["$createdAt", ""] },
                }
              }
            ]);
            if (findTransaction.length > 0) {
              throw new BadRequestException(`Coupon already scan by ${findTransaction[0].firmName},${findTransaction[0].mobile},${findTransaction[0].createdAt}`)
            } else {

              var refno = await this.getNewRefNoTransaction()
              refno = refno + 1;
              const transactionObj = new this.transactionModel({
                coupon: statusCouponDto.couponCode,
                productid: statusCouponDto.productid ? statusCouponDto.productid : "",
                customerid: statusCouponDto.customerid ? statusCouponDto.customerid : findCustomer._id,
                schemeid: statusCouponDto.schemeid,
                points: statusCouponDto.points,
                transactionType: "Cr",
                refno: refno,
                pointType: statusCouponDto.pointType,
                modifyByid: authInfo._id,
                createdBy: authInfo._id,
                createdAt: new Date(),
                customerType: findCustomer.customerType
              })

              if (transactionObj.save()) {

                await this.invalidCouponModel.findByIdAndUpdate({ _id: statusCouponDto.invalidCouponid }, { createdAt: new Date(), statusType: statusCouponDto.statusType, remark: statusCouponDto.remark, modifyByid: authInfo._id })
                return { ...transactionObj, isError: false, message: `${statusCouponDto.points} points received successfully ` }
              }
            }


          } else if (statusCouponDto.statusType == "Rejected") {
            await this.invalidCouponModel.findByIdAndUpdate({ _id: statusCouponDto.invalidCouponid }, { statusType: statusCouponDto.statusType, remark: statusCouponDto.remark, modifyByid: authInfo._id })
            return { isError: false, message: `Rejected successfully` }

          } else if (statusCouponDto.statusType == "Hold") {
            await this.invalidCouponModel.findByIdAndUpdate({ _id: statusCouponDto.invalidCouponid }, { statusType: statusCouponDto.statusType, remark: statusCouponDto.remark, modifyByid: authInfo._id })
            return { isError: false, message: `Hold successfully` }

          }
        }
      }
    }
    catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }


      throw new InternalServerErrorException(e.message);
    }

  };

  async getAllCustomerInvalidCoupon(customerIdDTO: CustomerIdDTO): Promise<any> {
    try {

      const startDate1 = customerIdDTO.startDate ? new Date(`${customerIdDTO.startDate}T00:00:00.000Z`) : null;
      const endDate1 = customerIdDTO.endDate ? new Date(`${customerIdDTO.endDate}T23:59:59.999Z`) : null;

      const query: { createdAt1?: { $gte?: Date; $lte?: Date } } = {};


      if (startDate1 && !isNaN(startDate1.getTime())) {
        query.createdAt1 = query.createdAt1 || {};
        query.createdAt1.$gte = startDate1;
      }

      if (endDate1 && !isNaN(endDate1.getTime())) {
        query.createdAt1 = query.createdAt1 || {};
        query.createdAt1.$lte = endDate1;
      }

      const data = await Promise.all(
        await this.invalidCouponModel.aggregate([
          {
            $match:
            {
              customerid: ObjectId(customerIdDTO.customerid),
              statusType: { $ne: "Approved" },
            }
          },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
              ],
              as: "customerInfo",
            },
          },
          {
            $lookup: {
              from: "customers",
              localField: "modifyByid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
              ],
              as: "modifyUserInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          { $unwind: { "path": "$modifyUserInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              _id: 1,
              createdAt: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              createdAt1: { $ifNull: ["$createdAt", ""] },
              customerid: { $ifNull: [{ $toString: "$customerid" }, ""] },
              modifyByid: { $ifNull: [{ $toString: "$modifyByid" }, ""] },
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              modifyFirmName: { $ifNull: ["$modifyUserInfo.firmName", ""] },
              contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
              modifyContactPerson: { $ifNull: ["$modifyUserInfo.contactPerson", ""] },
              mobile: { $ifNull: ["$customerInfo.mobile", 0] },
              couponCode: { $ifNull: ["$couponCode", ""] },
              couponGg: { $ifNull: ["$couponGg", ""] },
              statusType: { $ifNull: ["$statusType", "Pending"] },
              active: { $ifNull: ["$active", true] },
              couponImage: { $ifNull: ["$couponImage", []] },
              remark: { $ifNull: ["$remark", ""] },
            },
          },
          {
            $match: { $and: [query] }
          },
          { $sort: { createdAt1: -1 } },

        ]).exec()
      );

      return data;
    } catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e);
    }
  };

  async couponScansByAdmin(req: Request, addInvalidCouponDTO: AddInvalidCouponDTO): Promise<any> {
    try {

      const authInfo = await getCustomerAuthInfo(req.headers)
      const findCustomer = await this.customerModel.findOne({ _id: ObjectId(addInvalidCouponDTO.customerid) });
      if (!findCustomer) {
        throw new BadRequestException("Customer not exist")
      } else {

        if (addInvalidCouponDTO.statusType == "Approved") {

          const findTransaction = await this.transactionModel.aggregate([
            { $match: { coupon: { $regex: new RegExp(`^${addInvalidCouponDTO.couponCode}$`, 'i') } } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1 } }
                ],
                as: "customerInfo",
              },
            },
            { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                mobile: { $ifNull: ["$customerInfo.mobile", ""] },
                createdAt: { $ifNull: ["$createdAt", ""] },
              }
            }
          ]);
          if (findTransaction.length > 0) {
            throw new BadRequestException(`Coupon already scan by ${findTransaction[0].firmName},${findTransaction[0].mobile},${findTransaction[0].createdAt}`)
          } else {

            var refno = await this.getNewRefNoTransaction()
            refno = refno + 1;

            const findProduct = await this.productModel.findOne({ productNo: addInvalidCouponDTO.couponGg });

            if (!findProduct) {
              throw new BadRequestException(`Product not exist`)
            }
            let condition: any = {};

            const pipeline = [
              {
                $match: {
                  customerType: {
                    $in: Array.isArray(findCustomer.customerType) ? findCustomer.customerType : [findCustomer.customerType],
                  },
                },
              },
              {
                $project: {
                  schemeDetail: 1,
                  _id: 1,
                  schemeName: 1,
                },
              },
              {
                $unwind: {
                  path: "$schemeDetail",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $unwind: {
                  path: "$schemeDetail.products",
                  preserveNullAndEmptyArrays: true,
                },
              },

              {
                $lookup: {
                  from: "products",
                  localField: "schemeDetail.products",
                  foreignField: "_id",
                  pipeline: [
                    { $project: { _id: 1, productNo: 1, name: 1, categoryid: 1, description: 1, partNo: { $ifNull: [{ $first: "$productDetail.partNo" }, ""] } } },
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
                  pipeline: [
                    { $project: { _id: 1, categoryName: 1 } }
                  ],
                  as: "categoryInfo",
                },
              },
              { $match: { "productInfo._id": findProduct._id } },
              {
                $project: {
                  product: "$productInfo.name",
                  description: "$productInfo.description",
                  productid: "$productInfo._id",
                  partNo: "$productInfo.partNo",
                  points: { $toDouble: "$schemeDetail.points" },
                  GgNumber: "$productInfo.productNo",
                  pointType: "$schemeName",
                  categoryName: { $ifNull: [{ $first: "$categoryInfo.categoryName" }, ""] },
                },
              },
            ];

            if (Object.keys(condition).length > 0) {
              pipeline.push({
                $match: condition,
              });
            }

            const results = await this.schemeModel.aggregate(pipeline).exec();
            if (results.length == 0) {
              throw new BadRequestException(`Product not exist`)
            }

            const transactionObj = new this.transactionModel({
              coupon: addInvalidCouponDTO.couponCode,
              productid: findProduct._id ? findProduct._id : "",
              customerid: addInvalidCouponDTO.customerid ? addInvalidCouponDTO.customerid : findCustomer,
              schemeid: results[0].__dirname,
              points: results[0].points,
              transactionType: "Cr",
              refno: refno,
              pointType: results[0].pointType,
              modifyByid: authInfo._id,
              createdBy: authInfo._id,
              createdAt: new Date(),
              customerType: findCustomer.customerType
            })

            if (transactionObj.save()) {

              return { isError: false, message: `${findProduct.points} points received successfully ` }
            }
          }


        }
      }

    }
    catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }


      throw new InternalServerErrorException(e.message);
    }

  };



  // async test(): Promise<any> {


  //   // console.log(updateData,56456)
  //   //   try {
  //   //     let filePath = path.join(__dirname, "..", "..", "RETAIELR LOYLATY.json");
  //   //     const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  //   //     let jsonData = '';

  //   //     readStream.on('data', (chunk) => {
  //   //       jsonData += chunk;
  //   //     });
  //   //     readStream.on('end', async () => {
  //   //       try {
  //   //         const parsedData = JSON.parse(jsonData);

  //   // if(parsedData.length > 0){
  //   //   parsedData.forEach((ele)=>{
  //   //     console.log(parsedData,45435)

  //   //   })
  //   // }

  //   // //         for (const element of parsedData) {
  //   // //           // for (const element of parsedData.slice().reverse()) {


  //   // //         }

  //   //         // if (parsedData.length > 0) {
  //   //         //   for (const ele of parsedData) {

  //   //         //   // console.log(ele.customerType,342342,ele.coupon)

  //   //         //   let data = await this.couponModel.find({coupon:ele.coupon})
  //   //         //   if(!data){
  //   //         //    arr.push(ele.coupon)
  //   //         //   }



  //   //         //   }
  //   //         // }
  //   //         return true;
  //   //       } catch (parseError) {
  //   //         console.error('Error parsing JSON:', parseError);
  //   //       }
  //   //     });

  //   //     readStream.on('error', (err) => {
  //   //       console.error('Error reading the file:', err);
  //   //     });

  //   //   } catch (error) {
  //   //     console.error('Error in the test function:', error);
  //   //   }


  //   // const imagePath = path.join(__dirname,"..","..","uploaded","transactions", 'transactions_10142024050014_285567319.jpg'); 
  //   // console.log(imagePath,324234)
  //   // await removeImageFromFolder(imagePath)
  //   // let arr = []

  //   // const couponInfo = await this.couponProfileModel.find();
  //   // couponInfo.forEach(async(ele)=>{

  // }

  async test() {
    // try {
    //     const startOfToday = new Date();
    //     startOfToday.setHours(0, 0, 0, 0); 

    //     const findInvalidCoupon= await this.invalidCouponModel.find({statusType:"Approved", createdAt: { $lt: startOfToday } });

    //     if(findInvalidCoupon.length > 0){
    //         findInvalidCoupon.forEach(async(ele)=>{
    //             if(ele.couponImage.length > 0){

    //                 ele.couponImage.forEach(async(image)=>{
    //                     console.log(image,546546)

    //              await removeImageFromFolder(image);
    //              // await (0, helper_service_1.removeImageFromFolder)("../uploaded/transactions/transactions_10142024105555_600664316.jpg");
    //                 })

    //             }
    //         })
    //     }
    // }
    // catch (error) {
    // }

    // images upload 
    try {

      const paths = path.join(__dirname, '..', "..", "gajragear-backend", 'uploaded', 'schemes');
      console.log('Folder Path:', paths);


      await uploadFolderToS3(paths, process.env.BUCKET_NAME, 'uploaded/transactions');
    } catch (error) {
      console.error('Error calling uploadFolderToS3:', error);
    }
    //       const startTime = new Date('2024-11-16T16:09:59Z'); // Start time
    //       const endTime = new Date('2024-11-16T16:14:59Z');   // End time

    // // cron start krna hai or env ka data remove krna hai
    // listImagesByTimeWithVersions('uploaded/auth/', startTime, endTime)
    //     .then(filteredFiles => console.log(filteredFiles.length,'Filtered Files:', filteredFiles))
    //     .catch(err => console.error(err));
  };



};



