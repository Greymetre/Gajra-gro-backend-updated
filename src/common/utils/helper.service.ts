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
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { getS3BucketName, getS3Client } from './s3-client';


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
    const fileStream = fs.createReadStream(file.path);
    const fileName = `uploaded/${folderName}/${file.filename}`;

    const uploadParams = {
      Bucket: getS3BucketName(),
      Key: fileName,
      Body: fileStream,
      ContentType: file.mimetype
    };

    try {
      const data = await getS3Client().upload(uploadParams).promise();
      console.log(`File uploaded successfully at ${data.Location}`);
      return data.Location;
    } catch (error) {
      console.error(`Error uploading file ${file.filename}:`, error);
      throw error;
    }
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

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
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
      await axios.get('https://gajragears.fieldkonnect.io/api/allUsersToGajraMlp').then(async (response: any) => {
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
            try {
              const doc = await this.customerModel.create({ ...customer, refno: refno });

              const { points } = await this.welcomePointsSetting();

              if (points.welcome && doc.customerType === "Mechanic") {
                await this.welcomeTransactionsPoints(doc, points.welcome);
              }

              return doc;
            } catch (err) {
              console.error(err);
              throw new Error("Error creating customer");
            }
          }

        })
        );
      }
    })
      .catch((error) => {
        console.log('error', error);
      });
  };

  public async checkCashfreeOrderStatus() {
    this.redemptionModel.find({ status: "UNDER PROCESS" }).then(async (redemptions) => {
      for await (let redemption of redemptions) {
        try {
          const orderStatus = await axios.get(`https://api.cashfree.com/payout/transfers?transfer_id=${redemption._id}`, {
            headers: {
              'x-client-id': process.env.CASHFREE_CLIENT_ID,
              'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
              "X-Api-Version": "2024-01-01",
              "Content-Type": "application/json"
            },
          });
          if (orderStatus.data.status == "SUCCESS") {
            await this.redemptionModel.findByIdAndUpdate(redemption._id, { status: "Success", 'payment.transactionID': orderStatus.data.transfer_utr, 'payment.paymentDate': orderStatus.data.added_on, 'payment.fundSource': orderStatus.data.fundsource_id }, { new: true, useFindAndModify: false });
          }
          if (orderStatus.data.status == "Rejected" || orderStatus.data.status == "FAILED" || orderStatus.data.status == 'REJECTED') {
            await this.redemptionModel.findByIdAndUpdate(redemption._id, { status: "Rejected","payment.details":orderStatus?.data?.message ? orderStatus?.data?.message : null}, { new: true, useFindAndModify: false });
          }
          console.log(orderStatus.data);
        } catch (error) {
          console.log(error);

        }
      }
    })
  }
}


export const imageName = async (req, images) => {
  try {
    let uploadedUrls = []
    if (images != undefined && images != "undefined" && images.length > 0) {
      const folderName = req.url.split("/")[3];
      uploadedUrls = await Promise.all(
        images.map(async (file) => {
          if (file.mimetype != 'image/jpeg' && file.mimetype != 'image/png') {
            throw new Error('Only JPEG and PNG files are allowed.');
          }
          const url = await UploadFilesHelper.uploadToS3(file, folderName);
          fs.unlinkSync(file.path);
          const relativePath = `uploaded/${folderName}/${url.split('/').pop()}`;
          return relativePath;
        })
      );
    }


    return uploadedUrls;
  } catch (error) {
    console.log(error, 4534)
    throw new Error('Only JPEG and PNG files are allowed.');
  }


};

export const uploadFolderToS3 = async (folderPath: string, s3Bucket: string, s3Folder: string) => {
  try {
    const bucketName = s3Bucket || getS3BucketName();

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
  const params = {
    Bucket: getS3BucketName(),
    Prefix: prefix,
  };

  try {
    const filteredFiles = [];
    let isTruncated = true;
    let keyMarker;
    let versionIdMarker;

    while (isTruncated) {
      const data = await getS3Client().listObjectVersions({
        ...params,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      }).promise();

      // Filter images by file type and timestamp
      const images = data.Versions?.filter(file => {
        // console.log(`Checking File: ${file.Key}, LastModified: ${file.LastModified}`);
        return (
          file.Key?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) &&
          file.LastModified &&
          file.LastModified >= startTime &&
          file.LastModified <= endTime
        );
      });

      if (images && images.length > 0) {
        for (const file of images) {
          console.log(`Deleting File: ${file.Key}, VersionId: ${file.VersionId}, LastModified: ${file.LastModified}`);
          await getS3Client().deleteObject({
            Bucket: getS3BucketName(),
            Key: file.Key,
            VersionId: file.VersionId, // Delete specific version
          }).promise();
        }
      }

      // images?.forEach(file => {
      //     if (file.Key && file.VersionId) {
      //         filteredFiles.push({
      //             Key: file.Key,
      //             VersionId: file.VersionId,
      //         });
      //     }
      // });

      isTruncated = data.IsTruncated || false;
      keyMarker = data.NextKeyMarker;
      versionIdMarker = data.NextVersionIdMarker;
    }

    console.log(`${filteredFiles.length} Filtered Images:`, filteredFiles);
    return filteredFiles;
  } catch (error) {
    console.error(`Error listing images: ${error.message}`);
    throw error;
  }
};
