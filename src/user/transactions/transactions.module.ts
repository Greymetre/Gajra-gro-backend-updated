import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TransactionsService } from '../../services/transactions.service';
import { TransactionsController } from './transactions.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { MongooseModule } from '@nestjs/mongoose'
import { Loyaltyscheme, LoyaltyschemeSchema } from '../../entities/loyaltyscheme.entity';
import { Coupon, CouponSchema } from '../../entities/coupon.entity';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { InvalidCoupon, InvalidCouponSchema } from '../../entities/invalidcoupon.entity';
import { Product, ProductSchema } from '../../entities/product.entity';
import { CouponProfile, CouponProfileSchema } from '../../entities/couponprofile.entity';
import { PackingList, PackingListSchema } from '../../entities/packing-list.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema },
  { name: Loyaltyscheme.name, schema: LoyaltyschemeSchema },
  { name: Coupon.name, schema: CouponSchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: SettingProject.name, schema: SettingProjectSchema },
  { name: InvalidCoupon.name, schema: InvalidCouponSchema },
  { name: Product.name, schema: ProductSchema },
  { name: CouponProfile.name, schema: CouponProfileSchema },
  { name: PackingList.name, schema: PackingListSchema },
  ])],
  controllers: [TransactionsController],
  providers: [TransactionsService]
})
export class TransactionsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginMiddleware)
      .forRoutes(TransactionsController)
  }
}
