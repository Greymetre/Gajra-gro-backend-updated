import { Controller, Get, Post, Body, Param, HttpCode, UsePipes, ValidationPipe, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { SalesService } from 'src/services/sales.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateSaleDTO } from 'src/dto/sales-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getCustomerAuthInfo } from '../../common/utils/jwt.helper';
@Controller('loyalty/sales')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class SalesController {
  constructor(private readonly saleService: SalesService) { }

  @ApiOperation({ summary: 'Add Sale' })
  @ApiResponse({ status: 200, description: 'Success', type: SalesService })
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
  protected async createNewSale(@Req() req: Request, @Body() createSaleDTO: CreateSaleDTO, @UploadedFiles() files: { images?: Express.Multer.File[] }): Promise<any> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    createSaleDTO.customerid = authInfo._id
    createSaleDTO.images = await imageName(req,files.images)
    // createSaleDTO.images = await files.images && files.images.map(file => (file.path))
    // createSaleDTO.images = await files.images && files.images.map(file => (file.path).replace("dist/", ""))
    return await this.saleService.createNewSale(createSaleDTO);
  };

  @ApiOperation({ summary: 'Get all sale' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: SalesService })
  @ApiBadRequestResponse({ description: 'Invalid sale id' })
  @Get()
  protected async getAllSale(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.saleService.getAllSale();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular sale details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid sale id' })
  @ApiResponse({ status: 200, description: 'Success', type: SalesService })
  @Get('/:id')
  protected async getSaleInfo(@Param('id') id: string): Promise<SuccessResponse<any>> {
    const data = await this.saleService.getSaleInfo(id);
    return { data };
  };
}