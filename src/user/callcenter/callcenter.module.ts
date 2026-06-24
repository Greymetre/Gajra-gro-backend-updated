import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CallCenterService } from '../../services/callcenter.service';
import { CallCenterController } from './callcenter.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { CallCenter, CallCenterSchema } from '../../entities/callcenter.entity';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { User, UserSchema } from '../../entities/users.entity';

import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: CallCenter.name, schema: CallCenterSchema },
    { name: Customer.name, schema: CustomerSchema },
    { name: User.name, schema: UserSchema }])],
  controllers: [CallCenterController],
  providers: [CallCenterService]
})
export class CallCenterModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CallCenterController)
  }
}
