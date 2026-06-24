import { Controller, Get } from '@nestjs/common';
import { S3CredentialsService } from '../services/s3-credentials.service';
import { S3 } from 'aws-sdk'; // Import the AWS SDK for S3

@Controller('s3')
export class S3Controller {
  constructor(private readonly s3CredentialsService: S3CredentialsService) {}

  @Get('list-buckets')
  async listBuckets() {
    const credentials = await this.s3CredentialsService.getS3Credentials();

    const s3 = new S3({
      // accessKeyId: credentials.aws_access_key_id,
      // secretAccessKey: credentials.aws_secret_access_key,
      // region: 'ap-south-1',
    });

    return new Promise((resolve, reject) => {
      s3.listBuckets((err, data) => {
        if (err) {
          reject('Error listing S3 buckets: ' + err);
        } else {
          resolve(data.Buckets);
        }
      });
    });
  }
}
