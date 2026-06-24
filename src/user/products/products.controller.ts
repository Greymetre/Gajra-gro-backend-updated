import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { ProductsService } from '../../services/products.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateProductDto, ImportProductDto, StatusProductDto, UpdateProductDto } from './dto/request-product.dto';
import { GetProductInfoDto } from './dto/response-product.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { FilterPaginationProductDto } from 'src/dto/product-dto';
const ObjectId = require('mongoose').Types.ObjectId;
@Controller('user/products')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Add Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 4 },
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination:UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async createProduct(@Req() req: Request, @Body() createProductDto: CreateProductDto, @UploadedFiles() files: { images?: Express.Multer.File[] }): Promise<any> {
    // const images = await files.images && files.images.map(file => { return {  image : file.path } })
    // createProductDto.images = await images && images;
    // createProductDto.images = await files.images && files.images.map(file => { return {  image : (file.path).replace("dist/", "") } })
    // createProductDto.images = await files.images && files.images.map(file => { return {  image : (file.path)} })
    createProductDto.images = await files.images &&  await imageName(req,files.images)
    return this.productsService.createProduct(createProductDto, req);
  }
 
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @Get()
  protected async getProduct(@Req() req: Request, @Body() paginationDto : FilterPaginationProductDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const categories = Array.isArray(authInfo.categories) ? authInfo.categories.map(category => ObjectId(category)) :[]
    paginationDto.categories = Array.isArray(paginationDto.categories) ?  paginationDto.categories : categories
    const data = await this.productsService.getAllProduct(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get all Products' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Transactions' })
  @Post('all')
  protected async getAllTransaction(@Req() req: Request, @Body() paginationDto : FilterPaginationProductDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const categories = Array.isArray(authInfo.categories) ? authInfo.categories.map(category => ObjectId(category)) :[]
    paginationDto.categories = Array.isArray(paginationDto.categories) ?  paginationDto.categories : categories
    const data = await this.productsService.getAllProduct(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular product details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @Get('/:id')
  protected async getProductInfo(@Param('id') id: string) : Promise<SuccessResponse<GetProductInfoDto>> {
    const data = await this.productsService.getProductInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'Update Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 4 },
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination:UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async updateProductInfo(@Param('id') id: string,@Req() req: Request, @Body() updateProductDto: UpdateProductDto, @UploadedFiles() files: { images?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.images && files.images.map(file => { return {  image : (file.path) } })
    // const image = await files.images && files.images.map(file => { return {  image : (file.path).replace("dist/", "") } })
    // updateProductDto.images = await image && image;
    // let uploadedUrls:any = await imageName(req,files)
    updateProductDto.images =  await files.images && await imageName(req,files.images)
    return this.productsService.updateProductInfo(id, updateProductDto);
  }

  @Delete(':id')
  protected async deleteProduct(@Param('id') id: string) {
    return await this.productsService.deleteProduct(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusProductDto: StatusProductDto) {
    return await this.productsService.updateStatus(statusProductDto);
  }

  @ApiOperation({ summary: 'Add Multiple Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importProducts')
  @HttpCode(200)
  protected async importProducts(@Req() req: Request, @Body() createProductDto: ImportProductDto[]): Promise<any> {
    const data = await this.productsService.importProducts(createProductDto);
    return { data };
  }

  @ApiOperation({ summary: 'Customer DropDown List' })
  @ApiResponse({ status: 200, description: 'Success', type: GetProductInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('dropdown')
  @HttpCode(200)
  protected async getProductDropDown(@Req() req: Request) : Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const categories = Array.isArray(authInfo.categories) && authInfo.categories.map(category => ObjectId(category))
    const data = await this.productsService.getProductDropDown(categories);
    return { data };
  }
}
