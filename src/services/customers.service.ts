import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "../entities/customer.entity";
import { CreateCustomerDto, StatusCustomerDto, UpdateCustomerDto, UserAssignToCustomerDto, ParentAssignToCustomerDto, } from "../user/customers/dto/request-customer.dto";
import { GetCustomerInfoDto, GetAllCustomerDto, } from "../user/customers/dto/response-customer.dto";
import { Request } from "express";
import { destroyCustomerToken, generateCustomerToken, getAuthUserInfo, getCustomerAuthInfo } from "../common/utils/jwt.helper";
import { PushNotification } from "src/common/utils/helper.service";
import * as bcrypt from "bcrypt";
import { AddressDTO } from "src/dto/address-dto";
import { CustomerKycInfoDTO } from "src/dto/kyc-info-dto";
import { CustomerJwtTokenInterface } from "src/common/interfaces/jwt.token.interface";

import { changePasswordRequestDto, CreatePasswordRequestDto, EmailRequestDto, LoginMobileRequestDto, LoginRequestDto, LoginWithOtpRequestDto, MobileRequestDto, passwordRequestDto } from "src/dto/auth-dto";
import { LoginResponseDto } from "src/loyalty/auth/dto/auth.response.dto";
const ObjectId = require("mongoose").Types.ObjectId;
import * as jwt from "jsonwebtoken";
import { CustomerAvatarDto, CustomerDto, CustomerIdArrayDTO, CustomerListWithStatusDTO, CustomerPersonalDetailsDto, CustomersImportDto, FilterPaginationCustomerDto, KycRejectDTO, KycVerifiedDTO, } from "src/dto/customer-dto";
import { CustomerSurveyDataDTO } from "src/dto/survey-data-dto";
import { SettingCustomer, SettingCustomerDocument, } from "src/entities/setting.customer.entity";
import { SettingProject, SettingProjectDocument, } from "src/entities/setting.project.entity";
import { Transaction, TransactionDocument, } from "src/entities/transaction.entity";
import { OtpLog, OtpLogDocument } from 'src/entities/otplog.entity';
import { User, UserDocument } from '../entities/users.entity';
import { Remark, RemarkDocument, } from "src/entities/remark.entity";
import { BankInfoDTO, UpiInfoDTO, UpiVerifiedDTO } from "src/dto/bank-info-dto";
import { async } from "rxjs";
import { SendOTPMessage } from "src/common/utils/send.message";
import axios from "axios";
import { PaginationRequestDto } from "src/dto/pagination-dto";
import { CustomerIdDTO } from "src/dto/dashboard-dto";
import { CustomerViewInterface } from "src/interfaces/customer.interface";
import { AddRemarkDTO } from "src/loyalty/remark/dto/request-remark.dto";
import { Payouts } from '@cashfreepayments/cashfree-sdk';
import { verify } from "crypto";
@Injectable()
export class CustomersService {
  private payoutsInstance: Payouts;
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(SettingCustomer.name) private settingCustomerModel: Model<SettingCustomerDocument>,
    @InjectModel(SettingProject.name) private projectSettingModel: Model<SettingProjectDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(OtpLog.name) private otpLogModel: Model<OtpLogDocument>,
    @InjectModel(Remark.name) private remarkModel: Model<RemarkDocument>
  ) {
    this.payoutsInstance = new Payouts({
      env: 'PRODUCTION',
      clientId: process.env.CASHFREE_CLIENT_ID, // Replace with your Client ID
      clientSecret: process.env.CASHFREE_CLIENT_SECRET, // Replace with your Client Secret
      // Optional: For dynamic IPs, provide path to public key or publicKey string
      // pathToPublicKey: '/path/to/your/public/key/file.pem',
      // publicKey: '<YOUR_PUBLIC_KEY>',
    });
  }
  public async userLogin(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.customerModel.findOne({ $or: [{ email: loginDto.username }, { mobile: loginDto.username }], }).select(
      "firmName contactPerson mobile email password customerType loginAt"
    );
    if (!user) {
      throw new BadRequestException("Invalid email or password.");
    }
    const validate = await bcrypt.compare(loginDto.password, user.password);
    if (!validate) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    try {
      const payload: CustomerJwtTokenInterface = JSON.parse(JSON.stringify(user));
      delete payload["password"];
      await this.customerModel.findOneAndUpdate({ _id: user._id },
        {
          $set: {
            deviceInfo: {
              appVersion: loginDto.appVersion,
              deviceToken: loginDto.deviceToken,
              deviceType: loginDto.deviceType,
              deviceName: loginDto.deviceName,
            },
            loginAt: new Date(),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: false }
      )
        .lean();
      // const token = await jwt.sign(payload, JWTCLIENTSECRET.JWT_SECRET, {
      //   expiresIn: process.env.JWT_EXPIRED_TIME,
      // });
      const token = await generateCustomerToken(payload);
      return new LoginResponseDto({
        ...payload,
        token: token,
      });
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  public async settingInfo(req: Request): Promise<any> {
    try {

      const settingData = await this.projectSettingModel.findOne().select('customerType').exec();;
      if (!settingData) {
        throw new BadRequestException("Customer type not present");
      }
      return settingData;
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async loginUserWithOtp(loginDto: LoginWithOtpRequestDto): Promise<LoginResponseDto> {
    try {
      const otpValidate = await this.otpLogModel.findOne({ mobile: loginDto.username, otp: parseInt(loginDto.otp) }).select('mobile otp').exec()
      const user = await this.customerModel.findOne({ mobile: loginDto.username }).select(
        "firmName firstTimeLogin contactPerson mobile email customerType loginAt otp active");

      if (!otpValidate) {
        throw new BadRequestException("Invalid email or password.");
      } else if (user && user.active === false) {

        let response: any = { active: false };
        return response

      }
      else if (user && user.otp === loginDto.otp) {
        const payload: CustomerJwtTokenInterface = JSON.parse(JSON.stringify(user));

        if (user.firstTimeLogin && loginDto.deviceToken && user.customerType == "Mechanic") {
          // await PushNotification(`${loginDto.deviceToken}`, `50 Welcome Points  💸 💸`, `${user.firmName}, you have successfully earned 50 welcome points in Gajra Gro + Loyalty`, "Redeem History");
          // await PushNotification(`${loginDto.deviceToken}`, `Sign up Successful 💯`, `${user.firmName}, your sign up is successful in Gajra Gro + Loyalty.`, "Dashboard");

          await this.customerModel.findOneAndUpdate({ _id: user._id }, { firstTimeLogin: false })

        }
        await this.customerModel.findOneAndUpdate({ _id: user._id },
          {
            $set: {
              deviceInfo: {
                appVersion: loginDto.appVersion,
                deviceToken: loginDto.deviceToken,
                deviceType: loginDto.deviceType,
                deviceName: loginDto.deviceName,
              },
              otp: '',
              loginAt: new Date(),
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: false }
        )
          .lean();
        const token = await generateCustomerToken(payload);
        // await this.otpLogModel.deleteMany({ mobile: loginDto.username });

        return new LoginResponseDto({
          ...payload,
          token: token,
        });
      }
      else if (user && otpValidate) {



        return new LoginResponseDto({ userExist: true });
      }
      else if (otpValidate) {
        return new LoginResponseDto({ userExist: false });
      }
      else {
        throw new BadRequestException("Invalid email or password.");
      }

    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
    // const user = await this.customerModel.findOne({ mobile: loginDto.username, otp: loginDto.otp }).select(
    //   "firmName contactPerson mobile email customerType loginAt"
    // );
    // if (!user) {
    //   throw new BadRequestException("Invalid email or password.");
    // }
    // try {
    //   const payload: CustomerJwtTokenInterface = JSON.parse(JSON.stringify(user));
    //   await this.customerModel.findOneAndUpdate({ _id: user._id },
    //     {
    //       $set: {
    //         deviceInfo: {
    //           appVersion: loginDto.appVersion,
    //           deviceToken: loginDto.deviceToken,
    //           deviceType: loginDto.deviceType,
    //           deviceName: loginDto.deviceName,
    //         },
    //         otp: '',
    //         loginAt: new Date(),
    //       },
    //     },
    //     { new: true, upsert: true, setDefaultsOnInsert: false }
    //   )
    //     .lean();
    //   const token = await generateCustomerToken(payload);
    //   // await this.otpLogModel.deleteMany({ mobile: loginDto.username });
    //   return new LoginResponseDto({
    //     ...payload,
    //     token: token,
    //   });
    // } catch (err) {
    //   throw new BadRequestException("Invalid email or password.");
    // }
  };

  public async loginWithMobile(loginDto: LoginMobileRequestDto): Promise<LoginResponseDto> {
    const user = await this.customerModel.findOne({ mobile: loginDto.username }).select(
      "firmName contactPerson mobile email customerType loginAt"
    );
    if (!user) {
      throw new BadRequestException("Invalid email or password.");
    }
    try {
      const payload: CustomerJwtTokenInterface = JSON.parse(JSON.stringify(user));
      await this.customerModel.findOneAndUpdate({ _id: user._id },
        {
          $set: {
            deviceInfo: {
              appVersion: loginDto.appVersion,
              deviceToken: loginDto.deviceToken,
              deviceType: loginDto.deviceType,
              deviceName: loginDto.deviceName,
            },
            loginAt: new Date(),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: false }
      )
        .lean();
      const token = await generateCustomerToken(payload);
      return new LoginResponseDto({
        ...payload,
        token: token,
      });
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  public async checkMobileExists(mobileDto: MobileRequestDto) {
    const user = await this.customerModel.findOne({ mobile: mobileDto.mobile }).select('verified.setPassword');
    if (!user) {
      return {
        exists: false,
        setPassword: false
      };
    }
    else {
      return {
        exists: true,
        setPassword: user?.verified?.setPassword ? user?.verified?.setPassword : false
      };
    }
  };

  public async checkEmailExists(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      return "Email is available";
    }
    throw new BadRequestException("Email is not available");
  };

  public async forgotPassword(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      throw new BadRequestException("Email is not available");
    }
    return "Password reset link is sent to your registered email address.";
  };

  public async changePassword(
    req: Request,
    changePasswordDto: changePasswordRequestDto
  ) {
    const authInfo = await getCustomerAuthInfo(req.headers);
    const user = await this.customerModel.findById(authInfo._id);
    if (!user) {
      throw new BadRequestException("User Not found");
    }
    const validate = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );
    if (!validate) {
      throw new BadRequestException("Invalid password.");
    }
    const saltOrRounds = 10;
    user.password = await bcrypt.hash(changePasswordDto.password, saltOrRounds);
    if (user.save()) {
      return "Password Update Succiessfully";
    }
    throw new BadRequestException("Error in Password Update");
  };

  public async createNewPassword(createPasswordDto: CreatePasswordRequestDto) {
    const saltOrRounds = 10;
    createPasswordDto.password = await bcrypt.hash(createPasswordDto.password, saltOrRounds);
    return await this.customerModel.findOneAndUpdate({ mobile: createPasswordDto.username },
      { $set: { password: createPasswordDto.password, "verified.setPassword": true } },
      { new: true, useFindAndModify: false }
    )
      .then((customer) => {
        if (!customer) throw new BadRequestException("User Not found");
        return customer.verified;
      });
  };

  public async resetPassword(req: Request, passwordDto: passwordRequestDto) {
    const authInfo = await getCustomerAuthInfo(req.headers);
    const user = await this.customerModel.findById(authInfo._id);
    if (!user) {
      throw new BadRequestException("User Not found");
    }
    const saltOrRounds = 10;
    user.password = await bcrypt.hash(passwordDto.password, saltOrRounds);
    if (user.save()) {
      return "Password Update Succiessfully";
    }
    throw new BadRequestException("Error in Password Update");
  };

  public async logOtpRequest(data: any) {
    return await this.otpLogModel.findOneAndUpdate({ mobile: data.mobile },
      { $set: { ...data, createdAt: new Date() } },
      { new: true, useFindAndModify: true, upsert: true }
    )
      .then((customer) => {
        return customer;
      });
  };

  public async newOtpRequest(mobileDto: MobileRequestDto) {
    try {
      var otp = Math.floor(1000 + Math.random() * 9000);
      var data = { mobile: mobileDto.mobile, otp: otp }
      await SendOTPMessage(data)
      await this.logOtpRequest(data)
      return await this.customerModel.findOneAndUpdate({ mobile: mobileDto.mobile },
        { $set: { otp: otp } },
        { new: true, useFindAndModify: false }
      )
        .then((customer) => {
          if (!customer) return { otp: otp, userExist: false };
          return { otp: otp, userExist: true };
        });
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async resendOtpRequest(mobileDto: MobileRequestDto) {
    try {
      const sentOtp = await this.otpLogModel.findOne({ mobile: mobileDto.mobile }).sort({ createdAt: -1 }).select('otp');
      var otp = await (!sentOtp) ? Math.floor(1000 + Math.random() * 9000) : sentOtp.otp
      var data = { mobile: mobileDto.mobile, otp: otp }
      await SendOTPMessage(data)
      await this.logOtpRequest(data)
      return await this.customerModel.findOneAndUpdate({ mobile: mobileDto.mobile },
        { $set: { otp: otp } },
        { new: true, useFindAndModify: false }
      ).then((customer) => {
        if (!customer) return { otp: otp, userExist: false };
        return { otp: otp, userExist: true };
      });
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async customerSignup(signupDto: CustomerDto): Promise<LoginResponseDto> {
    try {
      const saltOrRounds = 10;
      if (signupDto.password) {
        signupDto.password = await bcrypt.hash(signupDto.password, saltOrRounds);
        signupDto.verified.setPassword = true
      }
      const refno = await this.getNewRefNoCustomer()
      if (signupDto.createdBy) {
        const createdby = await this.userModel.findOne({ mobile: signupDto.createdBy }).select('_id').exec()
        signupDto.createdBy = createdby._id
      }
      else {
        signupDto.loginAt = new Date();
        signupDto.deviceInfo = { deviceToken: signupDto.deviceToken, deviceType: signupDto.deviceType };
      }
      const user = await this.customerModel.findOne({ mobile: signupDto.mobile }).select('_id mobile').exec();
      if (!user) {
        const customer = new this.customerModel({
          ...signupDto,
          refno: refno,
          createdAt: new Date(),
        });
        if (customer.save()) {
          delete customer["password"];
          const payload: CustomerJwtTokenInterface = (({
            password,
            parentid,
            kycInfo,
            userAssign,
            surveyData,
            createdAt,
            active,
            loginAt,
            ...o
          }) => o)(JSON.parse(JSON.stringify(customer)));
          const token = await jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRED_TIME,
          });
          var { points } = await this.welcomePointsSetting();
          if (points.welcome && signupDto.customerType == "Mechanic") {
            await this.welcomeTransactionsPoints(customer, points.welcome);
            // await PushNotification(`${signupDto.deviceToken}`, ` 50 Welcome Points  💸 💸`, `${signupDto.firmName}, you have successfully earned 50 welcome points in Gajra Gro + Loyalty`, "History");
          }
          await PushNotification(`${signupDto.deviceToken}`, ` Sign up Successful 💯`, `${signupDto.firmName}, your sign up is successful in Gajra Gro + Loyalty.`, "Dashboard");

          await this.signupFromGajraMlp(customer)
          return new LoginResponseDto({
            ...payload,
            token: token,
          });
        } else {
          throw new BadRequestException("Error in Create Customer");
        }
      }
      else {
        throw new BadRequestException("Customer Already Exist");
      }
    } catch (err) {
      console.log('err', err);

      throw new BadRequestException(err);
    }
  };

  public async logoutCustomer(req: Request) {
    const authInfo = await destroyCustomerToken(req.headers);
    if (!authInfo) {
      throw new BadRequestException("User Not found");
    } else {
      return "Logout Succiessfully";
    }
  };

  async getUserInfo(id: string): Promise<GetCustomerInfoDto> {
    try {
      const data = await this.customerModel
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          {
            $lookup: {
              from: "users",
              localField: "userAssign.userid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "userInfo",
            },
          },
          {
            $unwind: { path: "$surveyData", preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: 1,
              firmName: { $ifNull: ["$firmName", ""] },
              contactPerson: { $ifNull: ["$contactPerson", ""] },
              phonecode: { $ifNull: ["$phonecode", ""] },
              mobile: { $ifNull: ["$mobile", null] },
              email: { $ifNull: ["$email", ""] },
              customerType: { $ifNull: ["$customerType", ""] },
              avatar: { $ifNull: ["$avatar", ""] },
              // address: {
              //   $concat: [
              //     { $ifNull: ["$address.address", ""] },
              //     ", ",
              //     { $ifNull: ["$address.city", ""] },
              //     ", ",
              //     { $ifNull: ["$address.state", ""] },
              //     ", ",
              //     { $ifNull: ["$address.postalCode", ""] },
              //   ],
              // },

              address: {
                $cond: {
                  if: { $eq: ["$address", {}] },
                  then: "",
                  else: {
                    $concat: [
                      { $cond: { if: { $or: [{ $ne: ["$address.address", null] }, { $ne: ["$address.address", ""] }] }, then: ", ", else: "$address.address" } },
                      { $cond: { if: { $or: [{ $ne: ["$address.city", null] }, { $ne: ["$address.city", ""] }] }, then: ", ", else: "$address.city" } },
                      { $cond: { if: { $or: [{ $ne: ["$address.state", null] }, { $ne: ["$address.state", ""] }] }, then: ", ", else: "$address.state" } },
                      { $cond: { if: { $or: [{ $ne: ["$address.postalCode", null] }, { $ne: ["$address.postalCode", ""] }] }, then: ", ", else: "$address.postalCode" } },


                    ]
                  }
                }
              },
              shopimage: { $ifNull: ["$shopimage", ""] },
              userInfo: { $ifNull: ["$userInfo", []] },
              active: { $ifNull: ["$active", false] },
              createdAt: { $ifNull: ["$createdAt", false] },
            },
          },
          { $limit: 1 },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetCustomerInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async getCustomerAddress(id: string): Promise<any> {
    try {
      const data = await this.customerModel
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          {
            $project: {
              _id: 1,
              postalCode: { $ifNull: ["$address.postalCode", ""] },
              address: { $ifNull: ["$address.address", ""] },
              city: { $ifNull: ["$address.city", ""] },
              state: { $ifNull: ["$address.state", ""] },
              country: { $ifNull: ["$address.country", ""] },
              coordinates: { $ifNull: ["$location.coordinates", []] },
            },
          },
          { $limit: 1 },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetCustomerInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  public async updateAddress(addressDto: AddressDTO, customerid): Promise<any> {
    try {
      return await this.customerModel
        .findOneAndUpdate(
          { _id: ObjectId(customerid) },
          {
            $set: {
              address: {
                postalCode: addressDto.postalCode,
                address: addressDto.address,
                city: addressDto.city,
                state: addressDto.state,
                country: addressDto.country,
              },
              location: { coordinates: addressDto.coordinates },
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: false }
        )
        .lean();
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async createCustomer(createCustomerDto: CreateCustomerDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers);
    if (createCustomerDto.password) {
      createCustomerDto.password = await bcrypt.hash(
        createCustomerDto.password,
        10
      );
    } else {
      delete createCustomerDto["password"];
    }
    const refno = await this.getNewRefNoCustomer()
    const customer = new this.customerModel({
      ...createCustomerDto,
      refno: refno,
      createdBy: authInfo._id,
      firstTimeLogin: true
    });
    if (customer.save()) {
      var { points } = await this.welcomePointsSetting();
      if (points.welcome) {
        await this.welcomeTransactionsPoints(customer, points.welcome);
      }
      await this.signupFromGajraMlp(customer)
      return new GetCustomerInfoDto(customer);
    }
    throw new BadRequestException("Error in Create Customer");
  };

  async getAllCustomer(paginationDto: FilterPaginationCustomerDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 10
      let condition: any = {}
      let locationFilter: any = {};
      let customerTypeCond: any = {}; 
      let searchPincodeFilter: any = {};
      if (paginationDto.postalCode?.length) {
        locationFilter["address.postalCode"] = { $in: paginationDto.postalCode };
      }

      if (paginationDto.state?.length) {
        locationFilter["address.state"] = { $in: paginationDto.state };
      }

      if (paginationDto.city?.length) {
        locationFilter["address.city"] = { $in: paginationDto.city };
      }

      if (paginationDto.searchByPincode) {
        searchPincodeFilter["address.postalCode"] = {
          $regex: `^${paginationDto.searchByPincode}`,
          $options: "i",
        };
      }

      if (paginationDto.customerType?.length) {
        customerTypeCond = { customerType: { $in: paginationDto.customerType } };
      }
      let pendingCondition = {
        $and: [
          { "kycInfo.aadharFrontImage": { $ne: "" } },
          { "kycInfo.aadharBackImage": { $ne: "" } },
          { "verified.aadharVerified": false },
          {
            $or: [
              {
                $and: [
                  { "kycInfo.passbookImage": { $ne: "" } },
                  { "verified.bankVerified": false }
                ]
              },
              {
                $and: [
                  { "kycInfo.upiImage": { $ne: "" } },
                  { "verified.upiVerified": false }
                ]
              }
            ]
          }
        ]
      }

      let rejectedCondition = {
        $or: [
          {
            $and: [{ "verified.aadharVerified": { $in: [false] }, "kycInfo.aadharFrontImage": "", "kycInfo.aadharBackImage": "" },]
          },
          {
            $or: [
              {
                $and: [{ "verified.bankVerified": { $in: [false] }, "kycInfo.passbookImage": "" },]
              },
              {
                $and: [{ "verified.upiVerified": { $in: [false] }, "kycInfo.upiImage": "" },]
              }
            ]
          },
          {
            $and: [{ "verified.gstinVerified": { $in: [false] }, "kycInfo.gstinImage": "" },]
          },
          {
            $and: [{ "verified.panVerified": { $in: [false] }, "kycInfo.panImage": "" },]
          },

        ]
      }

      let incompleteCondition = {
        $and: [
          { verified: { $exists: false } },

          {
            $or: [
              { "kycInfo.aadharFrontImage": "" },
              { "kycInfo.aadharBackImage": "" },
              { "kycInfo.aadharNo": "" },
              {
                $or: [
                  { "kycInfo.passbookImage": "" },
                  { "kycInfo.upiImage": "" },
                ]
              },
            ]
          }

        ]
      };


      let approvedCondition = {
        $and: [
          { "kycInfo.aadharFrontImage": { $ne: "" } },
          { "kycInfo.aadharBackImage": { $ne: "" } },
          { "kycInfo.passbookImage": { $ne: "" } },
          { "bankInfos.bankInfo.accountNo": { $ne: "" } },
          { "verified.aadharVerified": true },
          { "verified.bankVerified": true },
          {
            $or: [
              { "bankInfos.bankInfo.verified": true },
              { "bankInfos.upiInfo.verified": true },
            ]
          },
        ]
      }

      let conditions = [];
      if (paginationDto.condition.includes("All")) {
        conditions.push({});
      } else {
        if (paginationDto.condition.includes("Pending")) {
          conditions.push(pendingCondition);
        }
        if (paginationDto.condition.includes("Rejected")) {
          conditions.push(rejectedCondition);
        }
        if (paginationDto.condition.includes("Incomplete")) {
          conditions.push(incompleteCondition);
        }
        if (paginationDto.condition.includes("Approved")) {
          conditions.push(approvedCondition);
        }
      }
      // let customerTypeCond = {};

      if (paginationDto.customerType.length === 1) {
        const customerType = paginationDto.customerType[0];
        if (customerType === "Mechanic" || customerType === "Retailer") {
          customerTypeCond = { customerType };
        }
      }


      if (conditions.length > 0) {
        condition = { $or: conditions };
      }
      const data = await this.customerModel
        .aggregate([
          { $match: customerTypeCond },
          {
            $lookup: {
              from: "settingcustomers",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                { $project: { _id: 1, bankInfo: 1, upiInfo: 1 } },
              ],
              as: "bankInfos",
            },
          },

          {
            $lookup: {
              from: "remarks",
              localField: "remarkid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, remark: 1, } },
              ],
              as: "remarkInfos",
            },
          },
          { $unwind: { path: "$remarkInfos", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$bankInfos", preserveNullAndEmptyArrays: true }, },
          {
            $match: {
              $and: [
                paginationDto.startDate ? { createdAt: { $gte: new Date(paginationDto.startDate) } } : {},
                paginationDto.endDate ? { createdAt: { $lt: new Date(paginationDto.endDate) } } : {},
                paginationDto.existing ? { createdBy: { $exists: true } } : {},
                paginationDto.self ? { createdBy: { $exists: false } } : {},
                Object.keys(locationFilter).length ? locationFilter : {},
                // paginationDto.status.length ? { status: { $in: paginationDto.status } } : {},
                paginationDto.userid ? { "userAssign.userid": ObjectId(paginationDto.userid) } : {},
                paginationDto.condition ? condition : {},
                Object.keys(searchPincodeFilter).length
                ? searchPincodeFilter
                : {},

              ],
              $or: [
                { firmName: { $regex: paginationDto.search, '$options': 'i' } },
                { contactPerson: { $regex: paginationDto.search, '$options': 'i' } },
                { mobile: { $regex: paginationDto.search, '$options': 'i' } },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "userInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userAssign.userid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "reportingInfo",
            },
          },
          { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$reportingInfo", preserveNullAndEmptyArrays: true }, },
          {
            $project: {
              createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" } },
              _id: 1,
              createdBy: {
                $concat: [
                  { $ifNull: ["$userInfo.firstName", "Self"] },
                  " ",
                  { $ifNull: ["$userInfo.lastName", ""] }
                ]
              },

              assignUser: {
                $concat: [
                  { $ifNull: ["$reportingInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$reportingInfo.lastName", ""] }
                ]
              },
              customerType: { $ifNull: ["$customerType", ""] },
              remark: { $ifNull: ["$remarkInfos.remark", ""] },
              remarkid: { $ifNull: ["$remarkInfos.id", ""] },
              firmName: { $ifNull: ["$firmName", ""] },
              contactPerson: { $ifNull: ["$contactPerson", ""] },
              refno: { $ifNull: ["$refno", 0] },
              address: { $ifNull: ["$address.address", ""] },
              postalCode: { $ifNull: ["$address.postalCode", ""] },
              city: { $ifNull: ["$address.city", ""] },
              state: { $ifNull: ["$address.state", ""] },
              mobile: { $ifNull: ["$mobile", null] },
              email: { $ifNull: ["$email", ""] },
              avatar: { $ifNull: ["$avatar", ""] },
              location: { $ifNull: ["$location", {}] },
              phone: { $ifNull: ["$phone", ""] },
              grade: { $ifNull: ["$grade", ""] },
              status: { $ifNull: ["$status", ""] },
              active: { $ifNull: ["$active", false] },
              loginAt: { $ifNull: ["$loginAt", ""] },
              accountNo: { $ifNull: ["$bankInfos.bankInfo.accountNo", ""] },
              bankVee: { $ifNull: ["$bankInfos.bankInfo.verified", ""] },
              BankName: { $ifNull: ["$bankInfos.bankInfo.bankName", ""] },
              AccountHolderName: { $ifNull: ["$bankInfos.bankInfo.holderName", ""] },
              UPIId: { $ifNull: ["$bankInfos.upiInfo.upiNumber", ""] },
              AdharNumber: { $ifNull: ["$kycInfo.aadharNo", ""] },
              PanNo: { $ifNull: ["$kycInfo.panNo", ""] },
              IFSCCode: { $ifNull: ["$bankInfos.bankInfo.ifsc", ""] },
              kycInfo: { $ifNull: ["$kycInfo", {}] },
              verified: { $ifNull: ["$verified", {}] },
            },
          },
          { $sort: { refno: -1 } },
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
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetAllCustomerDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async getCustomerInfo(id: string): Promise<GetCustomerInfoDto> {
    try {
      const data = await this.customerModel
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          {
            $lookup: {
              from: "users",
              localField: "userAssign.userid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "userAssignInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userAssign.reporting",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "reportingInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } },
              ],
              as: "createdInfo",
            },
          },
          {
            $lookup: {
              from: "settingcustomers",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                { $project: { _id: 1, bankInfo: 1, upiInfo: 1 } },
              ],
              as: "settingCustomerInfo",
            },
          },
          {
            $lookup: {
              from: "redemptions",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                {
                  $match: {
                    "status": { $ne: "Rejected" }
                  }
                },
                { $project: { _id: 1, points: 1 } },
              ],
              as: "redemptionInfo",
            },
          },
          {
            $lookup: {
              from: "redemptions",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                {
                  $match: {
                    "status": "Rejected"
                  }
                },
                { $project: { _id: 1, points: 1 } },
              ],
              as: "redemptionRejectedInfo",
            },
          },
          {
            $lookup: {
              from: "transactions",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                {
                  $match: {
                    "transactionType": "Cr"
                  }
                },
                {
                  $project: {
                    _id: 1,
                    points: 1
                  }
                }
              ],
              as: "transactionInfo"
            }
          },


          {
            $lookup: {
              from: "remarks",
              localField: "remarkid",
              foreignField: "_id",
              pipeline: [
                { $project: { _id: 1, remark: 1, } },
              ],
              as: "remarkInfos",
            },
          },
          { $unwind: { path: "$remarkInfos", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$createdInfo", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$userAssignInfo", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$reportingInfo", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$settingCustomerInfo", preserveNullAndEmptyArrays: true }, },
          { $unwind: { path: "$redemptionRejectedInfo", preserveNullAndEmptyArrays: true }, },
          {
            $project: {
              _id: 1,
              firmName: { $ifNull: ["$firmName", ""] },
              contactPerson: { $ifNull: ["$contactPerson", ""] },
              customerType: { $ifNull: ["$customerType", ""] },
              phoneCode: { $ifNull: ["$phoneCode", ""] },
              mobile: { $ifNull: ["$mobile", null] },
              email: { $ifNull: ["$email", ""] },
              avatar: { $ifNull: ["$avatar", ""] },
              deviceInfo: { $ifNull: ["$deviceInfo", {}] },
              location: { $ifNull: ["$location", {}] },
              address: { $ifNull: ["$address.address", ""] },
              postalCode: { $ifNull: ["$address.postalCode", ""] },
              city: { $ifNull: ["$address.city", ""] },
              state: { $ifNull: ["$address.state", ""] },
              notification: { $ifNull: ["$notification", {}] },
              phone: { $ifNull: ["$phone", ""] },
              visitingCard: { $ifNull: ["$visitingCard", ""] },
              shopimage: { $ifNull: ["$shopimage", ""] },
              grade: { $ifNull: ["$grade", "grade"] },
              status: { $ifNull: ["$status", ""] },
              userInfo: { $ifNull: ["$userAssignInfo", {}] },
              reportings: { $ifNull: ["$reportingInfo", {}] },
              gstinNo: { $ifNull: ["$kycInfo.gstinNo", ""] },
              gstinImage: { $ifNull: ["$kycInfo.gstinImage", ""] },
              gstinVerified: { $ifNull: ["$verified.gstinVerified", false] },
              panNo: { $ifNull: ["$kycInfo.panNo", ""] },
              panImage: { $ifNull: ["$kycInfo.panImage", ""] },
              panVerified: { $ifNull: ["$verified.panVerified", false] },
              aadharNo: { $ifNull: ["$kycInfo.aadharNo", ""] },
              aadharFrontImage: { $ifNull: ["$kycInfo.aadharFrontImage", ""] },
              aadharBackImage: { $ifNull: ["$kycInfo.aadharBackImage", ""] },
              aadharVerified: { $ifNull: ["$verified.aadharVerified", false] },
              otherNo: { $ifNull: ["$kycInfo.otherNo", ""] },
              otherName: { $ifNull: ["$kycInfo.otherName", ""] },
              otherFrontImage: { $ifNull: ["$kycInfo.otherFrontImage", ""] },
              otherBackImage: { $ifNull: ["$kycInfo.otherBackImage", ""] },
              otherVerified: { $ifNull: ["$verified.otherVerified", false] },
              passbookImage: { $ifNull: ["$kycInfo.passbookImage", ""] },
              bankVerified: { $ifNull: ["$verified.bankVerified", false] },
              upiVerified: { $ifNull: ["$verified.upiVerified", false] },
              accountNo: { $ifNull: ["$settingCustomerInfo.bankInfo.accountNo", ""] },
              holderName: { $ifNull: ["$settingCustomerInfo.bankInfo.holderName", ""] },
              bankName: { $ifNull: ["$settingCustomerInfo.bankInfo.bankName", ""] },
              verified: { $ifNull: ["$settingCustomerInfo.bankInfo.verified", false] },
              ifsc: { $ifNull: ["$settingCustomerInfo.bankInfo.ifsc", ""] },
              upiNumber: { $ifNull: ["$settingCustomerInfo.upiInfo.upiNumber", ""] },
              upiImage: { $ifNull: ["$kycInfo.upiImage", ""] },
              active: { $ifNull: ["$active", false] },
              createdAt: { $ifNull: ["$createdAt", ''] },
              loginAt: { $ifNull: ["$loginAt", ""] },
              createdBy: {
                $concat: [
                  { $ifNull: ["$createdInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$createdInfo.lastName", ""] },
                ],
              },

              totalRedemption: {
                $ifNull: [
                  { $sum: "$redemptionInfo.points" },
                  0
                ]
              },
              totalTransaction: {
                $ifNull: [
                  { $sum: "$transactionInfo.points" },
                  0
                ]
              },
              totalRejectedPoint: {
                $ifNull: [
                  { $sum: "$redemptionRejectedInfo.points" },
                  0
                ]
              },


              balancePoint: {
                $ifNull: [
                  {
                    // $abs: {
                    $subtract: [
                      {
                        $ifNull: [
                          { $sum: "$transactionInfo.points" },
                          0
                        ]
                      },
                      {
                        $ifNull: [
                          { $sum: "$redemptionInfo.points" },
                          0
                        ]
                      }
                    ]
                    // }
                  },
                  0
                ]
              },
              remark: { $ifNull: ["$remarkInfos.remark", ""] },
              remarkid: { $ifNull: ["$remarkInfos.id", ""] },

            },
          },
          { $limit: 1 },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetCustomerInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async updateCustomerInfo(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    try {
      if (updateCustomerDto.password) {
        updateCustomerDto.password = await bcrypt.hash(
          updateCustomerDto.password,
          10
        );
      } else {
        delete updateCustomerDto["password"];
      }
      return await this.customerModel.findByIdAndUpdate(id, updateCustomerDto, {
        new: true,
        useFindAndModify: false,
      });
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async deleteCustomer(id: string): Promise<Customer> {
    try {
      await this.transactionModel.deleteMany({ customerid: ObjectId(id) })
      await this.settingCustomerModel.deleteMany({ customerid: ObjectId(id) })
      return await this.customerModel.findByIdAndDelete(id);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async updateStatus(statusCustomerDto: StatusCustomerDto): Promise<Customer> {
    try {
      return await this.customerModel.findByIdAndUpdate(
        statusCustomerDto.customerid,
        { active: statusCustomerDto.active },
        { new: true, useFindAndModify: false }
      );
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  async userAssign(assignUserDto: UserAssignToCustomerDto): Promise<any> {
    try {
      return await this.customerModel.findOneAndUpdate({ _id: ObjectId(assignUserDto.customerid) },
        { $set: { "userAssign.userid": ObjectId(assignUserDto.userid), "userAssign.reporting": ObjectId(assignUserDto.reporting) } },
        { new: true, useFindAndModify: false }
      )
        .then((customer) => {
          if (!customer) throw new BadRequestException("User Already Assigned");
          return customer;
        });
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  async deleteAssignedUser(assignUserDto: UserAssignToCustomerDto): Promise<GetCustomerInfoDto> {
    try {
      return await this.customerModel.findByIdAndUpdate(assignUserDto.customerid,
        { $set: { "userAssign.userid": '' } },
        { new: true, useFindAndModify: false }
      );
    } catch (e) {
      throw new InternalServerErrorException("error while getting city details" + e);
    }
  };

  async addParentCustomer(
    parentAssignDto: ParentAssignToCustomerDto
  ): Promise<any> {
    try {
      return await this.customerModel
        .findOneAndUpdate(
          {
            _id: parentAssignDto.customerid,
            parentid: { $ne: parentAssignDto.parentid },
          },
          { $push: { parentid: parentAssignDto.parentid } },
          { new: true, useFindAndModify: false }
        )
        .then((customer) => {
          if (!customer)
            throw new BadRequestException("Customer Already Assined");
          return customer;
        });
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  async deleteParentCustomer(
    parentAssignDto: ParentAssignToCustomerDto
  ): Promise<GetCustomerInfoDto> {
    try {
      return await this.customerModel.findByIdAndUpdate(
        parentAssignDto.customerid,
        { $pull: { parentid: { $in: parentAssignDto.parentid } } },
        { new: true, useFindAndModify: false }
      );
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting city details" + e
      );
    }
  };

  async getCustomerKycInfo(id: string): Promise<any> {
    try {
      const data = await this.customerModel
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          // get setting customer
          {
            $lookup: {
              from: "settingcustomers",
              localField: "_id",
              foreignField: "customerid",
              pipeline: [
                { $project: { _id: 1, bankInfo: 1, upiInfo: 1 } },
              ],
              as: "settingCustomerInfo",
            },
          },
          {
            $project: {
              _id: 1,
              gstinNo: { $ifNull: ["$kycInfo.gstinNo", ""] },
              gstinImage: { $ifNull: ["$kycInfo.gstinImage", ""] },
              gstinVerified: { $ifNull: ["$verified.gstinVerified", false] },
              panNo: { $ifNull: ["$kycInfo.panNo", ""] },
              panImage: { $ifNull: ["$kycInfo.panImage", ""] },
              panVerified: { $ifNull: ["$verified.panVerified", false] },
              aadharNo: { $ifNull: ["$kycInfo.aadharNo", ""] },
              aadharFrontImage: { $ifNull: ["$kycInfo.aadharFrontImage", ""] },
              aadharBackImage: { $ifNull: ["$kycInfo.aadharBackImage", ""] },
              aadharVerified: { $ifNull: ["$verified.aadharVerified", false] },
              otherNo: { $ifNull: ["$kycInfo.otherNo", ""] },
              otherName: { $ifNull: ["$kycInfo.otherName", ""] },
              otherFrontImage: { $ifNull: ["$kycInfo.otherFrontImage", ""] },
              otherBackImage: { $ifNull: ["$kycInfo.otherBackImage", ""] },
              passbookImage: { $ifNull: ["$kycInfo.passbookImage", ""] },
              bankVerified: { $ifNull: ["$verified.bankVerified", false] },
              otherVerified: { $ifNull: ["$verified.otherVerified", false] },
              upiVerified: { $ifNull: ["$verified.upiVerified", false] },
              isUpiAvailable: { $ifNull: ["$settingCustomerInfo.upiInfo.upiNumber", false] },
              isPassBookAvailable: { $ifNull: ["$kycInfo.passbookImage", false] },
            },
          },
          { $limit: 1 },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetCustomerInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  public async updateKycInfo(customerKycDto: CustomerKycInfoDTO, customerid): Promise<any> {
    // try {
    //   return await this.customerModel.findOneAndUpdate({ _id: ObjectId(customerid) },
    //       {
    //         $set: {
    //           kycInfo: customerKycDto,
    //         },
    //       },
    //       { new: true, upsert: true, setDefaultsOnInsert: false }
    //     )
    //     .lean();
    // } catch (err) {
    //   throw new BadRequestException(err);
    // }
    try {
      const customerToUpdate = await this.customerModel.findById(ObjectId(customerid));
      if (!customerToUpdate) {
        throw new NotFoundException();
      }
      if (customerKycDto.aadharBackImage || customerKycDto.aadharFrontImage) {
        customerToUpdate.set({ "verified.aadharVerified": false, "kycInfo.aadharFrontImage": customerKycDto.aadharFrontImage, "kycInfo.aadharBackImage": customerKycDto.aadharBackImage });
      }
      if (customerKycDto.gstinImage) {
        customerToUpdate.set({ "verified.gstinVerified": false, "kycInfo.gstinImage": customerKycDto.gstinImage });
      }
      if (customerKycDto.panImage) {
        customerToUpdate.set({ "verified.panVerified": false, "kycInfo.panImage": customerKycDto.panImage });
      }
      if (customerKycDto.otherBackImage || customerKycDto.otherFrontImage) {
        customerToUpdate.set({ "verified.otherVerified": false, "kycInfo.otherFrontImage": customerKycDto.otherFrontImage, "kycInfo.otherBackImage": customerKycDto.otherBackImage });
      }
      if (customerKycDto.passbookImage) {
        customerToUpdate.set({ "verified.bankVerified": false, "kycInfo.passbookImage": customerKycDto.passbookImage });
      }
      if (customerKycDto.upiImage) {
        customerToUpdate.set({ "verified.upiVerified": false, "kycInfo.upiImage": customerKycDto.upiImage });
      }
      customerToUpdate.set({ "kycInfo.gstinNo": customerKycDto.gstinNo, "kycInfo.panNo": customerKycDto.panNo, "kycInfo.aadharNo": customerKycDto.aadharNo, "kycInfo.otherNo": customerKycDto.otherNo, "kycInfo.otherName": customerKycDto.otherName });
      return await customerToUpdate.save();
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async updateCustomerPersonalInfo(
    customerDetailsDto: CustomerPersonalDetailsDto,
    customerid
  ): Promise<any> {
    try {
      const existingCustomer = await this.customerModel.findOne({ _id: ObjectId(customerid) });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }
      existingCustomer.firmName = customerDetailsDto.firmName ?? existingCustomer.firmName;
      existingCustomer.contactPerson = customerDetailsDto.contactPerson ?? existingCustomer.contactPerson;
      existingCustomer.mobile = customerDetailsDto.mobile ?? existingCustomer.mobile;
      existingCustomer.email = customerDetailsDto.email ?? existingCustomer.email;
      existingCustomer.customerType = customerDetailsDto.customerType ?? existingCustomer.customerType;
      if (customerDetailsDto.address && customerDetailsDto.address.address) {
        existingCustomer.set({ 'address.address': customerDetailsDto.address.address ?? existingCustomer.address.address });
      }
      if (customerDetailsDto.address && customerDetailsDto.address.postalCode) {
        existingCustomer.set({ 'address.postalCode': customerDetailsDto.address.postalCode ?? existingCustomer.address.postalCode });
      }
      if (customerDetailsDto.address && customerDetailsDto.address.city) {
        existingCustomer.set({ 'address.city': customerDetailsDto.address.city ?? existingCustomer.address.city });
      }
      if (customerDetailsDto.address && customerDetailsDto.address.state) {
        existingCustomer.set({ 'address.state': customerDetailsDto.address.state ?? existingCustomer.address.state });
      }
      if (customerDetailsDto.address && customerDetailsDto.address.country) {
        existingCustomer.set({ 'address.country': customerDetailsDto.address.country ?? existingCustomer.address.country });
      }
      existingCustomer.avatar = customerDetailsDto.avatar ?? existingCustomer.avatar;
      existingCustomer.shopimage = customerDetailsDto.shopimage ?? existingCustomer.shopimage;
      if (customerDetailsDto.aadharFrontImage) {

        existingCustomer.set({ "verified.aadharVerified": false, "kycInfo.aadharFrontImage": customerDetailsDto.aadharFrontImage });
      }
      if (customerDetailsDto.aadharBackImage) {

        existingCustomer.set({ "verified.aadharVerified": false, "kycInfo.aadharBackImage": customerDetailsDto.aadharBackImage });
      }
      if (customerDetailsDto.gstinImage) {
        existingCustomer.set({ "verified.gstinVerified": false, "kycInfo.gstinImage": customerDetailsDto.gstinImage });
      }
      if (customerDetailsDto.panImage) {
        existingCustomer.set({ "verified.panVerified": false, "kycInfo.panImage": customerDetailsDto.panImage });
      }
      if (customerDetailsDto.otherBackImage || customerDetailsDto.otherFrontImage) {
        existingCustomer.set({ "verified.otherVerified": false, "kycInfo.otherFrontImage": customerDetailsDto.otherFrontImage, "kycInfo.otherBackImage": customerDetailsDto.otherBackImage });
      }
      if (customerDetailsDto.passbookImage) {
        existingCustomer.set({ "verified.bankVerified": false, "kycInfo.passbookImage": customerDetailsDto.passbookImage });
      }
      if (customerDetailsDto.gstinNo) {
        existingCustomer.set({ "kycInfo.gstinNo": customerDetailsDto.gstinNo });
      }
      if (customerDetailsDto.panNo) {
        existingCustomer.set({ "kycInfo.panNo": customerDetailsDto.panNo });
      }
      if (customerDetailsDto.aadharNo) {
        existingCustomer.set({ "kycInfo.aadharNo": customerDetailsDto.aadharNo });
      }
      if (customerDetailsDto.otherNo) {
        existingCustomer.set({ "kycInfo.otherNo": customerDetailsDto.otherNo });
      }
      if (customerDetailsDto.otherName) {
        existingCustomer.set({ "kycInfo.otherName": customerDetailsDto.otherName });
      }
      if (customerDetailsDto.upiImage) {
        existingCustomer.set({ "verified.upiVerified": false, "kycInfo.upiImage": customerDetailsDto.upiImage });
      }
      if (customerDetailsDto.upiNumber) {
        // add upi number in setting Customer
        const settingCustomer = await this.settingCustomerModel.findOne({ customerid: ObjectId(customerid) });
        if (settingCustomer) {
          settingCustomer.set({ "upiInfo.upiNumber": customerDetailsDto.upiNumber });
          await settingCustomer.save();
        }
      }
      const updatedRecord = await existingCustomer.save();

      if (existingCustomer) {
        await PushNotification(`${existingCustomer.deviceInfo.deviceToken}`, "KYC Sent for verification  🧐", `${existingCustomer.firmName}, your KYC details have sent for verification in Gajra Gro + Loyalty .`, "Profile");
      }

      return updatedRecord;
      // return await this.customerModel
      //   .findOneAndUpdate({ _id: ObjectId(customerid) }, customerDetailsDto, {
      //     new: true,
      //     upsert: true,
      //     setDefaultsOnInsert: false,
      //   })
      //   .lean();
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async surveyUpdate(req: Request, surveyDataDto: CustomerSurveyDataDTO): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers);
      await this.customerModel.findByIdAndUpdate(
        authInfo._id,
        {
          $push: {
            surveyData: surveyDataDto.surveyData,
          },
        },
        { new: true, useFindAndModify: false }
      )
        .then(async (surveyData) => {
          return surveyData;
        })
        .catch((err) => {
          throw new BadRequestException(err);
        });
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  public async updateBankInfo(req: Request, bankInfoDto: BankInfoDTO): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers);
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(authInfo._id) },
        {
          $set: {
            bankInfo: bankInfoDto,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: false }
      )
        .lean();
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  async getCustomerBankInfo(id: any): Promise<any> {
    try {
      const data = await this.settingCustomerModel
        .aggregate([
          { $match: { customerid: ObjectId(id) } },
          {
            $project: {
              _id: 1,
              accountNo: { $ifNull: ["$bankInfo.accountNo", ""] },
              holderName: { $ifNull: ["$bankInfo.holderName", ""] },
              accountType: { $ifNull: ["$bankInfo.accountType", ""] },
              bankName: { $ifNull: ["$bankInfo.bankName", ""] },
              branch: { $ifNull: ["$bankInfo.branch", ""] },
              ifsc: { $ifNull: ["$bankInfo.ifsc", ""] },
              image: { $ifNull: ["$bankInfo.image", ""] },
              upiNumber: { $ifNull: ["$upiInfo.upiNumber", ""] },
              upiHolderName: { $ifNull: ["$upiInfo.upiHolderName", ""] },
              upiVerified: { $ifNull: ["$upiInfo.verified", false] },
              verified: { $ifNull: ["$bankInfo.verified", false] },
            },
          },
          { $limit: 1 },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetCustomerInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        "error while getting customer details" + e
      );
    }
  };

  public async updateProfileImage(customerAvatarDto: CustomerAvatarDto, customerid): Promise<any> {
    try {
      return await this.customerModel.findOneAndUpdate({ _id: ObjectId(customerid) }, customerAvatarDto, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: false,
      })
        .lean();
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  public async loyaltyDashboard(customerid: any): Promise<any> {
    try {
      return await this.getCustomerBankInfo(customerid);
    } catch (err) {
      throw new BadRequestException(err);
    }
  };

  // public async bulkCustomerInsert(createCustomerDto: CreateCustomerDto[]): Promise<any> {
  public async bulkCustomerInsert(): Promise<any> {
    const saltOrRounds = 10;
    await axios.get('https://gajragears.fieldkonnect.io/api/allCustomersToGajraMlp').then(async (response: any) => {
      if (response?.data?.status === 'success') {
        const mappedArray = await Promise.all(response?.data?.data.map(async (customer: any, index: number) => {
          const existcustomer = await this.customerModel.findOne({ mobile: customer.mobile }).select('_id').exec()
          const executive = await this.userModel.findOne({ mobile: customer.executive }).select('_id').exec()
          if (existcustomer === null) {

            const createdby = await this.userModel.findOne({ mobile: customer.createdby }).select('_id').exec()
            customer.createdBy = createdby._id
            customer.userAssign = { userid: executive._id }
            customer.password = await bcrypt.hash(customer.password, saltOrRounds);
            if (!customer.email) {
              delete customer['email']
            }
            delete customer['executive']
            delete customer['createdby']
            const refno = await this.getNewRefNoCustomer()
            await this.customerModel.create({ ...customer, refno: refno }, function (err, doc) {
              return doc
            })
          }
          // else {
          //   await this.customerModel.findOneAndUpdate({ mobile: customer.mobile },
          //     {
          //       $set: {  userAssign: { userid: executive._id } },
          //     },
          //     { new: true, setDefaultsOnInsert: false }
          //   )
          //     .lean();
          // }
        })
        );
      }
    })
      .catch((error) => {
        console.log('error', error);
        throw new BadRequestException(error);
      });
  };

  public async checkCustomerExist(email: string, mobile: any) {
    const user = await this.customerModel.findOne({ $or: [{ email: email }, { mobile: mobile }] })
      .select("_id");
    return (!user) ? true : false
  };

  public async filterCustomerExist(data: Array<CustomerDto>) {
    return Promise.all(data.filter(async (customer) => {
      let existrow = await this.checkCustomerExist(customer.email, customer.mobile)
      return existrow === false;
    }).map(function (customer) {
      return customer;
    })
    )
  };

  public async customerUploadFromFile(data: any) {
    return await Promise.all(data.map(async (customer) => {
      this.customerModel.findOneAndUpdate({ mobile: customer.mobile }, { $set: { firmName: customer.firmName, contactPerson: customer.contactPerson, phoneCode: customer.phoneCode, mobile: customer.mobile, customerType: customer.mobile, password: customer.password, address: { address: customer.address, postalCode: customer.postalCode, city: customer.city, state: customer.state, country: 'India' } } }, { new: true, useFindAndModify: false, upsert: true }).then((result) => {
        return result;
      });
    }))
  };

  public async signupFromGajraMlp(data): Promise<any> {
    await axios.post('https://gajragears.fieldkonnect.io/api/signupFromGajraMlp', data).then(async (response: any) => {
      return response
    })
      .catch((error) => {
        throw new BadRequestException(error);
      });
  };

  public async welcomeTransactionsPoints(data, points): Promise<any> {
    const refno = await this.getNewRefNoTransaction();
    const customer = await this.customerModel.findOne({ _id: data._id });

    this.transactionModel.create({ customeType: customer.customerType, customerid: data._id, points: points, pointType: 'Welcome Point', transactionType: 'Cr', refno: refno }, function (err, doc) {
      return doc
    })
  };

  public async welcomePointsSetting() {
    return await this.projectSettingModel.findOne({}).select('points').exec()
  };

  public async hasSeenWelcome(customerid: any): Promise<any> {
    try {
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: customerid }, { $set: { "points.has_seen_welcome": true } }, { new: true, useFindAndModify: false, upsert: true }).then((setting) => {
        if (!setting) throw new BadRequestException('Error in Seen Welcome');
        return setting;
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  public async bulkCustomerUpdate(): Promise<any> {
    const customers = await this.customerModel.find().select('mobile').exec();
    const mappedArray = await Promise.all(customers.map(async (customer: any) => {
      await this.customerModel.findOneAndUpdate({ _id: ObjectId(customer._id) },
        {
          $set: { userAssign: {} },
        },
        { new: true, setDefaultsOnInsert: false }
      )
        .lean();
      return customer;
    })
    );
    return customers
    // const saltOrRounds = 10;
    // await axios.get('https://gajragears.fieldkonnect.io/api/allCustomersToGajraMlp').then(async (response: any) => {
    //   if (response?.data?.status === 'success') {
    //     const mappedArray = await Promise.all(response?.data?.data.map(async (customer: any) => {
    //       const createdby = await this.userModel.findOne({ mobile: customer.createdby }).select('_id').exec()
    //       const executive = await this.userModel.findOne({ mobile: customer.executive }).select('_id').exec()
    //       customer.createdBy = createdby._id
    //       customer.userAssign = [{ userid: executive._id }]
    //       await this.customerModel.findOneAndUpdate({ mobile: customer.mobile },
    //         {
    //           $set: {
    //             createdBy: createdby._id,
    //             userAssign: [{ userid: executive._id }],
    //             mobile: customer.mobile10
    //           },
    //         },
    //         { new: true }
    //       )
    //         .lean();
    //       return customer;
    //     })
    //     );
    //     return mappedArray
    //   }
    // })
    //   .catch((error) => {
    //     console.log('error', error);
    //     throw new BadRequestException(error);
    //   });
  };

  public async bankAccountVerified(customerIdDTO: CustomerIdDTO): Promise<any> {
    try {
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(customerIdDTO.customerid) },
        {
          $set: {
            "bankInfo.verified": true,
          },
        },
        { new: true, useFindAndModify: false }
      )
        .then(async (setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          const findCustomer = await this.settingCustomerModel.aggregate([
            { $match: { customerid: ObjectId(customerIdDTO.customerid) } },
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
          if (findCustomer.length > 0) {
            await PushNotification(`${findCustomer[0].deviceToken}`, "Payee is Approved ✅", `${findCustomer[0].firmName}, your payee is approved`, "Neft");
          }
          return setting;
        });
    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  async getCustomersDropDown(): Promise<any> {
    try {

      const data = await this.customerModel.aggregate([
        {
          $lookup: {
            from: "redemptions",
            localField: "_id",
            foreignField: "customerid",
            pipeline: [
              { $project: { _id: 1, points: 1 } },
            ],
            as: "redemptionInfo",
          },
        }
        ,
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $ifNull: ["$firmName", "$contactPerson"] },
                "_",
                { $ifNull: ["$mobile", ""] },
              ],
            },
            value: { $ifNull: ["$_id", ""] },

            panVerified: { $ifNull: ["$verified.panVerified", false] },
            aadharVerified: { $ifNull: ["$verified.aadharVerified", false] },
            otherVerified: { $ifNull: ["$verified.otherVerified", false] },
            bankVerified: { $ifNull: ["$verified.bankVerified", false] },
            totalRedemption: {
              $ifNull: [
                { $sum: "$redemptionInfo.points" },
                0
              ]
            },

          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException('error while getting country' + e);
    }
  };

  public async updateUpiInfo(upiInfoDto: UpiInfoDTO): Promise<any> {
    try {
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(upiInfoDto.customerid) },
        {
          $set: {
            upiInfo: {
              upiNumber: upiInfoDto.upiNumber,
              upiHolderName: upiInfoDto.upiHolderName,
              customerid: ObjectId(upiInfoDto.customerid)
            },
            customerid: ObjectId(upiInfoDto.customerid)
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: false }
      )
        .lean();
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  public async customerUpiVerified(upiVerifiedDTO: UpiVerifiedDTO): Promise<any> {
    try {
      this.customerModel.findOneAndUpdate({ _id: ObjectId(upiVerifiedDTO.customerid) }, { $set: { "verified.upiVerified": true } }, { new: true, useFindAndModify: false, upsert: true })
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(upiVerifiedDTO.customerid) },
        { $set: { "upiInfo.verified": true } },
        { new: true, useFindAndModify: false }
      )
        .then((setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          return setting;
        });

    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  public async clearUpiInfo(customerIdDTO: CustomerIdDTO): Promise<any> {
    try {
      await this.customerModel.findOneAndUpdate({ _id: ObjectId(customerIdDTO.customerid) }, { $set: { "verified.upiVerified": false } }, { new: true, useFindAndModify: false, upsert: true })
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(customerIdDTO.customerid) },
        {
          $set: {
            upiInfo: {}
          },
        },
        { new: true, useFindAndModify: false }
      )
        .then((setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          return setting;
        });
    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  public async clearBankInfo(customerIdDTO: CustomerIdDTO): Promise<any> {
    try {
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(customerIdDTO.customerid) },
        {
          $set: {
            bankInfo: {}
          },
        },
        { new: true, useFindAndModify: false }
      )
        .then(async (setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          const findCustomer = await this.customerModel.findOne({ _id: ObjectId(customerIdDTO.customerid) })
          if (findCustomer && findCustomer.deviceInfo.deviceToken) {
            const token = findCustomer.deviceInfo.deviceToken

            await PushNotification(`${token}`, `Payee is Rejected 🚫`, `${findCustomer.firmName}, your payee is rejected.`, "Neft");

          }
          return setting;
        });
    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  public async getNewRefNoCustomer(): Promise<number> {
    const customer = await this.customerModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (customer && customer.refno) ? customer.refno + 1 : 1;
  };

  public async getNewRefNoTransaction(): Promise<number> {
    const transaction = await this.transactionModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (transaction && transaction.refno) ? transaction.refno + 1 : 1;
  };

  async getCustomerOtpLog(paginationDto: PaginationRequestDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 1000
      const data = await this.otpLogModel.aggregate([
        // {
        //   $project: {
        //     _id: 1,
        //     createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" } },
        //     mobile: { $toInt: "$mobile" },
        //   },
        // },
        {
          $lookup: {
            from: "customers",
            localField: "mobile",
            foreignField: "mobile",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1, deviceInfo: 1, loginAt: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } },
            mobile: { $ifNull: ["$mobile", ""] },
            otp: { $ifNull: ["$otp", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
            state: { $ifNull: ["$customerInfo.address.state", ""] },
            city: { $ifNull: ["$customerInfo.address.city", ""] },
            address: { $ifNull: ["$customerInfo.address.address", ""] },
            postalCode: { $ifNull: ["$customerInfo.address.postalCode", ""] },
            appVersion: { $ifNull: ["$customerInfo.deviceInfo.appVersion", ""] },
            deviceType: { $ifNull: ["$customerInfo.deviceInfo.deviceType", ""] },
            deviceName: { $ifNull: ["$customerInfo.deviceInfo.deviceName", ""] },
            loginAt: { $ifNull: ["$customerInfo.loginAt", ""] },
          },
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
        { $sort: { createdAt: -1 } },
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
      ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetAllCustomerDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException("error while getting customer details" + e);
    }
  };

  public async bulkCustomerDelete(customerIdDTO: CustomerIdArrayDTO): Promise<any> {
    const mappedArray = await Promise.all(customerIdDTO.customerids.map(async (customer: any) => {
      await this.transactionModel.deleteMany({ customerid: ObjectId(customer) })
      await this.settingCustomerModel.deleteMany({ customerid: ObjectId(customer) })
      return await this.customerModel.findOneAndDelete(ObjectId(customer))
    })
    );
    return mappedArray
  };

  public async remainingCustomerWelcomePoints(customerIdDTO: CustomerIdArrayDTO): Promise<any> {
    const refno = await this.getNewRefNoTransaction();
    const mappedArray = await Promise.all(customerIdDTO.customerids.map(async (customer: any, index) => {
      let customerType = await this.customerModel.findOne({ _id: customer })
      return { customerType: customerType.customerType, customerid: ObjectId(customer), points: 50, pointType: 'Welcome Point', transactionType: 'Cr', refno: refno + index }
    })
    );
    if (Array.isArray(mappedArray) && mappedArray.length) {
      const insertedcoupons = await this.transactionModel.insertMany(mappedArray).then((result) => {
        return result;
      })
        .catch(err => {
          throw new InternalServerErrorException(err);
        });
      return insertedcoupons
    }
    return new GetCustomerInfoDto(mappedArray);
  };

  public async kycVerified(kycVerifiedDTO: KycVerifiedDTO): Promise<any> {
    try {

      return await this.customerModel.findOneAndUpdate({ _id: ObjectId(kycVerifiedDTO.customerid) },
        {
          $set: { [kycVerifiedDTO.verifiedTo]: true }
        },
        { new: true, useFindAndModify: false }
      )
        .then(async (setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          const findCustomer = await this.customerModel.findOne({ _id: ObjectId(kycVerifiedDTO.customerid) })
          if (findCustomer && findCustomer.deviceInfo.deviceToken) {
            const token = findCustomer.deviceInfo.deviceToken

            let stringValue = "";
            if (kycVerifiedDTO.verifiedTo == "verified.addressVerified") {
              stringValue = "address";

            } else if (kycVerifiedDTO.verifiedTo == "verified.panVerified") {
              stringValue = "pan";
            } else if (kycVerifiedDTO.verifiedTo == "verified.gstinVerified") {
              stringValue = "gst";
            } else if (kycVerifiedDTO.verifiedTo == "verified.aadharVerified") {
              stringValue = "aadharVerified";
            } else if (kycVerifiedDTO.verifiedTo == "verified.bankVerified") {
              stringValue = "bankVerified";
            } else if (kycVerifiedDTO.verifiedTo == "verified.upiVerified") {
              stringValue = "upiVerified";
              // update in setting customer
              await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(kycVerifiedDTO.customerid) },
                {
                  $set: {
                    "upiInfo.verified": true
                  },
                },
                { new: true, useFindAndModify: false }
              )
                .then((setting) => {
                  if (!setting)
                    throw new BadRequestException("Customer Info Not Exist");
                  return setting;
                });
            }

            await PushNotification(`${token}`, ` KYC is Approved ✅`, `${findCustomer.firmName}, your KYC Document ${stringValue} is Approved `, "Profile");

          }
          return setting;
        });
    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  public async kycRejected(kycRejectDTO: KycRejectDTO): Promise<any> {
    try {
      var updateDocs = {}
      switch (kycRejectDTO.kycdocs) {
        case 'gstin':
          updateDocs = { 'kycInfo.gstinNo': '', 'kycInfo.gstinImage': '' }
          break;
        case 'pan':
          updateDocs = { 'kycInfo.panNo': '', 'kycInfo.panImage': '' }
          break;
        case 'aadhar':
          updateDocs = { 'kycInfo.aadharNo': '', 'kycInfo.aadharFrontImage': '', 'kycInfo.aadharBackImage': '' }
          break;
        case 'other':
          updateDocs = { 'kycInfo.otherNo': '', 'kycInfo.otherName': '', 'kycInfo.otherFrontImage': '', 'kycInfo.otherBackImage': '' }
          break;
        case 'bank':
          updateDocs = { 'kycInfo.passbookImage': '' }
          break;
        case 'upi':
          {
            updateDocs = { 'kycInfo.upiImage': '' }
            await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(kycRejectDTO.customerid) },
              {
                $set: {
                  "upiInfo.upiNumber": "",
                  "upiInfo.upiHolderName": "",
                  "upiInfo.verified": false
                },
              },
              { new: true, useFindAndModify: false }
            )
              .then((setting) => {
                if (!setting)
                  throw new BadRequestException("Customer Info Not Exist");
                return setting;
              });
            await this.customerModel.findOneAndUpdate({ _id: ObjectId(kycRejectDTO.customerid) }, { $set: { "verified.upiVerified": false } }, { new: true, useFindAndModify: false, upsert: true })
          }
          break;
        default:
          break;
      }
      const findCustomer = await this.customerModel.findOne({ _id: ObjectId(kycRejectDTO.customerid) })

      if (findCustomer && findCustomer.deviceInfo) {
        const token = findCustomer.deviceInfo.deviceToken
        try {
          await PushNotification(`${token}`, ` KYC is Rejected 🚫`, `${findCustomer.firmName}, your KYC Document ${kycRejectDTO.kycdocs} is rejected`, "Profile");
        } catch (error) {
          // console.log(error);
        }
      }

      return await this.customerModel.findOneAndUpdate({ _id: ObjectId(kycRejectDTO.customerid) },
        {
          $set: updateDocs
        },
        { new: false, useFindAndModify: false }
      )
        .then((setting) => {
          if (!setting)
            throw new BadRequestException("Customer Info Not Exist");
          return setting;
        });
    } catch (err) {
      throw new BadRequestException("Customer Info Not Exist");
    }
  };

  async getListWithStatus(statusListDto: CustomerListWithStatusDTO): Promise<any> {
    try {
      const data = await this.customerModel
        .aggregate([
          {
            $match: {
              $and: [
                { status: { $in: statusListDto.status } },
              ],
              $or: [
                { firmName: { $regex: statusListDto.search, '$options': 'i' } },
                { contactPerson: { $regex: statusListDto.search, '$options': 'i' } },
                { mobile: { $regex: statusListDto.search, '$options': 'i' } },
              ],
            },
          },
          {
            $project: {
              createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" } },
              _id: 1,
              firmName: { $ifNull: ["$firmName", ""] },
              contactPerson: { $ifNull: ["$contactPerson", ""] },
            },
          },
          { $sort: { createdAt: -1 } },
        ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetAllCustomerDto(data);
    } catch (e) {
      throw new InternalServerErrorException("error while getting customer details" + e);
    }
  };

  async pendingPayee(): Promise<any> {
    try {
      const data = await this.settingCustomerModel.aggregate([
        {
          $match: {
            $or: [
              { "bankInfo.accountNo": { $ne: "" } },
              { "upiInfo.upiNumber": { $ne: "" } },
              { "bankInfo.verified": { $ne: true } },
              { "upiInfo.verified": { $ne: true } },
            ],
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firmName: 1, contactPerson: 1, createdAt: 1 } }
            ],
            as: "customerInfo",
          },
        },
        { $unwind: { "path": "$customerInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$customerInfo.createdAt" } },
            _id: { $ifNull: ["$customerid", ""] },
            firmName: { $ifNull: ["$customerInfo.firmName", ""] },
            contactPerson: { $ifNull: ["$customerInfo.contactPerson", ""] },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
        .exec();
      if (!data) {
        throw new BadRequestException("Data Not Found");
      }
      return new GetAllCustomerDto(data);
    } catch (e) {
      throw new InternalServerErrorException("error while getting customer details" + e);
    }
  };

  async importCustomers(req: Request, createProductDto: CustomersImportDto[]): Promise<any> {
    try {
      // console.log('Starting import with data length:', createProductDto.length);
      // get auth
      const authInfo = await getCustomerAuthInfo(req.headers);
      // console.log('AuthInfo:', authInfo);
      const dataArray = Array.isArray(createProductDto) ? createProductDto : Object.values(createProductDto);
      const mappedArray = await Promise.all(dataArray.map(async (customer: any) => {
        let userAssign = {}
        if (customer.email.trim() == "") {
          delete customer.email; // Remove empty email 
        }

        if (customer.assignUser) {
          const [firstName, lastName] = customer.assignUser.split(" ");

          const findUser = await this.userModel.aggregate([
            {
              $match: {
                firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
              }
            }
          ]);
          if (customer.firmName == "Ajinkya motors-Yavatmal") {
            console.log(findUser)
          }
          userAssign = {
            userid: findUser.length > 0 ? findUser[0]._id : null
          };
        }

        let address: any = {
          address: customer.address,
          postalCode: customer.postalCode,
          city: customer.city,
          state: customer.state,
          country: customer.country,
        }
        var existUser: CustomerViewInterface = {}
        if (customer.mobile) {
          // console.log('Searching by mobile:', customer.mobile);
          existUser = await this.customerModel.findOne({ mobile: customer.mobile }).select('_id').exec()
          // console.log('Found by mobile:', existUser);
        }
        if (customer.email && customer.email.trim() !== "") {
          existUser = await this.customerModel.findOne({ email: customer.email.trim() }).select('_id').exec();
        }
        const createdBy = await this.userModel.findOne({ _id: ObjectId(authInfo._id) }).select('_id').exec()
        customer.createdBy = createdBy._id
        if (customer.createdBy) {
          // console.log('Processing createdBy:', customer.createdBy);
          const createdBy = await this.userModel.findOne({ _id: ObjectId(customer.createdBy) }).select('_id').exec()
          // console.log('Found createdBy:', createdBy);
          if (createdBy) {
            customer.createdBy = createdBy._id
            // console.log('Set createdBy:', customer.createdBy);
          }
          else {
            await ['createdBy'].forEach(e => delete customer[e]);
          }
        }
        if (customer._id) {
          // console.log('Searching by _id:', customer._id);
          existUser = await this.customerModel.findOne({ _id: ObjectId(customer._id) }).select('_id').exec();
          // console.log('Found by _id:', existUser);
        }

        let userData: any = {};
        if (existUser && existUser != null) {
          // console.log('Finding userData for _id:', existUser._id);
          userData = await this.customerModel.findOne({ _id: ObjectId((existUser._id).toString()) });
          // console.log('Found userData:', userData ? 'yes' : 'no');
        }

        if (existUser && existUser != null) {
          // console.log('Processing address for existUser:', existUser._id);
          address = {
            address: customer.address ? customer.address : (userData.address ? userData.address.address : ""),
            postalCode: customer.postalCode ? customer.postalCode : (userData.address ? userData.address.postalCode : ""),
            city: customer.city ? customer.city : (userData.address ? userData.address.city : ""),
            state: customer.state ? customer.state : (userData.address ? userData.address.state : ""),
            country: customer.country ? customer.country : (userData.address ? userData.address.country : ""),
          }
        }

        await ['address', 'postalCode', 'city', 'state', 'country'].forEach(e => delete customer[e]);
        var firstTimeLogin = true;
        if (existUser && existUser != null) {
          // console.log('Checking firstTimeLogin for _id:', existUser._id);
          const findUser = await this.customerModel.findOne({ _id: existUser._id })
          // console.log('Found user for firstTimeLogin:', findUser ? 'yes' : 'no');
          if (findUser && findUser.firstTimeLogin == false) {
            firstTimeLogin = false
          } else {
            firstTimeLogin = true
          }
        }
        const toInsertUser = { ...customer, address: address, firstTimeLogin: firstTimeLogin, userAssign: userAssign }
        if (existUser && existUser != null) {
          // console.log('Processing existing user update for _id:', existUser._id);
          const user = await this.customerModel.findOne({ _id: existUser._id })
          // console.log('Found user for update:', user ? 'yes' : 'no');
          let addharNo = customer.aadharNo ? customer.aadharNo : (user.kycInfo ? user.kycInfo.aadharNo : "");
          let panNo = customer.panNo ? customer.panNo : (user.kycInfo ? user.kycInfo.panNo : "");

          if (customer.remark) {
            let remark = await this.remarkModel.findOne({ remark: customer.remark });
            if (remark && remark._id) {
              customer.remarkid = remark._id;
            } else if (user.remarkid && ObjectId.isValid(user.remarkid)) {
              customer.remarkid = user.remarkid;
            } else {
              customer.remarkid = null; // Explicitly set to null instead of deleting
            }
          } else if (user.remarkid) {
            customer.remarkid = user.remarkid;
          } else {
            customer.remarkid = null;
          }


          if (customer.AccountHolderName || customer.IFSCCode || customer.accountNo || customer.BankName || customer.bankVee) {
            // console.log('Processing bank info for _id:', existUser._id);
            const findSetting = await this.settingCustomerModel.findOne({ customerid: (existUser._id).toString() })
            // console.log('Found bank settings:', findSetting ? 'yes' : 'no');

            let bankInfoObj = {};
            let upiInfo = {};

            if (findSetting && findSetting != null) {
              bankInfoObj = {
                holderName: customer.AccountHolderName ? customer.AccountHolderName : (findSetting.bankInfo ? findSetting.bankInfo.holderName : ""),
                ifsc: customer.IFSCCode ? customer.IFSCCode : (findSetting.bankInfo ? findSetting.bankInfo.ifsc : ""),
                accountNo: customer.accountNo ? customer.accountNo : (findSetting.bankInfo ? findSetting.bankInfo.accountNo : ""),
                bankVee: customer.bankVee ? customer.bankVee : (findSetting.bankInfo ? findSetting.bankInfo.verified : false),
                bankName: customer.BankName ? customer.BankName : (findSetting.bankInfo ? findSetting.bankInfo.bankName : ""),
              }
            } else {
              bankInfoObj = {
                holderName: customer.AccountHolderName ? customer.AccountHolderName : (findSetting ? findSetting.bankInfo.holderName : ""),
                ifsc: customer.IFSCCode ? customer.IFSCCode : (findSetting ? findSetting.bankInfo.ifsc : ""),
                accountNo: customer.accountNo ? customer.accountNo : (findSetting ? findSetting.bankInfo.accountNo : ""),
                bankVee: customer.bankVee ? customer.bankVee : (findSetting ? findSetting.bankInfo.verified : false),
                bankName: customer.BankName ? customer.BankName : (findSetting ? findSetting.bankInfo.bankName : ""),
              }
              if (customer.UPIId) {
                upiInfo = {
                  upiNumber: customer.UPIId ? customer.UPIId : (findSetting ? findSetting.upiInfo.upiNumber : ""),
                }
              }

              const bank = new this.settingCustomerModel({
                ...bankInfoObj,
                customerid: new ObjectId((existUser._id).toString()),
              });
              bank.save()
            }

            await this.settingCustomerModel.findOneAndUpdate({ customerid: new ObjectId((existUser._id).toString()) }, {
              $set: { bankInfo: bankInfoObj, upiInfo: upiInfo },
            },
              { new: true, setDefaultsOnInsert: false })
          }

          if (customer.createdBy) {
            // console.log('Final createdBy check for _id:', existUser._id);
            const createdBy = await this.userModel.findOne({ _id: ObjectId(customer.createdBy) }).select('_id').exec();
            // console.log('Found final createdBy:', createdBy ? 'yes' : 'no');

            if (createdBy) {
              customer.createdBy = createdBy._id;
            } else {
              customer.createdBy = user.createdBy;
            }
          }
          return await this.customerModel.findOneAndUpdate({ _id: existUser._id },
            {
              $set: { ...toInsertUser, "kycInfo.addharNo": addharNo, "kycInfo.panNo": panNo, remarkid: customer.remarkid, address: address, createdBy: customer.createdBy },
            },
            { new: true, setDefaultsOnInsert: false }
          )
            .lean();
        }
        else {
          // console.log('Creating new customer:', customer.mobile || customer.email);
          return await this.customerModel.create(toInsertUser, function (err, doc) {
            return doc
          })
        }
      })
      );
      return new GetAllCustomerDto(mappedArray);
    }
    catch (e) {
      console.error('Error in importCustomers:', e);
      // console.error('Error stack:', e.stack);
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  public async deleteBenifresiry(beneficiaryId) {
    try {
      const response = await axios.delete(
        "https://api.cashfree.com/payout/beneficiary?beneficiary_id=" + beneficiaryId,
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
      console.error(response.data);
    } catch (error) {
      console.error("Error initiating transfer:", error);
    }
  }

  public async updateCustomerBankInfo(bankInfoDto: BankInfoDTO, customerid, upiInfo: UpiInfoDTO): Promise<any> {
    try {
      let customerData = await this.customerModel.findOne({ _id: ObjectId(customerid) });
      if (customerData?.benifresiry?.bankAccountBeneficiaryId) {
        await this.deleteBenifresiry(customerData.benifresiry.bankAccountBeneficiaryId);
      }
      if (customerData?.benifresiry?.upiBeneficiaryId) {
        await this.deleteBenifresiry(customerData.benifresiry.upiBeneficiaryId);
      }
      if (upiInfo?.image) {
        // add image in customer model kycInfo 
        await this.customerModel.findOneAndUpdate({ _id: ObjectId(customerid) }, { $set: { "kycInfo.upiImage": upiInfo.image, "benifresiry": {} } }, { new: true, useFindAndModify: false })
      }
      else {
        await this.customerModel.findOneAndUpdate({ _id: ObjectId(customerid) }, { $set: { "benifresiry": {} } }, { new: true, useFindAndModify: false })
      }
      const settingData = await this.settingCustomerModel.findOne({ customerid: ObjectId(customerid) });
      let upiObj = {
        upiNumber: upiInfo?.upiNumber,
        customerid: upiInfo?.customerid,
        verified: settingData?.upiInfo?.verified
      }
      return await this.settingCustomerModel.findOneAndUpdate({ customerid: ObjectId(customerid) }, { $set: { bankInfo: bankInfoDto, upiInfo: upiObj } }, { new: true, upsert: true, setDefaultsOnInsert: false })
        .lean();
    } catch (err) {
      throw new BadRequestException("Invalid email or password.");
    }
  };

  async addRemark(addRemarkDTO: AddRemarkDTO): Promise<any> {
    try {
      const findCustomer = await this.customerModel.find(
        { _id: addRemarkDTO.customerid });
      if (findCustomer.length != 0) {
        return await this.customerModel.findOneAndUpdate({ _id: ObjectId(addRemarkDTO.customerid) }, { remarkid: addRemarkDTO.remarkid }, { new: true, useFindAndModify: false })
      } else {
        throw new BadRequestException("Customer not found");
      }
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

}
