import { PartialType } from '@nestjs/swagger';
import { CreateShoppingcartDto } from './create-shoppingcart.dto';

export class UpdateShoppingcartDto extends PartialType(CreateShoppingcartDto) {}
