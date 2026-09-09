import { Controller, Get } from '@nestjs/common';
import { getS3BucketName, getS3Client } from '../common/utils/s3-client';

@Controller('s3')
export class S3Controller {
  @Get('list-buckets')
  async listBuckets() {
    // Only inspect the configured bucket; credentials need no account-wide access.
    const Bucket = getS3BucketName();
    await getS3Client().headBucket({ Bucket }).promise();
    return [{ Name: Bucket }];
  }
}
