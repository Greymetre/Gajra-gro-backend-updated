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
import { addCashfreeBeneficiary, initiateCashfreeTransfer } from 'src/common/utils/cashfree-payout';
@Injectable()
export class RedemptionService {
  constructor(
    @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(SettingProject.name) private settingModel: Model<SettingProjectDocument>) {
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

  /* ================= Cashfree payout helpers ================= */

  private async notifyCustomer(customerid: any, title: string, body: (firmName: string) => string) {
    try {
      const customer = await this.customerModel.findById(customerid, { firmName: 1, deviceInfo: 1 }).lean();
      if (customer) {
        await PushNotification(`${customer?.deviceInfo?.deviceToken || ''}`, title, body(customer.firmName || ''), "Redeem History");
      }
    } catch (error) {
      // notifications are best effort
    }
  }

  // Rejecting a redemption returns its points: the balance only counts redemptions that are not Rejected
  private async markRejected(redemptionId: any, reason?: string) {
    const set: Record<string, any> = { status: "Rejected", statusUpdatedAt: new Date() };
    if (reason) set["payment.details"] = String(reason).slice(0, 500);
    const redemption = await this.redemptionModel.findByIdAndUpdate(redemptionId, { $set: set }, { new: true, useFindAndModify: false });
    if (redemption?.transactionid) {
      await this.transactionModel.updateOne({ _id: redemption.transactionid }, { $set: { points: 0 } });
    }
    return redemption;
  }

  // Beneficiary already saved on the customer, or a new one added in Cashfree
  private async ensureBeneficiary(customer: any, redemption: any): Promise<{ ok: boolean; id?: string; message?: string }> {
    if (!customer) return { ok: false, message: "Customer not found" };
    const isUpi = redemption.type === "UPI";
    const field = isUpi ? "upiBeneficiaryId" : "bankAccountBeneficiaryId";
    const existing = customer?.benifresiry?.[field];
    if (existing) return { ok: true, id: existing };

    const payment = redemption.payment || {};
    const beneId = (isUpi ? "UPI_Id" : "AccountId") + customer._id;
    const result = await addCashfreeBeneficiary(isUpi
      ? { beneId, name: payment.upiHolderName || customer.firmName || 'default name', phone: String(customer.mobile || ''), vpa: payment.upiNumber }
      : { beneId, name: payment.holderName, phone: String(customer.mobile || ''), bankAccount: String(payment.accountNo || ''), ifsc: payment.ifsc });
    if (!result.ok) return { ok: false, message: result.message };

    await this.customerModel.updateOne({ _id: customer._id }, { $set: { [`benifresiry.${field}`]: beneId } });
    return { ok: true, id: beneId };
  }

  // Sends the redemption amount (in rupees) to Cashfree. The redemption _id is the Cashfree transfer_id,
  // so sending the same redemption twice cannot pay twice. Final Success / Rejected comes from the status cron.
  private async startCashfreePayout(redemptionId: any): Promise<{ ok: boolean; message?: string }> {
    const redemption: any = await this.redemptionModel.findById(redemptionId).lean();
    if (!redemption) throw new BadRequestException("Redemption Not found");
    if (redemption.status === "Success" || redemption.status === "Rejected") {
      throw new BadRequestException(`Redemption is already ${redemption.status}`);
    }

    const amount = Number(redemption?.payment?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.markRejected(redemption._id, "Invalid redemption amount");
      return { ok: false, message: "Invalid redemption amount" };
    }

    const customer = await this.customerModel.findById(redemption.customerid).lean();
    const beneficiary = await this.ensureBeneficiary(customer, redemption);
    if (!beneficiary.ok) {
      await this.markRejected(redemption._id, beneficiary.message);
      await this.notifyCustomer(redemption.customerid, " Redemption is Rejected  🚫", (name) => `${name}, your redemption is rejected`);
      return { ok: false, message: beneficiary.message };
    }

    // Marked before the call so the status cron tracks it even if this process stops midway
    await this.redemptionModel.updateOne({ _id: redemption._id }, { $set: { status: "UNDER PROCESS", statusUpdatedAt: new Date() } });
    const result = await initiateCashfreeTransfer(String(redemption._id), beneficiary.id, amount, redemption.type === "UPI" ? "upi" : "banktransfer");
    if (result.rejected) {
      await this.markRejected(redemption._id, result.message);
      await this.notifyCustomer(redemption.customerid, " Redemption is Rejected  🚫", (name) => `${name}, your redemption is rejected`);
      return { ok: false, message: result.message };
    }
    if (!result.accepted) {
      console.error(`Cashfree transfer for redemption ${redemption._id} not confirmed, status cron will resolve it: ${result.message}`);
    }
    return { ok: true };
  }

  // One redemption at a time per customer, so two parallel requests cannot both pass the balance check
  private async acquireRedemptionLock(customerid: any): Promise<boolean> {
    const now = new Date();
    const locked = await this.customerModel.findOneAndUpdate(
      { _id: ObjectId(customerid), $or: [{ redemptionLockUntil: { $exists: false } }, { redemptionLockUntil: null }, { redemptionLockUntil: { $lt: now } }] },
      { $set: { redemptionLockUntil: new Date(now.getTime() + 60 * 1000) } },
      { new: true, useFindAndModify: false },
    ).lean();
    return !!locked;
  }

  private async releaseRedemptionLock(customerid: any) {
    await this.customerModel.updateOne({ _id: ObjectId(customerid) }, { $unset: { redemptionLockUntil: 1 } });
  }

  private async createPayoutRedemption(dto: CreateNeftRedemptionDto | CreateUpiRedemptionDto, type: "IMPS" | "UPI"): Promise<any> {
    const raw: any = dto?.payment || {};
    const amount = Number(raw.amount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) {
      throw new BadRequestException('Please enter a valid amount');
    }
    const payment = type === "UPI"
      ? { method: raw.method, upiNumber: String(raw.upiNumber || '').trim(), upiHolderName: raw.upiHolderName, amount }
      : { method: raw.method, accountNo: String(raw.accountNo || '').trim(), holderName: raw.holderName, bankName: raw.bankName, ifsc: String(raw.ifsc || '').trim(), amount };
    if (type === "UPI" && !payment.upiNumber) throw new BadRequestException('UPI id is required');
    if (type === "IMPS" && (!payment.accountNo || !payment.ifsc || !payment.holderName)) {
      throw new BadRequestException('Account number, IFSC and holder name are required');
    }

    const customer = await this.customerModel.findById(dto.customerid).lean();
    if (!customer) throw new BadRequestException('Customer not found');
    if (!(await this.acquireRedemptionLock(customer._id))) {
      throw new BadRequestException('Another redemption is in progress. Please try again in a minute.');
    }

    let redemption: any;
    const isAdmin = dto.isAdmin === true;
    try {
      const setting = await this.getRedemptionSetting()
      const points = await this.getCustomerBalancePoint(customer._id)
      const redeemPoints = amount * (Number(setting?.point_value) || 1)
      if (setting.first_threshold && points.redeempoint === 0 && points.balance < setting.threshold) {
        throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
      }
      if (setting.every_threshold && points.balance < setting.threshold) {
        throw new BadRequestException(`You must require atleast ${setting.threshold} points to redeem`);
      }
      if (points.balance < redeemPoints) {
        throw new BadRequestException('insufficient balance');
      }

      const transaction = await this.transactionModel.create({ customerType: customer.customerType, customerid: customer._id, points: redeemPoints, pointType: "Redemption", transactionType: "Dr" });
      const status = redeemPoints > 3000 || isAdmin ? 'Pending' : 'UNDER PROCESS'
      // refno is max+1, so a parallel redemption of another customer can collide: retry on duplicate key
      for (let attempt = 0; attempt < 3 && !redemption; attempt++) {
        try {
          redemption = await this.redemptionModel.create({
            customerid: customer._id,
            payment,
            points: redeemPoints,
            transactionid: transaction._id,
            refno: await this.getNewRefNoRedemption(),
            status,
            type,
            createdAt: new Date(),
            statusUpdatedAt: new Date(),
          });
        } catch (error) {
          if (error?.code !== 11000 || attempt === 2) {
            await this.transactionModel.findByIdAndDelete(transaction._id);
            throw new BadRequestException('Unable to create redemption. Please try again.');
          }
        }
      }
    } finally {
      await this.releaseRedemptionLock(customer._id);
    }

    if (!isAdmin) {
      await this.notifyCustomer(customer._id, " Redemption Request Sent  💸", (name) => `${name}, your redemption request of ${redemption.points} Points is sent successfully`);
    }
    if (redemption.status === 'UNDER PROCESS') {
      await this.startCashfreePayout(redemption._id);
    }
    return new GetRedemptionInfoDto(await this.redemptionModel.findById(redemption._id).lean());
  }

  public async redemptionViaNeft(neftRedemptionDto: CreateNeftRedemptionDto): Promise<any> {
    return this.createPayoutRedemption(neftRedemptionDto, "IMPS");
  };

  public async redemptionViaUpi(upiRedemptionDto: CreateUpiRedemptionDto): Promise<any> {
    return this.createPayoutRedemption(upiRedemptionDto, "UPI");
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
    const redemption: any = await this.redemptionModel.findById(id).lean();
    if (!redemption) throw new BadRequestException("Redemption Not found");
    const status = statussRedemptionDto.status;
    try {
      if (status == "Rejected") {
        this.assertNotPaidByCashfree(redemption);
        await this.markRejected(redemption._id);
        await this.notifyCustomer(redemption.customerid, " Redemption is Rejected  🚫", (name) => `${name}, your redemption is rejected`);
        return await this.redemptionModel.findById(id);
      }
      if (status == "Success") {
        // "Success" from the CRM means: send the payment through Cashfree now
        await this.startCashfreePayout(redemption._id);
        return await this.redemptionModel.findById(id);
      }
      if (status == "Approved") {
        const customer = await this.customerModel.findById(redemption.customerid).lean();
        const beneficiary = await this.ensureBeneficiary(customer, redemption);
        if (!beneficiary.ok) {
          return await this.markRejected(redemption._id, beneficiary.message);
        }
        await this.notifyCustomer(redemption.customerid, "Redemption is Approved ✅", (name) => `${name},  your redemption is approved`);
      } else if (status == "Pending") {
        await this.notifyCustomer(redemption.customerid, "Redemption is Pending", (name) => `${name},  your redemption is Pending`);
      }
      return await this.redemptionModel.findByIdAndUpdate({ _id: ObjectId(id) }, { status, statusUpdatedAt: new Date() }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('error while updating redemption status');
    }
  };

  // Money already sent (or in flight) through Cashfree must not be rejected: that would return the points too
  private assertNotPaidByCashfree(redemption: any) {
    if (redemption.status === "UNDER PROCESS") {
      throw new BadRequestException("Payment is in process with Cashfree and cannot be rejected now");
    }
    if (redemption.status === "Success" && redemption?.payment?.fundSource) {
      throw new BadRequestException("Payment is already completed through Cashfree and cannot be rejected");
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

    const redemption = await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(redemptionid) },
      { $set: { approval: { ...approval, approvedAt: new Date() }, status: 'Approved', statusUpdatedAt: new Date() } },
      { new: true, useFindAndModify: false }
    );
    if (!redemption) throw new BadRequestException("Redemption Not found");

    const customer = await this.customerModel.findById(redemption.customerid).lean();
    const beneficiary = await this.ensureBeneficiary(customer, redemption);
    if (!beneficiary.ok) {
      await this.markRejected(redemption._id, beneficiary.message);
      throw new BadRequestException(beneficiary.message);
    }
    await this.notifyCustomer(redemption.customerid, "Redemption is Approved ✅", (name) => `${name},  your redemption is approved`);
    return new GetRedemptionInfoDto(redemption)
  };

  public async rejectedRedemption(rejectedRedemptionDto: RejectRedemptionDto): Promise<any> {
    const { redemptionid, ...rejected } = rejectedRedemptionDto
    const current: any = await this.redemptionModel.findById(redemptionid).lean();
    if (!current) throw new BadRequestException("Redemption Not found");
    this.assertNotPaidByCashfree(current);

    const redemption = await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(redemptionid) },
      { $set: { rejected: { ...rejected, rejectedAt: new Date() }, status: 'Rejected', statusUpdatedAt: new Date() } },
      { new: true, useFindAndModify: false }
    );
    if (redemption.transactionid) {
      await this.transactionModel.updateOne({ _id: redemption.transactionid }, { $set: { points: 0 } });
    }
    await this.notifyCustomer(redemption.customerid, " Redemption is Rejected  🚫", (name) => `${name}, your redemption is rejected`);
    return new GetRedemptionInfoDto(redemption)
  };

  public async transferRedemption(paymentRedemptionDto: TransferRedemptionDto): Promise<any> {
    const { redemptionid, status } = paymentRedemptionDto
    const current: any = await this.redemptionModel.findById(redemptionid).lean();
    if (!current) throw new BadRequestException("Redemption Not found");

    if (status == "UNDER PROCESS") {
      // Pay through Cashfree; final Success / Rejected and the UTR come from the status cron
      await this.redemptionModel.updateOne({ _id: current._id }, { $set: { "payment.paidBy": paymentRedemptionDto.paidBy, "payment.details": paymentRedemptionDto.details } });
      await this.startCashfreePayout(current._id);
      return new GetRedemptionInfoDto(await this.redemptionModel.findById(current._id));
    }

    if (status == "Rejected" || status == "Fail") this.assertNotPaidByCashfree(current);

    // Paid outside Cashfree: record what the CRM user entered
    const redemption = await this.redemptionModel.findOneAndUpdate({ _id: ObjectId(redemptionid) },
      { $set: { "payment.paidBy": paymentRedemptionDto.paidBy, "payment.transactionID": paymentRedemptionDto.transactionID, "payment.details": paymentRedemptionDto.details, "payment.paymentDate": new Date(), status, statusUpdatedAt: new Date() } },
      { new: true, useFindAndModify: false }
    );
    if (status == "Success") {
      await this.notifyCustomer(redemption.customerid, "Redemption is Success", (name) => `${name},  your redemption is Success`);
    } else if (status == "Fail") {
      await this.notifyCustomer(redemption.customerid, "Redemption is Fail", (name) => `${name},  your redemption is Fail`);
    }
    return new GetRedemptionInfoDto(redemption)
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

