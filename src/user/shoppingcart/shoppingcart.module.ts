import { Module } from '@nestjs/common';
import { ShoppingcartService } from '../../services/shoppingcart.service';
import { ShoppingcartController } from './shoppingcart.controller';

@Module({
  controllers: [ShoppingcartController],
  providers: [ShoppingcartService]
})
export class ShoppingcartModule {}
