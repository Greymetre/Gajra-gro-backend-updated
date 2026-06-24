import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ShoppingcartService } from './shoppingcart.service';
import { ShoppingcartController } from './shoppingcart.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Shoppingcart, ShoppingcartSchema } from '../../entities/shoppingcart.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Shoppingcart.name, schema: ShoppingcartSchema }])],
  controllers: [ShoppingcartController],
  providers: [ShoppingcartService]
})
export class ShoppingcartModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(ShoppingcartController)
  }
}

