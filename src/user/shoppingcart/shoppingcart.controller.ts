import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ShoppingcartService } from '../../services/shoppingcart.service';
import { CreateShoppingcartDto } from './dto/create-shoppingcart.dto';
import { UpdateShoppingcartDto } from './dto/update-shoppingcart.dto';

@Controller('user/shoppingcart')
export class ShoppingcartController {
  constructor(private readonly shoppingcartService: ShoppingcartService) {}

  @Post()
  create(@Body() createShoppingcartDto: CreateShoppingcartDto) {
    return this.shoppingcartService.create(createShoppingcartDto);
  };

  @Get()
  findAll() {
    return this.shoppingcartService.findAll();
  };

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shoppingcartService.findOne(+id);
  };

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShoppingcartDto: UpdateShoppingcartDto) {
    return this.shoppingcartService.update(+id, updateShoppingcartDto);
  };

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shoppingcartService.remove(+id);
  };
}
