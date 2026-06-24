import { PartialType } from '@nestjs/swagger';
import { CreateShoppingcartDto } from './request-shoppingcart.dto';

export class UpdateShoppingcartDto extends PartialType(CreateShoppingcartDto) {}
