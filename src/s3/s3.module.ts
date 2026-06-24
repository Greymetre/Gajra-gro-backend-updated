import { Module } from '@nestjs/common';
import { S3CredentialsService } from '../services/s3-credentials.service';
import { S3Controller } from './s3.controller';

@Module({
  controllers: [S3Controller],
  providers: [S3CredentialsService],
})
export class S3Module {}
