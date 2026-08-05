import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoyaltyschemeService } from '../../services/loyaltyscheme.service';
import { LoyaltyschemeController } from './loyaltyscheme.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Loyaltyscheme, LoyaltyschemeSchema } from '../../entities/loyaltyscheme.entity';
import { Product, ProductSchema } from '../../entities/product.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [MongooseModule.forFeature([
    { name: Loyaltyscheme.name, schema: LoyaltyschemeSchema },
    { name: Product.name, schema: ProductSchema },
  ])],
  controllers: [LoyaltyschemeController],
  providers: [LoyaltyschemeService]
})
export class LoyaltyschemeModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(LoyaltyschemeController)
  }
}
