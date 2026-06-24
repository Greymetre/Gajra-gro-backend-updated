import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { SettingService } from 'src/services/setting.service';
import { SettingController } from './setting.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { SettingProject, SettingProjectSchema } from 'src/entities/setting.project.entity';
import { SettingCustomer, SettingCustomerSchema } from '../../entities/setting.customer.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([{ name: SettingProject.name, schema: SettingProjectSchema },{ name: SettingCustomer.name, schema: SettingCustomerSchema }])],
  controllers: [SettingController],
  providers: [SettingService]
})
export class SettingModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //   .apply(LoginMiddleware)
  //   .forRoutes()
  // }
}