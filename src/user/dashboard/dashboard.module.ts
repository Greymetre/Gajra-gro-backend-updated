import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardController } from './dashboard.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { Redemption, RedemptionSchema } from '../../entities/redemption.entity';
import { Coupon, CouponSchema } from '../../entities/coupon.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: Redemption.name, schema: RedemptionSchema },
    { name: Coupon.name, schema: CouponSchema }
  ])],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(DashboardController)
  }
}