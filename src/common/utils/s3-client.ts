import * as AWS from 'aws-sdk';

let s3Client: AWS.S3 | null = null;
const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required R2 environment variable: ${name}`);
  return value;
};

// Keep these names for existing callers; all object storage now uses R2.
export const getS3BucketName = (): string => requireEnv('R2_BUCKET_NAME');

export const getS3Client = (): AWS.S3 => {
  if (!s3Client) {
    const endpoint = requireEnv('R2_ENDPOINT');
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.r2.cloudflarestorage.com')) {
      throw new Error('R2_ENDPOINT must be the HTTPS S3 API endpoint from the R2 dashboard');
    }
    s3Client = new AWS.S3({
      endpoint,
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      region: process.env.R2_REGION || 'auto',
      signatureVersion: 'v4',
      s3ForcePathStyle: true,
    });
  }
  return s3Client;
};
