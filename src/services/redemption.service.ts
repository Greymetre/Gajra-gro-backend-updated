import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Redemption, RedemptionDocument } from '../entities/redemption.entity';
import { Transaction, TransactionDocument } from '../entities/transaction.entity';
import { SettingProject, SettingProjectDocument } from '../entities/setting.project.entity';
import { Customer, CustomerDocument } from '../entities/customer.entity';
import { GetRedemptionInfoDto, GetAllRedemptionDto } from '../user/redemptions/dto/response-redemption.dto';
import { Request } from 'express';
import { ApprovedRedemptionDto, CreateGiftRedemptionDto, CreateNeftRedemptionDto, CreateRedemptionDto, CreateUpiRedemptionDto, CreateWalletRedemptionDto, FilterPaginationRedemptionsDto, GetRedemptionDto, RejectRedemptionDto, StatusRedemptionDto, StatussRedemptionDto, TransferRedemptionDto, UpdateRedemptionDto } from 'src/dto/redemption-dto';
import { getAuthUserInfo, getCustomerAuthInfo } from 'src/common/utils/jwt.helper';
import { RemoveFilesHelper, PushNotification } from "src/common/utils/helper.service";
import { PaginationRequestDto } from 'src/dto/pagination-dto';
import { async } from 'rxjs';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
const ObjectId = require('mongoose').Types.ObjectId;
import { Payouts } from '@cashfreepayments/cashfree-sdk';
import axios from 'axios';
@Injectable()
export class RedemptionService {
  // initialize cashfree sdk
  private payoutsInstance: Payouts;
  constructor(
    // @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(SettingProject.name) private settingModel: Model<SettingProjectDocument>) {
    this.payoutsInstance = new Payouts({
      env: 'PRODUCTION',
      clientId: process.env.CASHFREE_CLIENT_ID, // Replace with your Client ID
      clientSecret: process.env.CASHFREE_CLIENT_SECRET, // Replace with your Client Secret
      // Optional: For dynamic IPs, provide path to public key or publicKey string
      // pathToPublicKey: '/path/to/your/public/key/file.pem',
      // publicKey: '<YOUR_PUBLIC_KEY>',
    });
  }

  public async getDate(): Promise<any> {

    let currentDate = new Date();
    let startYear;
    let endYear;
    if (currentDate.getMonth() <= 2) {
      startYear = (currentDate.getFullYear()) - 1
      endYear = currentDate.getFullYear()
    } else {
      startYear = currentDate.getFullYear()
      endYear = currentDate.getFullYear() + 1
    }

    const startDate = new Date(`${startYear}-04-01`);
    const endDate = new Date(`${endYear}-03-31`);
    return {
      "startDate": startDate.toISOString(),
      "endDate": endDate.toISOString(),
    }
  };

  async getRedemptionSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            startedAt: { $ifNull: ["$redemption.startedAt", ''] },
            endedAt: { $ifNull: ["$redemption.endedAt", ''] },
            every_threshold: { $ifNull: ["$redemption.every_threshold", false] },
            first_threshold: { $ifNull: ["$redemption.first_threshold", false] },
            threshold: { $ifNull: ["$redemption.threshold", 0] },
            milestone_points: { $ifNull: ["$redemption.milestone_points", false] },
            automated: { $ifNull: ["$redemption.automated", false] },
            approval: { $ifNull: ["$redemption.approval", false] },
            point_value: { $ifNull: ["$points.point_value", 1] },
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
        'error while getting images' + e,
      );
    }
  };

  public async redemptionViaNeft(neftRedemptionDto: CreateNeftRedemptionDto): Promise<any> {
    const setting = await this.getRedemptionSetting()
    const points = await this.getCustomerBalancePoint(neftRedemptionDto.customerid)
    neftRedemptionDto.points = neftRedemptionDto.payment.amount * setting.point_value
    if (setting.first_threshold && points.redeempoint === 0 && points.balance < setting.threshold) {
      throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
    }
    else if (setting.every_threshold && points.balance < setting.threshold) {
      throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
    }
    else if (points.balance >= neftRedemptionDto.points) {
      const refno = await this.getNewRefNoRedemption()
      const customer = await this.customerModel.findOne({ _id: neftRedemptionDto.customerid })
      const transaction = await this.transactionModel.create({ customerType: customer.customerType, customerid: neftRedemptionDto.customerid, points: neftRedemptionDto.points, pointType: "Redemption", transactionType: "Dr" });
      neftRedemptionDto.transactionid = transaction._id
      console.log("neftRedemptionDto", neftRedemptionDto);

      var redemption = new this.redemptionModel({ ...neftRedemptionDto, refno: refno, status: neftRedemptionDto.points > 3000 || neftRedemptionDto.isAdmin ? 'Pending' : 'UNDER PROCESS', type: 'IMPS', createdAt: new Date() })

      if (neftRedemptionDto.points <= 3000 && !neftRedemptionDto.isAdmin) {

        if (customer?.benifresiry?.bankAccountBeneficiaryId) {
          const transferData = {
            beneficiary_details: { beneficiary_id: customer.benifresiry.bankAccountBeneficiaryId },
            transfer_amount: neftRedemptionDto.points,
            transfer_id: redemption._id,
          }
          let findRedemption = await this.redemptionModel.aggregate([
            { $match: { customerid: ObjectId(neftRedemptionDto.customerid) } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
                ],
                as: "customerInfo",
              },
            },
            { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              }
            }
          ])
          try {
            await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");
          } catch (error) {
            console.log(error)
          }
          try {
            const response = await axios.post(
              "https://api.cashfree.com/payout/transfers",
              transferData,
              {
                headers: {
                  // Authorization: `Bearer ${token}`,
                  "x-client-id": process.env.CASHFREE_CLIENT_ID,
                  "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                  "X-Api-Version": "2024-01-01",
                  "Content-Type": "application/json"
                },
              }
            );
            console.log(response.data);
          } catch (error) {
            console.error("Error initiating transfer:", error);
          }
        }
        else {
          // add beneficiary
          let beneficiaryData = {
            beneId: "AccountId" + neftRedemptionDto.customerid,
            name: neftRedemptionDto.payment.holderName,
            phone: customer.mobile,
            bankAccount: neftRedemptionDto.payment.accountNo,
            ifsc: neftRedemptionDto.payment.ifsc,
            email: "user@example.com",
            address1: "Default Address"
          }
          let isRejected=false;
          const token = await this.getCashfreeAuthToken();
          // if (!token) throw new Error("Failed to get authentication token from Cashfree");
          const response = await this.addBeneficiary(token, beneficiaryData);
          console.log("NEFT Beneficiary Response:", response);
          if (response.status === "SUCCESS") {
            console.log("Update user data with beneficiary id");

            await this.customerModel.findByIdAndUpdate(neftRedemptionDto.customerid, { $set: { "benifresiry.bankAccountBeneficiaryId": "AccountId" + neftRedemptionDto.customerid } })
            const transferData = {
              beneficiary_details: { beneficiary_id: "AccountId" + neftRedemptionDto.customerid },
              transfer_amount: neftRedemptionDto.points,
              transfer_id: redemption._id,
            }
            try {
              const response = await axios.post(
                "https://api.cashfree.com/payout/transfers",
                transferData,
                {
                  headers: {
                    // Authorization: `Bearer ${token}`,
                    "x-client-id": process.env.CASHFREE_CLIENT_ID,
                    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                    "X-Api-Version": "2024-01-01",
                    "Content-Type": "application/json"
                  },
                }
              );
              console.log(response.data);
            } catch (error) {
              console.error("Error initiating transfer:", error);
            }
          }
          else {
            await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(redemption._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
            throw new BadRequestException(response.message);
          }
          // transfer money accrding to points

          let findRedemption = await this.redemptionModel.aggregate([
            { $match: { customerid: ObjectId(neftRedemptionDto.customerid) } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
                ],
                as: "customerInfo",
              },
            },
            { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              }
            }
          ])
          try {
            await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");
          } catch (error) {
            console.log(error)
          }
        }
      }

      redemption.save(async (err, doc) => {
        if (err) {
          await this.redemptionModel.findByIdAndDelete(transaction._id)
          throw new BadRequestException(err)
        }
        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { customerid: ObjectId(neftRedemptionDto.customerid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            }
          }

        ])
        if (findRedemption.length > 0 && !neftRedemptionDto.isAdmin) {
          if (findRedemption) {
            await PushNotification(`${findRedemption[0].deviceToken}`, " Redemption Request Sent  💸", `${findRedemption[0].firmName}, your redemption request of ${neftRedemptionDto.points} Points is sent successfully`, "Redeem History");
          }
        }

        return new GetRedemptionInfoDto(doc)
      });
    }
    else {
      throw new BadRequestException('insufficient balance');
    }
  };

  public async redemptionViaUpi(upiRedemptionDto: CreateUpiRedemptionDto): Promise<any> {
    const setting = await this.getRedemptionSetting()
    const points = await this.getCustomerBalancePoint(upiRedemptionDto.customerid)
    upiRedemptionDto.points = upiRedemptionDto.payment.amount * setting.point_value
    if (setting.first_threshold && points.redeempoint === 0 && points.balance < setting.threshold) {
      throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
    }
    else if (setting.every_threshold && points.balance < setting.threshold) {
      throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
    }
    else if (points.balance >= upiRedemptionDto.points) {
      let customer = await this.customerModel.findOne({ _id: upiRedemptionDto.customerid })
      const transaction = await this.transactionModel.create({ customerType: customer.customerType, customerid: upiRedemptionDto.customerid, points: upiRedemptionDto.points, pointType: "Redemption", transactionType: "Dr" });
      upiRedemptionDto.transactionid = transaction._id
      const refno = await this.getNewRefNoRedemption()
      var redemption = new this.redemptionModel({ ...upiRedemptionDto, status: upiRedemptionDto.points > 3000 || upiRedemptionDto.isAdmin ? 'Pending' : 'UNDER PROCESS', type: 'UPI', refno: refno, createdAt: new Date() })
      if (upiRedemptionDto.points <= 3000 && !upiRedemptionDto.isAdmin) {
        if (customer?.benifresiry?.upiBeneficiaryId) {
          const transferData = {
            beneficiary_details: { beneficiary_id: customer.benifresiry.upiBeneficiaryId },
            transfer_amount: upiRedemptionDto.points,
            transfer_id: redemption._id,
            transfer_mode: "upi",
          }
          console.log("transferData", `TR-${redemption._id}`);
          let findRedemption = await this.redemptionModel.aggregate([
            { $match: { customerid: ObjectId(upiRedemptionDto.customerid) } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
                ],
                as: "customerInfo",
              },
            },
            { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              }
            }
          ])
          try {
            await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");

          } catch (error) {
            console.log(error);

          }
          try {
            const response = await axios.post(
              "https://api.cashfree.com/payout/transfers",
              transferData,
              {
                headers: {
                  // Authorization: `Bearer ${token}`,
                  "x-client-id": process.env.CASHFREE_CLIENT_ID,
                  "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                  "X-Api-Version": "2024-01-01",
                  "Content-Type": "application/json"
                },
              }
            );
            console.log(response.data);
          } catch (error) {
            console.error("Error initiating transfer:", error);
          }
        }
        else {
          let beneficiaryData = {
            beneId: "UPI_Id" + upiRedemptionDto.customerid,
            name: upiRedemptionDto.payment.upiHolderName ? upiRedemptionDto.payment.upiHolderName : customer.firmName ? customer.firmName : 'default name',
            phone: customer.mobile,
            vpa: upiRedemptionDto.payment.upiNumber,
            email: "user@example.com",
            address1: "Default Address"
          }
          const token = await this.getCashfreeAuthToken();
          if (!token) throw new Error("Failed to get authentication token from Cashfree");
          const response = await this.addBeneficiary(token, beneficiaryData);
          console.log("NEFT Beneficiary Response:", response);
          if (response.status === "SUCCESS") {
            console.log("Update user data with beneficiary id");

            await this.customerModel.findByIdAndUpdate(upiRedemptionDto.customerid, { $set: { "benifresiry.upiBeneficiaryId": "UPI_Id" + upiRedemptionDto.customerid } })
            const transferData = {
              beneficiary_details: { beneficiary_id: "UPI_Id" + upiRedemptionDto.customerid },
              transfer_amount: upiRedemptionDto.points,
              transfer_id: redemption._id,
              transfer_mode: "upi",
            }

            try {
              const response = await axios.post(
                "https://api.cashfree.com/payout/transfers",
                transferData,
                {
                  headers: {
                    // Authorization: `Bearer ${token}`,
                    "x-client-id": process.env.CASHFREE_CLIENT_ID,
                    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                    "X-Api-Version": "2024-01-01",
                    "Content-Type": "application/json"
                  },
                }
              );
              console.log(response.data);
            } catch (error) {
              console.error("Error initiating transfer:", error);
            }
          }
          else {
            await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(redemption._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
            throw new BadRequestException(response.message);
          }
          // transfer money accrding to points

          let findRedemption = await this.redemptionModel.aggregate([
            { $match: { customerid: ObjectId(upiRedemptionDto.customerid) } },
            {
              $lookup: {
                from: "customers",
                localField: "customerid",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
                ],
                as: "customerInfo",
              },
            },
            { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
            {
              $project: {
                firmName: { $ifNull: ["$customerInfo.firmName", ""] },
                deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              }
            }
          ])
          try {
            await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");
          } catch (error) {
            console.log(error);

          }
        }
      }
      redemption.save(async (err, doc) => {
        if (err) {
          await this.redemptionModel.findByIdAndDelete(transaction._id)
          throw new BadRequestException(err)
        }
        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { customerid: ObjectId(upiRedemptionDto.customerid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            }
          }

        ])
        if (findRedemption.length > 0 && upiRedemptionDto.points >= 3000 && !upiRedemptionDto.isAdmin) {
          if (findRedemption) {

            await PushNotification(`${findRedemption[0].deviceToken}`, " Redemption Request Sent  💸", `${findRedemption[0].firmName}, your redemption request of ${upiRedemptionDto.points} Points is sent successfully`, "Redeem History");

          }
        }
        return new GetRedemptionInfoDto(doc)
      });
    }
    else {
      console.log("call");

      throw new BadRequestException('insufficient balance');
    }
  };

  public async createRedemption(createRedemptionDto: CreateGiftRedemptionDto, req: Request) {

    const authInfo = await getAuthUserInfo(req.headers)
    const refno = await this.getNewRefNoRedemption()
    const redemption = new this.redemptionModel({ ...createRedemptionDto, createdBy: authInfo._id, refno: refno });
    if (redemption.save()) {
      return new GetRedemptionInfoDto(redemption)
    }
    throw new BadRequestException('Error in Create Redemption');
  };

  async getAllRedemption(paginationDto: FilterPaginationRedemptionsDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 100

      const startDate1 = paginationDto.startDate ? new Date(`${paginationDto.startDate}T00:00:00.000Z`) : null;
      const endDate1 = paginationDto.endDate ? new Date(`${paginationDto.endDate}T23:59:59.999Z`) : null;
      const query: { createdAt?: { $gte?: Date; $lte?: Date } } = {};

      if (startDate1 && !isNaN(startDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$gte = startDate1;
      }

      if (endDate1 && !isNaN(endDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = endDate1;
      }

      let customerTypeCond = {};

      if (paginationDto.customerType.length === 1) {
        const customerType = paginationDto.customerType[0];
        if (customerType === "Mechanic" || customerType === "Retailer") {
          customerTypeCond = { customerType };
        }
      }

      const data = await this.redemptionModel.aggregate([
        {
          $match: {
            $and: [
              query,
              paginationDto.type.length ? { type: { $in: paginationDto.type } } : {},
              paginationDto.status.length ? { status: { $in: paginationDto.status } } : {}
            ],
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1, kycInfo: 1, customerType: 1 } },
              {
                $match: customerTypeCond
              },
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "giftcatalogues",
            localField: "giftid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, giftName: 1, giftType: 1 } }
            ],
            as: "giftcatalogueInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$giftcatalogueInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
            customerType: { $ifNull: ["$customerInfo.customerType", ""] },
            mobile: { $ifNull: ["$customerInfo.mobile", 0] },
            state: { $ifNull: ["$customerInfo.address.state", ""] },
            city: { $ifNull: ["$customerInfo.address.city", ""] },
            refno: { $ifNull: ["$refno", 0] },
            type: { $ifNull: ["$type", ""] },
            points: { $ifNull: ["$points", 0] },
            status: { $ifNull: ["$status", ""] },
            paymentDate: { $ifNull: ["$payment.paymentDate", ""] },
            UTR_No: { $ifNull: ["$payment.transactionID", ""] },
            holderName: { $ifNull: ["$payment.holderName", ""] },
            fundSource: { $ifNull: ["$payment.fundSource", ""] },
            accountNo: { $ifNull: ["$payment.accountNo", ""] },
            // accountNo: {$toString: {$ifNull: ["$payment.accountNo", ""] }},
            bankName: { $ifNull: ["$payment.bankName", ""] },
            ifsc: { $ifNull: ["$payment.ifsc", ""] },
            upiNumber: { $ifNull: ["$payment.upiNumber", ""] },
            aadharNo: { $ifNull: ["$customerInfo.kycInfo.aadharNo", ""] },
            panNo: { $ifNull: ["$customerInfo.kycInfo.panNo", ""] },
            createdAt: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            tds: { $ifNull: [" ", 0] },
            tdsPay: { $ifNull: ["", 0] },
            dateFilter : {$ifNull: ["$createdAt", 0]}
          }
        },
        {
          $match: customerTypeCond
        },
        {
          $match: {
            $or: [
              { firmName: { $regex: paginationDto.search, '$options': 'i' } },
              { contactPerson: { $regex: paginationDto.search, '$options': 'i' } },
              { mobile: { $regex: paginationDto.search, '$options': 'i' } },
            ],
          },
        },
        { $sort: { dateFilter: -1 } },
        {
          $facet: {
            paginate: [
              { $count: "totalDocs" },
              { $addFields: { recordPerPage: recordPerPage, currentPage: currentPage } }
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
        'error while getting redemption details' + e,
      );
    }
  };

  async getRedemptionInfo(id: string): Promise<any> {
    try {
      const data = await this.redemptionModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $lookup: {
            from: "customers",  
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1 } }
            ],
            as: "customerInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "approval.approvedBy",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "approverInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "rejected.rejectedBy",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "rejectedUserInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "payment.paidBy",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1 } }
            ],
            as: "transferUserInfo",
          },
        },
        {
          $lookup: {
            from: "giftcatalogues",
            localField: "giftid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, giftName: 1, giftType: 1 } }
            ],
            as: "giftcatalogueInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$giftcatalogueInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$approverInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$rejectedUserInfo", "preserveNullAndEmptyArrays": true } },
        { $unwind: { "path": "$transferUserInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            customerid: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerDetail.fullName", "$customerInfo.contactPerson"] },
            mobile: { $ifNull: ["$customerDetail.mobile", "$customerInfo.mobile"] },
            address: { $ifNull: ["$customerDetail.address", ""] },
            points: { $ifNull: ["$points", 0] },
            refno: { $ifNull: ["$refno", 0] },
            approvedAt: { $ifNull: ["$approval.approvedAt", ""] },
            approverName: { $concat: ["$approverInfo.firstName", " ", "$approverInfo.lastName"] },
            rejectedAt: { $ifNull: ["$rejected.rejectedAt", ""] },
            rejectedName: { $concat: ["$rejectedUserInfo.firstName", " ", "$rejectedUserInfo.lastName"] },
            reason: { $ifNull: ["$rejected.reason", ""] },
            paymentDate: { $ifNull: ["$payment.paymentDate", ""] },
            transferName: { $concat: ["$transferUserInfo.firstName", " ", "$transferUserInfo.lastName"] },
            method: { $ifNull: ["$payment.method", ""] },
            upiNumber: { $ifNull: ["$payment.upiNumber", ""] },
            accountNo: { $ifNull: ["$payment.accountNo", ""] },
            holderName: { $ifNull: ["$payment.holderName", ""] },
            bankName: { $ifNull: ["$payment.bankName", ""] },
            ifsc: { $ifNull: ["$payment.ifsc", ""] },
            amount: { $ifNull: ["$payment.amount", 0] },
            transactionID: { $ifNull: ["$payment.transactionID", ""] },
            details: { $ifNull: ["$payment.details", ""] },
            fundSource: { $ifNull: ["$payment.fundSource", ""] },
            status: { $ifNull: ["$status", ""] },
            type: { $ifNull: ["$type", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetRedemptionInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting redemption details' + e,
      );
    }
  };

  async deleteRedemption(id: string): Promise<Redemption> {
    try {
      return await this.redemptionModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting redemption details' + e,);
    }
  };

  async updateRedemptionStatus(id: string, statussRedemptionDto: StatussRedemptionDto): Promise<Redemption> {
    try {
      let isRejected = false;
      const findRedemption = await this.redemptionModel.aggregate([
        { $match: { _id: ObjectId(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, deviceInfo: 1, mobile: 1, benifresiry: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            type: { $ifNull: ["$type", ""] },
            payment: { $ifNull: ["$payment", ""] },
            mobile: { $ifNull: ["$customerInfo.mobile", ""] },
            benifresiry: { $ifNull: ["$customerInfo.benifresiry", ""] },
            customerid: { $ifNull: ["$customerInfo._id", ""] },
            points: { $ifNull: ["$points", 0] },
          }
        }

      ])
      if (findRedemption.length > 0) {
        if (findRedemption) {
          try {
            if (statussRedemptionDto.status == "Rejected") {
              await PushNotification(`${findRedemption[0].deviceToken}`, " Redemption is Rejected  🚫", `${findRedemption[0].firmName}, your redemption is rejected`, "Redeem History");
            } else if (statussRedemptionDto.status == "Approved") {
              // get custommer data friom settings

              if (findRedemption[0].type == "Neft" || findRedemption[0].type == "IMPS") {
                // call addBeneficiary method
                let beneficiaryData = {
                  beneId: "AccountId" + findRedemption[0].customerid,
                  name: findRedemption[0].payment.holderName,
                  phone: findRedemption[0].mobile,
                  bankAccount: findRedemption[0].payment.accountNo,
                  ifsc: findRedemption[0].payment.ifsc,
                  email: "user@example.com",
                  address1: "Default Address"
                };
                const token = await this.getCashfreeAuthToken();
                console.log(token);

                if (!token) throw new Error("Failed to get authentication token from Cashfree");
                if (!findRedemption[0]?.beneficiary?.bankAccountBeneficiaryId) {
                  const response = await this.addBeneficiary(token, beneficiaryData);
                  // udpate customer benifresiry id
                  console.log("NEFT Beneficiary Response:", response);
                  if (response.status == "SUCCESS") {
                    await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.bankAccountBeneficiaryId": "AccountId" + findRedemption[0].customerid } })
                  }
                  else {
                    await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(findRedemption[0]._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
                    isRejected = true;
                    throw new BadRequestException(response.message)
                  }
                }
              }
              else if (findRedemption[0].type == "UPI") {
                console.log("Processing UPI Beneficiary...");

                const token = await this.getCashfreeAuthToken();
                if (!token) throw new Error("Failed to get authentication token from Cashfree");

                let beneficiaryData = {
                  beneId: "UPI_Id" + findRedemption[0].customerid,
                  name: findRedemption[0].payment.upiHolderName ? findRedemption[0].payment.upiHolderName : 'default name',
                  phone: findRedemption[0].mobile,
                  vpa: findRedemption[0].payment.upiNumber,
                  email: "user@example.com",
                  address1: "Default Address"
                };

                if (!findRedemption[0]?.beneficiary?.upiBeneficiaryId) {
                  const response = await this.addBeneficiary(token, beneficiaryData);
                  // udpate customer benifresiry id
                  console.log("UPI Beneficiary Response:", response);
                  if (response.status === "SUCCESS") {
                    await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.upiBeneficiaryId": "UPI_Id" + findRedemption[0].customerid } })
                  }
                  else {
                    await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(findRedemption[0]._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
                    isRejected = true;
                    throw new BadRequestException(response.message)
                  }
                }

              }
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Approved ✅", `${findRedemption[0].firmName},  your redemption is approved`, "Redeem History");

            } else if (statussRedemptionDto.status == "Pending") {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Pending", `${findRedemption[0].firmName},  your redemption is Pending`, "Redeem History");

            } else if (statussRedemptionDto.status == "Success") {

              if (findRedemption[0].type == "Neft" || findRedemption[0].type == "IMPS") {
                let beneficiaryData = {
                  beneId: "AccountId" + findRedemption[0].customerid,
                  name: findRedemption[0].payment.holderName,
                  phone: findRedemption[0].mobile,
                  bankAccount: findRedemption[0].payment.accountNo,
                  ifsc: findRedemption[0].payment.ifsc,
                  email: "user@example.com",
                  address1: "Default Address"
                };
                const token = await this.getCashfreeAuthToken();
                console.log(token);

                if (!token) throw new Error("Failed to get authentication token from Cashfree");
                if (!findRedemption[0]?.beneficiary?.bankAccountBeneficiaryId) {
                  const response = await this.addBeneficiary(token, beneficiaryData);
                  // udpate customer benifresiry id
                  console.log("NEFT Beneficiary Response:", response);
                  if (response.status === "SUCCESS") {
                    await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.bankAccountBeneficiaryId": "AccountId" + findRedemption[0].customerid } })
                  }
                  else {
                    await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(findRedemption[0]._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
                    isRejected = true;
                    throw new BadRequestException(response.message)
                  }
                }

                let customerData = await this.customerModel.findById(findRedemption[0].customerid)
                const transferData = {
                  beneficiary_details: { beneficiary_id: customerData.benifresiry.bankAccountBeneficiaryId },
                  transfer_amount: findRedemption[0].payment.amount,
                  transfer_id: findRedemption[0]._id,
                }

                try {
                  const response = await axios.post(
                    "https://api.cashfree.com/payout/transfers",
                    transferData,
                    {
                      headers: {
                        // Authorization: `Bearer ${token}`,
                        "x-client-id": process.env.CASHFREE_CLIENT_ID,
                        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                        "X-Api-Version": "2024-01-01",
                        "Content-Type": "application/json"
                      },
                    }
                  );
                  console.log(response.data);
                } catch (error) {
                  isRejected = true;
                  console.error("Error initiating transfer:", error);
                }


              }
              else if (findRedemption[0].type == "UPI") {
                console.log("Processing UPI Beneficiary...");

                const token = await this.getCashfreeAuthToken();
                if (!token) throw new Error("Failed to get authentication token from Cashfree");

                let beneficiaryData = {
                  beneId: "UPI_Id" + findRedemption[0].customerid,
                  name: findRedemption[0].payment.upiHolderName ? findRedemption[0].payment.upiHolderName : 'default name',
                  phone: findRedemption[0].mobile,
                  vpa: findRedemption[0].payment.upiNumber,
                  email: "user@example.com",
                  address1: "Default Address"
                };
                if (!findRedemption[0]?.beneficiary?.upiBeneficiaryId) {
                  const response = await this.addBeneficiary(token, beneficiaryData);
                  // udpate customer benifresiry id
                  console.log("UPI Beneficiary Response:", response);
                  if (response.status == "SUCCESS") {
                    await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.upiBeneficiaryId": "UPI_Id" + findRedemption[0].customerid, } })
                  }
                  else {
                    await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(findRedemption[0]._id) }, { $set: { status: "Rejected", "payment.details": response.message } })
                    isRejected = true;
                    throw new BadRequestException(response.message)
                  }
                }
                let customerData = await this.customerModel.findById(findRedemption[0].customerid)
                const transferData = {
                  beneficiary_details: { beneficiary_id: customerData.benifresiry.upiBeneficiaryId },
                  transfer_amount: findRedemption[0].payment.amount,
                  transfer_id: findRedemption[0]._id,
                  transfer_mode: "upi",
                }
                try {
                  const response = await axios.post(
                    "https://api.cashfree.com/payout/transfers",
                    transferData,
                    {
                      headers: {
                        // Authorization: `Bearer ${token}`,
                        "x-client-id": process.env.CASHFREE_CLIENT_ID,
                        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                        "X-Api-Version": "2024-01-01",
                        "Content-Type": "application/json"
                      },
                    }
                  );
                  console.log(response.data);
                } catch (error) {
                  isRejected = true;
                  console.error("Error initiating transfer:", error);
                }
              }

              try {
                await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");
              } catch (error) {

              }
            }
          } catch (error) {
            if (isRejected)
              return await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(findRedemption[0]._id) }, { $set: { status: "Rejected" } })
            else
              return await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(id) }, { status: statussRedemptionDto.status == "Success" ? "UNDER PROCESS" : statussRedemptionDto.status }, { new: true, useFindAndModify: false })
          }

        }
      }

      return await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(id) }, { status: statussRedemptionDto.status == "Success" ? "UNDER PROCESS" : statussRedemptionDto.status, statusUpdatedAt: new Date() }, { new: true, useFindAndModify: false })

    }
    catch (e) {
      throw new InternalServerErrorException('error while getting redemption details' + e,);
    }
  };

  async getCashfreeAuthToken(): Promise<string | null> {
    try {
      const response = await axios.post(
        "https://payout-api.cashfree.com/payout/v1/authorize",
        {},
        {
          headers: {
            "x-client-id": process.env.CASHFREE_CLIENT_ID,
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
            "X-Api-Version": "2023-08-01",
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data && response.data.status === "SUCCESS") {
        return response.data.data.token;
      } else {
        console.error("Cashfree Auth Failed:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error getting Cashfree Auth Token:", error);
      return null;
    }
  }


  async updateStatus(statusRedemptionDto: StatusRedemptionDto): Promise<Redemption> {
    try {
      return await this.redemptionModel.findByIdAndUpdate(statusRedemptionDto.redemptionid, { active: statusRedemptionDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting redemption details' + e,);
    }
  };

  async couponScans(statusRedemptionDto: StatusRedemptionDto): Promise<Redemption> {
    try {
      return await this.redemptionModel.findByIdAndUpdate(statusRedemptionDto.redemptionid, { active: statusRedemptionDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting redemption details' + e,);
    }
  };

  public async createUserRedemption(createRedemptionDto: CreateGiftRedemptionDto, req: Request): Promise<any> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const points = await this.getCustomerBalancePoint(authInfo._id)
    if (points.balance >= createRedemptionDto.redeemedpoints) {
      const refno = await this.getNewRefNoRedemption()
      const redemption = new this.redemptionModel({ ...createRedemptionDto, customerid: authInfo._id, refno: refno, type: "Gift", status: "Open" });
      if (redemption.save()) {
        //const transaction = await this.transactionModel.create({ customerid: authInfo._id, points: createRedemptionDto.redeemedpoints, pointType: "Redemption", transactionType: "Dr" });
        //await this.redemptionModel.findByIdAndUpdate(redemption._id, { transactionid: transaction._id }, { new: true, useFindAndModify: false })
        return redemption
      }
    }
    else {
      throw new BadRequestException('insufficient balance');
    }
  };

  async getAllUserRedemption(startDate: string, endDate: string, customerIdDTO: CustomerIdDTO): Promise<any> {
    try {

      const startDate1 = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
      const endDate1 = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

      const query: { createdAt?: { $gte?: Date; $lte?: Date } } = {};

      console.log("API CALL");


      if (startDate1 && !isNaN(startDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$gte = startDate1;
      }

      if (endDate1 && !isNaN(endDate1.getTime())) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = endDate1;
      }

      const data = await this.redemptionModel.aggregate([
        {
          $match:
          {

            customerid: ObjectId(customerIdDTO.customerid),
            $and: [query],
          },
        },

        {
          $lookup: {
            from: "giftcatalogues",
            localField: "giftid",
            foreignField: "_id",
            as: "giftInfo",
          },
        },

        {
          $lookup: {
            from: "transactions",
            localField: "transactionid",
            foreignField: "_id",
            as: "transactionInfo",
          },
        },
        { $unwind: { "path": "$giftInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            giftName: { $ifNull: ["$giftInfo.giftName", ""] },
            quantity: { $ifNull: ["$quantity", 1] },
            points: { $ifNull: ["$points", 0] },
            address: { $ifNull: ["$address", ""] },
            type: { $ifNull: ["$type", ""] },
            status: { $ifNull: ["$status", ""] },
            coupon: { $ifNull: [{ $first: "$transactionInfo.coupon" }, ""] },
            // createdAt: 1
            payment: { $ifNull: ["$payment", ""] },
            approval: { $ifNull: ["$approval", ""] },
            createdAt: 1,
            statusUpdatedAt: { $dateToString: { format: "%Y-%m-%d", date: "$statusUpdatedAt" } },
            refno: {
              $cond: {
                if: { $eq: ["$payment.fundSource", "CASHFREE_78714"] },
                then: "$payment.transactionID",
                else: { $ifNull: ["$refno", 0] }
              }
            },
          },
        },
        // { $sort: { refno: -1 } },
        { $sort: { createdAt: -1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting redemption details' + e,
      );
    }
  };

  async getRedemptionUserInfo(id: string): Promise<Redemption> {
    try {
      const data = await this.redemptionModel.aggregate([
        { $match: { _id: ObjectId(id) } },
        {
          $lookup: {
            from: "giftcatalogues",
            localField: "giftid",
            foreignField: "_id",
            as: "giftInfo",
          },
        },
        { $unwind: { "path": "$giftInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            quantity: { $ifNull: ["$quantity", 1] },
            redeemedpoints: { $ifNull: ["$redeemedpoints", 0] },
            address: { $ifNull: ["$address", ""] },
            type: { $ifNull: ["$type", ""] },
            refno: { $ifNull: ["$refno", 0] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            dispatchDate: { $ifNull: ["$dispatchDate", ""] },
            deliverdDate: { $ifNull: ["$deliverdDate", ""] },
            docketNo: { $ifNull: ["$docketNo", ""] },
            status: { $ifNull: ["$status", ""] },
            tds: { $ifNull: [" ", 0] },
            tdsPay: { $ifNull: ["", 0] },

          },
        },
        { $limit: 1 },
        { $sort: { refno: -1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting redemption details' + e,
      );
    }
  };

  async getCustomerBalancePoint(customerid: any): Promise<any> {
    var result = {}
    // const data = await this.transactionModel.aggregate([
    //   { $match: { customerid: ObjectId(customerid) } },
    //   {
    //     $project: {
    //       _id: 0,
    //       customerid: { $ifNull: ["$customerid", 0] },
    //       creditpoint: { $cond: [{ $eq: ['$transactionType', "Cr"] }, '$points', 0] },
    //       redeempoint: { $cond: [{ $eq: ['$transactionType', "Dr"] }, '$points', 0] }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: "$customerid",
    //       creditpoint: { $sum: '$creditpoint' },
    //       redeempoint: { $sum: '$redeempoint' },
    //     }
    //   },
    //   { $addFields: { "balance": { $subtract: ["$creditpoint", "$redeempoint"] } } },
    //   { $limit: 1 }
    // ]).exec()
    const data = await this.transactionModel.aggregate([
      { $match: { customerid: ObjectId(customerid) } },
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
        $lookup: {
          from: "redemptions",
          let: { customerId: "$customerid" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$customerid", "$$customerId"] },
                    { $ne: ['$status', "Rejected"] },
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
          as: "redeempoint"
        }
      },
      {
        $lookup: {
          from: "redemptions",
          let: { customerId: "$customerid" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$customerid", "$$customerId"] },
                    { $eq: ['$status', "Rejected"] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: "$customerid",
                totalRejectedPoints: { $sum: "$points" }
              }
            }
          ],
          as: "TotalRedeemRejectedpoint"
        }
      },
      {
        $unwind: {
          path: "$redeempoint",
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
        $unwind: {
          path: "$TotalRedeemRejectedpoint",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: { $ifNull: ["$customerid", 0] },
          rejectedpoint: { $ifNull: ["$TotalRedeemRejectedpoint.totalRejectedPoints", 0] },
          creditpoint: { $ifNull: ["$creditPoints.totalCreditPoints", 0] },
          redeempoint: { $ifNull: ["$redeempoint.totalCreditPoints", 0] },
          panVerified: { $ifNull: ["$customerInfo.verified.panVerified", false] },
          aadharVerified: { $ifNull: ["$customerInfo.verified.aadharVerified", false] },
          otherVerified: { $ifNull: ["$customerInfo.verified.otherVerified", false] },
          bankVerified: { $ifNull: ["$customerInfo.verified.bankVerified", false] },
        }
      },
      { $addFields: { "balance": { $subtract: ["$creditpoint", "$redeempoint"] } } },
      { $limit: 1 }
    ]).exec();

    return (Array.isArray(data) && data.length) ? data[0] : { _id: null, creditpoint: 0, redeempoint: 0, balance: 0, rejectedpoint: 0 }
  };

  public async paytmRedemption(walletRedemptionDto: CreateWalletRedemptionDto, req: Request): Promise<any> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const points = await this.getCustomerBalancePoint(authInfo._id)
    if (points.balance >= walletRedemptionDto.redeemedpoints) {
      const refno = await this.getNewRefNoRedemption()
      const redemption = new this.redemptionModel({ ...walletRedemptionDto, customerid: authInfo._id, refno: refno, status: "Open" });
      if (redemption.save()) {
        //const transaction = await this.transactionModel.create({ customerid: authInfo._id, points: walletRedemptionDto.redeemedpoints, pointType: "Redemption", transactionType: "Dr" });
        //await this.redemptionModel.findByIdAndUpdate(redemption._id, { transactionid: transaction._id }, { new: true, useFindAndModify: false })
        return redemption
      }
    }
    else {
      throw new BadRequestException('insufficient balance');
    }
  };

  public async approvedRedemption(approvedRedemptionDto: ApprovedRedemptionDto): Promise<any> {
    const { redemptionid, ...approval } = approvedRedemptionDto;

    return await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(approvedRedemptionDto.redemptionid) },
      { $set: { approval: { ...approval, approvedAt: new Date() }, status: 'Approved' } },
      { new: true, useFindAndModify: false }
    )
      .then(async (redemption) => {
        if (!redemption) throw new BadRequestException("Redemption Not found");

        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { _id: ObjectId(approvedRedemptionDto.redemptionid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, mobile: 1, benifresiry: 1 } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              payment: { $ifNull: ["$payment", ""] },
              type: { $ifNull: ["$type", ""] },
              mobile: { $ifNull: ["$customerInfo.mobile", ""] },
              benifresiry: { $ifNull: ["$customerInfo.benifresiry", ""] },
              customerid: { $ifNull: ["$customerInfo._id", ""] },
            }
          }

        ])
        if (findRedemption.length > 0) {
          if (findRedemption) {
            if (findRedemption[0].type == "Neft" || findRedemption[0].type == "IMPS") {
              // call addBeneficiary method
              let beneficiaryData = {
                beneId: "AccountId" + findRedemption[0].customerid,
                name: findRedemption[0].payment.holderName,
                phone: findRedemption[0].mobile,
                bankAccount: findRedemption[0].payment.accountNo,
                ifsc: findRedemption[0].payment.ifsc,
                email: "user@example.com",
                address1: "Default Address"
              };
              const token = await this.getCashfreeAuthToken();
              console.log(token);

              let customerData = await this.customerModel.findById(findRedemption[0].customerid);
              let bankAccountBeneficiaryId = customerData?.benifresiry?.bankAccountBeneficiaryId;

              if (!token) throw new Error("Failed to get authentication token from Cashfree");
              if (!bankAccountBeneficiaryId) {
                const response = await this.addBeneficiary(token, beneficiaryData);
                // udpate customer benifresiry id
                console.log("NEFT Beneficiary Response:", response);
                if (response.status == "SUCCESS") {
                  await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.bankAccountBeneficiaryId": "AccountId" + findRedemption[0].customerid } })
                }
                else {
                  await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(approvedRedemptionDto.redemptionid) }, { $set: { status: "Rejected", "payment.details": response.message } })
                  throw new BadRequestException(response.message);
                }
              }


            }
            else if (findRedemption[0].type == "UPI") {
              console.log("Processing UPI Beneficiary...");

              const token = await this.getCashfreeAuthToken();
              if (!token) throw new Error("Failed to get authentication token from Cashfree");

              let beneficiaryData = {
                beneId: "UPI_Id" + findRedemption[0].customerid,
                name: findRedemption[0].payment.upiHolderName ? findRedemption[0].payment.upiHolderName : 'default name',
                phone: findRedemption[0].mobile,
                vpa: findRedemption[0].payment.upiNumber,
                email: "user@example.com",
                address1: "Default Address"
              };


              let customerData = await this.customerModel.findById(findRedemption[0].customerid);
              let upiBeneficiaryId = customerData?.benifresiry?.upiBeneficiaryId;
              if (!upiBeneficiaryId) {
                const response = await this.addBeneficiary(token, beneficiaryData);
                // udpate customer benifresiry id
                console.log("UPI Beneficiary Response:", response);
                if (response.status == "SUCCESS") {
                  await this.customerModel.findByIdAndUpdate(findRedemption[0].customerid, { $set: { "benifresiry.upiBeneficiaryId": "UPI_Id" + findRedemption[0].customerid } })
                }
                else {
                  await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(approvedRedemptionDto.redemptionid) }, { $set: { status: "Rejected", "payment.details": response.message } })
                  throw new BadRequestException(response.message);
                }
              }

            }

            try {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Approved ✅", `${findRedemption[0].firmName},  your redemption is approved`, "Redeem History");

            } catch (error) {

            }
          }
        }
        return new GetRedemptionInfoDto(redemption)
      });
  };

  public async rejectedRedemption(rejectedRedemptionDto: RejectRedemptionDto): Promise<any> {
    const { redemptionid, ...rejected } = rejectedRedemptionDto
    return await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(rejectedRedemptionDto.redemptionid) },
      { $set: { rejected: { ...rejected, rejectedAt: new Date() }, status: 'Rejected' } },
      { new: true, useFindAndModify: false }
    )
      .then(async (redemption) => {
        if (!redemption) throw new BadRequestException("Redemption Not found");
        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { _id: ObjectId(rejectedRedemptionDto.redemptionid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            }
          }

        ])
        if (findRedemption.length > 0) {
          if (findRedemption) {

            await PushNotification(`${findRedemption[0].deviceToken}`, " Redemption is Rejected  🚫", `${findRedemption[0].firmName}, your redemption is rejected`, "Redeem History");

          }
        }
        if (redemption.transactionid) {
          await this.transactionModel.findOneAndUpdate({ _id: redemption.transactionid }, { $set: { points: 0 } }, { new: true, upsert: true, setDefaultsOnInsert: false }).lean();
        }
        return new GetRedemptionInfoDto(redemption)
      });
  };
  async addBeneficiary(token: string, beneficiaryData: any): Promise<any> {
    try {
      const response = await axios.post(
        "https://payout-api.cashfree.com/payout/v1/addBeneficiary",
        beneficiaryData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error adding beneficiary:", error.response ? error.response.data : error);
      return null;
    }
  }


  // to initiate a transfer
  public async initiateTransfer(transferDetails) {
    try {
      const response = await this.payoutsInstance.transfer.initiate(transferDetails);
      console.log('Transfer Initiated:', response);
      return response;
    } catch (error) {
      console.error('Error initiating transfer:', error);
      throw error;
    }
  }

  public async transferRedemption(paymentRedemptionDto: TransferRedemptionDto): Promise<any> {

    const { redemptionid, status, ...payment } = paymentRedemptionDto
    return await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(paymentRedemptionDto.redemptionid) },
      { $set: { "payment.paidBy": paymentRedemptionDto.paidBy, "payment.transactionID": paymentRedemptionDto.transactionID, "payment.details": paymentRedemptionDto.details, "payment.paymentDate": new Date(), status: paymentRedemptionDto.status } },
      { new: true, useFindAndModify: false }
    )
      .then(async (redemption) => {
        if (!redemption) throw new BadRequestException("Redemption Not found");
        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { _id: ObjectId(paymentRedemptionDto.redemptionid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, benifresiry: 1 } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
              type: { $ifNull: ["$type", ""] },
              upiBeneficiaryId: { $ifNull: ["$customerInfo.benifresiry.upiBeneficiaryId", ""] },
              bankAccountBeneficiaryId: { $ifNull: ["$customerInfo.benifresiry.bankAccountBeneficiaryId", ""] },
              payment: { $ifNull: ["$payment", ""] },
            }
          }

        ])


        let reqBody = {
          transfer_id: redemptionid, // Unique Transfer ID
          transfer_amount: findRedemption[0].payment.amount, // ₹1 transfer
          beneficiary_details: { beneficiary_id: findRedemption[0]?.bankAccountBeneficiaryId }, // Redemption ID as Beneficiary
          transfer_mode: 'banktransfer'
        }
        if (findRedemption[0].type == "UPI") {
          reqBody = {
            transfer_id: redemptionid, // Unique Transfer ID
            transfer_amount: findRedemption[0].payment.amount, // ₹1 transfer
            beneficiary_details: { beneficiary_id: findRedemption[0].upiBeneficiaryId }, // Redemption ID as Beneficiary
            transfer_mode: 'upi'
          }
        }
        if (findRedemption.length > 0) {
          if (paymentRedemptionDto.status == "Success" || paymentRedemptionDto.status == "UNDER PROCESS") {
            try {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");

            } catch (error) {
              console.log(error);

            }
            if (paymentRedemptionDto.status == "UNDER PROCESS") {
              try {
                const response = await axios.post(
                  "https://api.cashfree.com/payout/transfers",
                  reqBody,
                  {
                    headers: {
                      // Authorization: `Bearer ${token}`,
                      "x-client-id": process.env.CASHFREE_CLIENT_ID,
                      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
                      "X-Api-Version": "2024-01-01",
                      "Content-Type": "application/json"
                    },
                  }
                );
                console.log(response.data);
              } catch (error) {
                console.error("Error initiating transfer:", error);
              }
            }

          } else if (paymentRedemptionDto.status == "Fail") {
            await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Fail", `${findRedemption[0].firmName},  your redemption is Fail`, "Redeem History");
          }
        }
        return new GetRedemptionInfoDto(redemption)
      });
  };

  public async getNewRefNoRedemption(): Promise<number> {
    const redemption = await this.redemptionModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (redemption && redemption.refno) ? redemption.refno + 1 : 1;
  };

  async getLastRedemption(customerid: any): Promise<any> {
    try {
      const data = await this.redemptionModel.aggregate([
        { $match: { customerid: ObjectId(customerid) } },
        {
          $project: {
            _id: 0,
            amount: { $ifNull: ["$payment.amount", ""] },
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 1 }
      ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException("error in redemption" + e
      );
    }
  };

  public async bulkStatusChange(paymentRedemptionDto: TransferRedemptionDto[], userId: any): Promise<any> {
    const iData = (typeof (paymentRedemptionDto) === 'object') ? Object.values(paymentRedemptionDto) : paymentRedemptionDto
    const redemption = await Promise.all(iData.map(async (payment: any) => {
      payment.paidBy = userId
      var findUser = await this.redemptionModel.findOne({ _id: ObjectId(payment.redemptionid), status: { $ne: payment.status } })
      if (findUser) {
        const findRedemption = await this.redemptionModel.aggregate([
          { $match: { _id: ObjectId(payment.redemptionid) } },
          {
            $lookup: {
              from: "customers",
              localField: "customerid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firmName: 1, deviceInfo: 1, } }
              ],
              as: "customerInfo",
            },
          },
          { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
          {
            $project: {
              firmName: { $ifNull: ["$customerInfo.firmName", ""] },
              deviceToken: { $ifNull: ["$customerInfo.deviceInfo.deviceToken", ""] },
            }
          }

        ])
        if (findRedemption.length > 0) {
          if (findRedemption) {
            if (payment.status == "Rejected") {
              await PushNotification(`${findRedemption[0].deviceToken}`, " Redemption is Rejected  🚫", `${findRedemption[0].firmName}, your redemption is rejected`, "Redeem History");
            } else if (payment.status == "Approved") {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Approved ✅", `${findRedemption[0].firmName},  your redemption is approved`, "Redeem History");

            } else if (payment.status == "Pending") {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Pending", `${findRedemption[0].firmName},  your redemption is Pending`, "Redeem History");

            } else if (payment.status == "Success") {
              await PushNotification(`${findRedemption[0].deviceToken}`, "Redemption is Success", `${findRedemption[0].firmName},  your redemption is Success`, "Redeem History");

            }
          }
        }
      }
      return await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(payment.redemptionid) },
        { $set: { "payment.paidBy": ObjectId(userId), "payment.transactionID": payment.transactionID, "payment.details": payment.details, "payment.paymentDate": (payment.paymentDate) ? new Date(payment.paymentDate) : new Date(), status: payment.status } },
        { new: true, setDefaultsOnInsert: false }
      ).lean();
    })
    );

    return new GetRedemptionInfoDto(redemption)
  };

  async getPendingRedemptions(): Promise<any> {
    try {
      const data = await this.redemptionModel.aggregate([
        { $match: { status: { $in: ["Pending"] } } },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            customerid: { $ifNull: ["$customerid", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
            points: { $ifNull: ["$points", 0] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting redemption details' + e,
      );
    }
  };

};

