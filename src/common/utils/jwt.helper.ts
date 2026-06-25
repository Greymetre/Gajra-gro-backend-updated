import * as jwt from 'jsonwebtoken';
import { JwtTokenInterface, CustomerJwtTokenInterface } from '../interfaces/jwt.token.interface';
import { getS3BucketName, getS3Client } from './s3-client';

export const generateCustomerToken = async (tokenDto: CustomerJwtTokenInterface): Promise<string> => {
  return await jwt.sign(tokenDto, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRED_TIME,
  });
}

export const generateAuthUserToken = async (tokenDto: JwtTokenInterface): Promise<string> => {
  return await jwt.sign(tokenDto, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRED_TIME,
  });
}

export const decodeCustomerToken = async (token: string): Promise<false | CustomerJwtTokenInterface> => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as CustomerJwtTokenInterface;
  } catch (e) {
    return false;
  }
}



export const decodeAuthUserToken = async (token: string): Promise<false | JwtTokenInterface> => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as JwtTokenInterface;
  } catch (e) {
    return false;
  }
}

export const getAuthUserInfo = async (headers: any): Promise<JwtTokenInterface> => {
  try {
    const authHeader = headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    return jwt.verify(token, process.env.JWT_SECRET) as JwtTokenInterface;
  } 
  catch (e) {
    return {};
  }
}

export const getCustomerAuthInfo = async (headers: any): Promise<CustomerJwtTokenInterface> => {
  try {
    const authHeader = headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    return jwt.verify(token, process.env.JWT_SECRET) as CustomerJwtTokenInterface;
  } catch (e) {
    return {};
  }
}

export const destroyCustomerToken = async (headers: any): Promise<false | any> => {
  const authHeader = headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    return await decodeCustomerToken(token);
}

const fs = require('fs');

export const uploadFile = (filePath, key) => {
  try {
    console.log(filePath)
    const fileContent = fs.readFileSync(filePath);

  // Parameters for the S3 upload
  const params = {
    Bucket: getS3BucketName(),
    Key: key, // File name you want to save as in S3
    Body: fileContent,
  };

  // Uploading the file to the specified bucket
  getS3Client().upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
    } else {
      console.log(`File uploaded successfully. Location: ${data.Location}`);
    }
  });
  } catch (error) {
    console.log(error,5555555)
  }
  // Read the file from the filesystem
  
};
