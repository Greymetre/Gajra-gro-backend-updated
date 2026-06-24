import { Controller, Get, Post, Body, Param, HttpCode, UseInterceptors} from '@nestjs/common';
import { ProductsService } from 'src/services/products.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetProductInfoDto } from './dto/response-product.dto';
import { SuccessResponse } from 'src/common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { CategoryIdArrayDto, FilterPaginationProductDto } from 'src/dto/product-dto';

@Controller('products')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @Get()
  protected async getAllProduct(@Body() paginationDto : FilterPaginationProductDto): Promise<SuccessResponse<any>> {
    paginationDto.categories = Array.isArray(paginationDto.categories) ?  paginationDto.categories : []
    const data = await this.productsService.getAllProduct(paginationDto);
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular product details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @Get('/:id')
  protected async getProductInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.productsService.getProductInfo(id);
    return { data };
  };

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  protected async getCategoryProducts(@Body() categoryIdDto: CategoryIdArrayDto) : Promise<SuccessResponse<any>> {
    const data = await this.productsService.getCategoryProducts(categoryIdDto);
    return { data };
  };

  @ApiOperation({ summary: 'Get Categories' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Categories' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getCategories')
  @HttpCode(200)
  protected async getCategories() : Promise<SuccessResponse<any>> {
    const data = await this.productsService.getCategoryies();
    return { data };
  };

}
