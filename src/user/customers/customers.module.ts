import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CustomersService } from '../../services/customers.service';
import { CustomersController } from './customers.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { SettingCustomer, SettingCustomerSchema } from '../../entities/setting.customer.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { User, UserSchema } from '../../entities/users.entity';
import { OtpLog, OtpLogSchema } from '../../entities/otplog.entity';
import { Remark, RemarkSchema } from '../../entities/remark.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([
    { name: Customer.name, schema: CustomerSchema },
    { name: SettingCustomer.name, schema: SettingCustomerSchema },
    { name: SettingProject.name, schema: SettingProjectSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: User.name, schema: UserSchema },
    { name: OtpLog.name, schema: OtpLogSchema },
    { name: Remark.name, schema: RemarkSchema },

  ])],
  controllers: [CustomersController],
  providers: [CustomersService]
})
export class CustomersModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CustomersController)
  }
}