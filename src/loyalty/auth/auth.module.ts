import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { CustomersService } from 'src/services/customers.service';
import { AuthController } from './auth.controller';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { SettingCustomer, SettingCustomerSchema } from '../../entities/setting.customer.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { User, UserSchema } from '../../entities/users.entity';
import { OtpLog, OtpLogSchema } from '../../entities/otplog.entity';
import { Remark, RemarkSchema } from '../../entities/remark.entity';
import { JwtModule } from '@nestjs/jwt';
import { JWTCLIENTSECRET} from '../../common/constants'
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRED_TIME },
  }), MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema },
    { name: SettingCustomer.name, schema: SettingCustomerSchema },
    { name: SettingProject.name, schema: SettingProjectSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: User.name, schema: UserSchema },
    { name: OtpLog.name, schema: OtpLogSchema },
    { name: Remark.name, schema: RemarkSchema },
  ])],
  providers: [CustomersService],
  controllers: [AuthController]
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(
      { path: 'loyalty/auth/kycUpdate', method: RequestMethod.POST },
      { path: 'loyalty/auth/surveyUpdate', method: RequestMethod.POST },
      { path: 'loyalty/auth/getAuthInfo', method: RequestMethod.POST }
      )
  }
}
