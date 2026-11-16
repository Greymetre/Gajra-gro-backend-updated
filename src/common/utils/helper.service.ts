import * as gcm from 'node-gcm';
var fs = require('fs');
import { promises as fsPromises } from 'fs';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Customer, CustomerDocument } from '../../entities/customer.entity';
import { User, UserDocument } from '../../entities/users.entity';
import { Transaction, TransactionDocument } from '../../entities/transaction.entity';
import { SettingProject, SettingProjectDocument, } from "src/entities/setting.project.entity";
import { Redemption, RedemptionDocument } from 'src/entities/redemption.entity';

const ObjectId = require('mongoose').Types.ObjectId;

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuid } from 'uuid';
import axios from "axios";
import { getCashfreeTransferStatus } from "./cashfree-payout";
import { sfaRequestConfig, sfaUrl } from './sfa-client';
import { syncCustomersFromSfa } from './sfa-customer-sync';
import { syncAllProductPricesToSfa } from './sfa-product-sync';
import { syncLocationsFromSfa } from './sfa-location-sync';
import { refreshMechanicCategories } from './mechanic-category';
import { Country, CountryDocument } from '../../entities/country.entity';
import { State, StateDocument } from '../../entities/state.entity';
import { District, DistrictDocument } from '../../entities/district.entity';
import { City, CityDocument } from '../../entities/city.entity';
import { Product, ProductDocument } from '../../entities/product.entity';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { getS3BucketName, getS3Client } from './s3-client';
import { uploadImages, uploadStoredFile } from './storage-upload';


import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert('./gajra-gears-gro-mechanic-firebase-adminsdk-blj63-12862efd0c.json'), // Provide the path to your Firebase JSON file
});

export class UploadFilesHelper {
  static customFileName(req, file, cb) {
    // const uniqueSuffix =new Date() + '_' + Math.round(Math.random() * 1e9);
    const uniqueSuffix = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    }).replace(/[^\d]/g, '') + '_' + Math.round(Math.random() * 1e9);
    let fileExtension = "";
    if (file.mimetype.indexOf("jpeg") > -1) {
      fileExtension = "jpg"
    } else if (file.mimetype.indexOf("png") > -1) {
      fileExtension = "png";
    }
    const originalName = req.url.split("/")[3];
    cb(null, originalName + '_' + uniqueSuffix + "." + fileExtension);
  }

  static destinationPath(req, file, cb) {
    var foldername = req.url.split("/")[3];
    // const dest = `./uploaded/${foldername}`;


    // uploadImageToS3()
    const dest = `./uploaded/${foldername}`;
    // const dest = `./dist/uploaded/${foldername}`;
    fs.access(dest, function (error) {
      if (error) {
        fs.mkdirSync(dest, { recursive: true });
      }
      return cb(null, dest);
    });
  }

  static s3DestinationPath(req, file, cb) {
    const tmpDir = 'uploaded';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  }


  static async uploadToS3(file: Express.Multer.File, folderName: string): Promise<string> {
    return uploadStoredFile(file, folderName);
  }
};

export const RemoveFilesHelper = (file: string) => {
  fs.unlink(file, function (err) {
    if (err && err.code == 'ENOENT') {
      console.info("File doesn't exist, won't remove it.");
    } else if (err) {
      console.error("Error occurred while trying to remove file");
    } else {
      console.info(`removed`);
    }
  });
};


export const removeImageFromFolder = (filePath: string) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(`Failed to delete file: ${err.message}`);
        } else {
          resolve(`File successfully deleted: ${filePath}`);
        }
      });
    } else {
      reject(`File not found: ${filePath}`);
    }
  });
};

export const PushNotification1 = async (deviceToken: string, title: string, body: string, key: string) => {
  let serverKey = process.env.SERVER_KEY
  var sender = new gcm.Sender(serverKey);
  var message = new gcm.Message({
    notification: { title: title, body: body },
    data: {
      "customKey": key,
    },
  });
  sender.send(message, { registrationTokens: [deviceToken] }, function (err, response) {
    if (err) console.error(err);
  });
  return message
  try {
    console.log('Push notification sent successfully!');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const PushNotification = async (
  deviceToken: string,
  title: string,
  body: string,
  key: string,
) => {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      customKey: key,
    }, // Optional custom data
    token: deviceToken, // Fixed: use 'token' instead of 'deviceToken'
  };

  // Customers who never granted notifications have no token saved.
  if (!deviceToken || deviceToken === 'undefined' || deviceToken === 'null') {
    return null;
  }

  // A notification is best-effort: callers run this after their DB work is
  // done, so a push failure (bad token, missing APNs key for iOS, FCM outage)
  // must not turn a successful request into an error for the app.
  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// News Management push: optional image, returns true only when FCM accepted the message.
export const PushNewsNotification = async (
  deviceToken: string,
  title: string,
  body: string,
  imageUrl?: string,
): Promise<boolean> => {
  if (!deviceToken || deviceToken === 'undefined' || deviceToken === 'null') return false;
  const message: admin.messaging.Message = {
    token: deviceToken,
    notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
    // customKey is the app screen opened on tap (Gro app: Notifications list)
    data: { customKey: 'Notifications', type: 'news', title, body, ...(imageUrl ? { image: imageUrl } : {}) },
    ...(imageUrl ? {
      android: { notification: { imageUrl } },
      apns: { payload: { aps: { 'mutable-content': 1 } }, fcmOptions: { imageUrl } },
    } : {}),
  };
  try {
    await admin.messaging().send(message);
    return true;
  } catch (error) {
    console.error('Error sending news notification:', error?.code || error?.message || error);
    return false;
  }
};




@Injectable()
export class CronHelper {

  constructor(
    @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(SettingProject.name) private projectSettingModel: Model<SettingProjectDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(District.name) private districtModel: Model<DistrictDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
  ) { }

  async cronFunction() {
    try {
      const customer = await this.customerModel.aggregate([
        { $match: { kycInfo: { $exists: false } } },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "customerid",
            pipeline: [
              { $project: { _id: 1, points: 1, } },
            ],
            as: "transactionsInfo",
          }
        },
        {
          $project: {
            transactionsInfo: { $ifNull: [{ $sum: '$transactionsInfo.points' }, 0] },
            firmName: { $ifNull: ["$firmName", ""] },
            deviceInfo: { $ifNull: ["$deviceInfo.deviceToken", ""] },
            kycInfo: { $ifNull: ["$kycInfo", {}] },

          }
        }
      ]);
      if (customer.length > 0) {
        for await (let user of customer) {
          if (user.transactionsInfo >= 300) {
            await PushNotification(`${user.deviceInfo}`, `Submit KYC 📰`, `${user.firmName},Submit your KYC Document`, "Profile");

          }
        }
      }
    } catch (error) {

    }
  };


  async cronJobForTransaction() {
    try {

      // await this.transactionModel.updateMany(
      //   { redemStatus: { $exists: false } },  // Find documents where redemBalance doesn't exist
      //   { $set: { redemStatus: 0 } }, // Set redemBalance to the default value
      //   { multi: true }  // Update multiple documents
      // )
      const redemPoint = await this.customerModel.aggregate([
        // {
        //   $match:{_id:ObjectId("641a8521071d00e8f213790d")},
        // }
        {
          $lookup: {
            from: "redemptions",
            localField: "_id",
            foreignField: "customerid",
            pipeline: [
              { $match: { $or: [{ status: "Success" }, { status: "success" }] } },
              { $project: { _id: 1, transactionid: 1, points: 1 } }
            ],
            as: "redemptionInfo",
          }
        },
        {
          $project: {
            _id: 0,
            customerId: { $toString: "$_id" },
            totalPoints: { $sum: "$redemptionInfo.points" },
          }
        }
      ]);

      if (redemPoint.length > 0) {

        for await (let points of redemPoint) {

          if (points.totalPoints != 0) {

            const data = await this.transactionModel.aggregate([
              { $match: { transactionType: "Cr", customerid: ObjectId(points.customerId) } },

              {
                $project: {
                  _id: 1,
                  customerid: { $ifNull: [{ $toString: "$customerid" }, ""] },
                  pointType: { $ifNull: ["$pointType", ""] },
                  redemBalance: {
                    $cond: {
                      if: { $eq: ["$redemStatus", 0] },
                      then: "$points",
                      else: "$redemBalance",
                    }
                  },
                  coupon: { $ifNull: ["$coupon", ""] },
                  transactionid: { $toString: "$_id" },
                  points: { $ifNull: ["$points", 0] },
                  redemStatus: { $ifNull: ["$redemStatus", 0] },
                },
              },
            ]);

            let sumOfPoints = data.reduce((accumulator, currentObject) => {
              return accumulator + currentObject.redemStatus;
            }, 0);

            if (points.totalPoints != sumOfPoints) {

              let targetSum = points.totalPoints > 0 ? points.totalPoints : 0;
              data.forEach(async (currentPoint, index) => {
                let redem = Math.min(currentPoint.points, targetSum);
                // let redemBalance= (index === data.length - 1 )? currentPoint.points-redem : currentPoint.points-redem;

                currentPoint["redemStatus"] = redem,
                  currentPoint["redemBalance"] = index === data.length - 1 ? currentPoint.points - redem : currentPoint.points - redem,

                  targetSum -= redem;
              });


              data.forEach(async (currentPoint) => {
                await this.transactionModel.findByIdAndUpdate(currentPoint._id, { redemStatus: currentPoint.redemStatus, redemBalance: currentPoint.redemBalance }, { new: true, useFindAndModify: false })

              });

            }
          }
        }
      }

    } catch (error) {
    }
  };

  async insertManyUsers(): Promise<any> {
    try {
      const saltOrRounds = 10;
      await axios.get(sfaUrl('allUsersToGajraMlp'), sfaRequestConfig()).then(async (response: any) => {
        if (response.data.data) {
          const mappedArray = await Promise.all(response?.data?.data.map(async (customer: any) => {
            customer.password = await bcrypt.hash(customer.password.toString(), saltOrRounds);
            return customer;
          }));
          mappedArray.forEach(async (userData) => {
            try {
              const findUser = await this.userModel.findOne({
                $or: [
                  { mobile: userData.mobile },
                  { email: userData.email }
                ]
              });


              if (!findUser) {
                await this.userModel.create(userData)
                  .then(result => {
                    console.log('User inserted:', result);
                  })
                  .catch(error => {
                    console.log(error)
                  });
              }
            } catch (error) {
              console.error('Error processing user data:', error);
            }
          });
        }
      }).catch((error) => {
        console.log('error', error);
      });
    } catch (e) {
    }
  };


  public async getNewRefNoCustomer(): Promise<number> {
    const customer = await this.customerModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (customer && customer.refno) ? customer.refno + 1 : 1;
  };

  public async welcomePointsSetting() {
    return await this.projectSettingModel.findOne({}).select('points').exec()
  };
  public async getNewRefNoTransaction(): Promise<number> {
    const transaction = await this.transactionModel.findOne({}).select('refno').sort({ refno: -1 }).exec();
    return (transaction && transaction.refno) ? transaction.refno + 1 : 1;
  };
  public async welcomeTransactionsPoints(data, points): Promise<any> {
    const refno = await this.getNewRefNoTransaction();
    const customer = await this.customerModel.findOne({ _id: data._id });

    this.transactionModel.create({ customeType: customer.customerType, customerid: data._id, points: points, pointType: 'Welcome Point', transactionType: 'Cr', refno: refno }, function (err, doc) {
      return doc
    })
  };

  public async bulkCustomerInsert(): Promise<any> {
    return syncCustomersFromSfa({
      customerModel: this.customerModel,
      userModel: this.userModel,
      getNewRefNo: () => this.getNewRefNoCustomer(),
      onCreated: async (doc) => {
        const { points } = await this.welcomePointsSetting();
        if (points.welcome && doc.customerType === "Mechanic") {
          await this.welcomeTransactionsPoints(doc, points.welcome);
        }
      },
    });
  };

  public async syncProductPricesToSfa(): Promise<any> {
    return syncAllProductPricesToSfa(this.productModel);
  };

  // Country / state / district / city / pincode masters from GG SFA; full = true re-syncs everything
  public async syncLocationsFromSfa(full = true): Promise<any> {
    return syncLocationsFromSfa({
      countryModel: this.countryModel,
      stateModel: this.stateModel,
      districtModel: this.districtModel,
      cityModel: this.cityModel,
    }, full);
  };

  // Platinum / Diamond / Gold / Silver / Bronze of every mechanic (same matrix as the SFA Mechanic Category report)
  public async refreshMechanicCategories(): Promise<any> {
    return refreshMechanicCategories(this.customerModel, this.transactionModel);
  };

  private cashfreeCheckRunning = false;

  private async rejectCashfreeRedemption(redemption: any, reason: string) {
    const updated = await this.redemptionModel.findOneAndUpdate(
      { _id: redemption._id, status: redemption.status },
      { $set: { status: "Rejected", "payment.details": String(reason || '').slice(0, 500), statusUpdatedAt: new Date() } },
      { new: true, useFindAndModify: false },
    );
    if (!updated) return;
    // rejected redemptions do not count against the balance, so the points are returned
    if (updated.transactionid) {
      await this.transactionModel.updateOne({ _id: updated.transactionid }, { $set: { points: 0 } });
    }
    await this.notifyRedemptionCustomer(updated.customerid, " Redemption is Rejected  🚫", "your redemption is rejected");
  }

  private async notifyRedemptionCustomer(customerid: any, title: string, message: string) {
    try {
      const customer: any = await this.customerModel.findById(customerid, { firmName: 1, deviceInfo: 1 }).lean();
      if (customer) await PushNotification(`${customer?.deviceInfo?.deviceToken || ''}`, title, `${customer.firmName || ''}, ${message}`, "Redeem History");
    } catch (error) {
      // notifications are best effort
    }
  }

  // Every minute: settle redemptions whose Cashfree transfer is in process
  public async checkCashfreeOrderStatus() {
    if (this.cashfreeCheckRunning) return;
    this.cashfreeCheckRunning = true;
    try {
      const redemptions = await this.redemptionModel.find({ status: "UNDER PROCESS" }).lean();
      for (const redemption of redemptions) {
        try {
          const transfer = await getCashfreeTransferStatus(String(redemption._id));
          if (!transfer.found) {
            // The transfer call never reached Cashfree. Give in-flight requests time, then return the points.
            const startedAt = new Date((redemption as any).statusUpdatedAt || redemption.createdAt || 0).getTime();
            if (Date.now() - startedAt > 30 * 60 * 1000) {
              await this.rejectCashfreeRedemption(redemption, "Transfer not found at Cashfree");
            }
            continue;
          }
          if (transfer.status === "SUCCESS") {
            const updated = await this.redemptionModel.findOneAndUpdate(
              { _id: redemption._id, status: "UNDER PROCESS" },
              { $set: { status: "Success", statusUpdatedAt: new Date(), 'payment.transactionID': transfer.utr, 'payment.paymentDate': transfer.addedOn, 'payment.fundSource': transfer.fundSource } },
              { new: true, useFindAndModify: false },
            );
            if (updated) await this.notifyRedemptionCustomer(updated.customerid, "Redemption is Success", "your redemption is Success");
          } else if (["FAILED", "REJECTED", "REVERSED"].includes(transfer.status)) {
            await this.rejectCashfreeRedemption(redemption, transfer.description || transfer.status);
          }
          // RECEIVED / PENDING / QUEUED / APPROVAL_PENDING: still in process, check again next minute
        } catch (error) {
          console.error(`Cashfree status check for redemption ${redemption._id} failed: ${error?.message}`);
        }
      }
    } finally {
      this.cashfreeCheckRunning = false;
    }
  }

  // Hourly: a SUCCESS transfer can later be REVERSED by the bank. Recheck the last 7 days of Cashfree payouts.
  public async checkCashfreeReversals() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const redemptions = await this.redemptionModel.find({
      status: "Success",
      'payment.fundSource': { $exists: true, $ne: '' },
      statusUpdatedAt: { $gte: since },
    }).lean();
    for (const redemption of redemptions) {
      try {
        const transfer = await getCashfreeTransferStatus(String(redemption._id));
        if (transfer.found && transfer.status === "REVERSED") {
          await this.rejectCashfreeRedemption(redemption, transfer.description || "Reversed by bank");
        }
      } catch (error) {
        console.error(`Cashfree reversal check for redemption ${redemption._id} failed: ${error?.message}`);
      }
    }
  }
}


export const imageName = uploadImages;

export const uploadFolderToS3 = async (folderPath: string, s3Bucket: string, s3Folder: string) => {
  try {
    const bucketName = getS3BucketName();

    await fsPromises.access(folderPath);
    const files = await fsPromises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      if ((await fsPromises.stat(filePath)).isFile()) {
        const fileStream = fs.createReadStream(filePath);
        const uploadParams = {
          Bucket: bucketName,
          Key: `${s3Folder}/${file}`,
          Body: fileStream,
          ContentType: 'image/jpeg',
        };

        await getS3Client().upload(uploadParams).promise();
        console.log(`Successfully uploaded ${file} to ${bucketName}/${s3Folder}`);
      }
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};


export const listImagesByTimeWithVersions = async (prefix = '', startTime, endTime) => {
  throw new Error('S3 version-based deletion is disabled for R2. Use explicit object keys.');
};
