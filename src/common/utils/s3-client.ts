import * as AWS from 'aws-sdk';

let s3Client: AWS.S3 | null = null;

const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required S3 environment variable: ${name}`);
  }

  return value;
};

export const getS3BucketName = (): string => {
  return requireEnv('BUCKET_NAME');
};

export const getS3Client = (): AWS.S3 => {
  if (!s3Client) {
    s3Client = new AWS.S3({
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
      region: process.env.AWS_REGION || 'ap-south-1',
    });
  }

  return s3Client;
};
