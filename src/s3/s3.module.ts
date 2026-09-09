import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { S3Controller } from './s3.controller';
import { LoginMiddleware } from '../common/middleware/login.middleware';

@Module({ controllers: [S3Controller] })
export class S3Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoginMiddleware).forRoutes(S3Controller);
  }
}
