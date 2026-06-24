import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CouponProfileService } from '../../services/couponprofile.service';
import { CouponsController } from './coupons.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { CouponProfileSchema } from '../../entities/couponprofile.entity';
import { TransactionSchema } from '../../entities/transaction.entity';
import { CouponSchema } from '../../entities/coupon.entity';
import { ProductSchema } from '../../entities/product.entity';
import { MongooseModule } from '@nestjs/mongoose'
import { PackingList, PackingListSchema } from '../../entities/packing-list.entity';
@Module({
  imports: [MongooseModule.forFeature([
    { name: 'CouponProfile', schema: CouponProfileSchema },
    { name: 'Coupon', schema: CouponSchema },
    { name: 'Product', schema: ProductSchema },
    { name: 'Transaction', schema: TransactionSchema },
    { name: 'PackingList', schema: PackingListSchema },
  ])],
  controllers: [CouponsController],
  providers: [CouponProfileService]
})
export class CouponsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginMiddleware)
      .forRoutes(CouponsController)
  }
}