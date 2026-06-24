import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { OrdersService } from 'src/services/orders.service';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Order, OrderSchema } from '../../entities/order.entity';
import { Shoppingcart, ShoppingcartSchema } from 'src/entities/shoppingcart.entity';
import { Product, ProductSchema } from 'src/entities/product.entity';
import { MongooseModule } from '@nestjs/mongoose'
import { OrdersController } from './orders.controller';

@Module({
  imports: [ MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema },
    { name: Shoppingcart.name, schema: ShoppingcartSchema },
    { name: Product.name, schema: ProductSchema }
  ])],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
