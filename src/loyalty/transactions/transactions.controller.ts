import { Controller, Get, Post, Body, Param,Query, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { TransactionsService } from '../../services/transactions.service';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetTransactionInfoDto } from './dto/response-transaction.dto';
import { AddInvalidCouponDTO, CustomerCouponsScanDTO } from '../../dto/transaction.dto'
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getCustomerAuthInfo, uploadFile } from 'src/common/utils/jwt.helper';
import { UploadFilesHelper,imageName } from 'src/common/utils/helper.service';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
import * as fs from 'fs';
@Controller('loyalty/transactions')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class TransactionsController {
  constructor(private readonly transactionService: TransactionsService) {}

  @ApiOperation({ summary: 'Get all transaction' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid transaction id' })
  @Get()
  protected async getAllTransaction(@Req() req: Request,@Query('startDate') startDate: string,@Query('endDate') endDate: string,@Body() customerIdDTO:CustomerIdDTO): Promise<SuccessResponse<any>> {
    // protected async getAllTransaction(@Req() req: Request,@Body() customerIdDTO:CustomerIdDTO): Promise<SuccessResponse<any>> {

    const authInfo = await getCustomerAuthInfo(req.headers)
    if(authInfo.customerType == "Mechanic" || authInfo.customerType == "Retailer"){
      customerIdDTO.customerid = authInfo._id
    }
    console.log(startDate,endDate)
    const data = await this.transactionService.getAllCustomerTransaction(startDate,endDate,customerIdDTO);
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular transaction details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid transaction id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @Get('/:id')
  protected async getTransactionInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.transactionService.getTransactionInfo(id);
    return { data };
  };
  
  @ApiOperation({ summary: 'Coupon Scans' })
  @ApiResponse({ status: 200, description: 'Success', type: TransactionsService })
  @ApiBadRequestResponse({ description: 'Invalid Coupon Scans' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('couponScans')
  @HttpCode(200)
  protected async couponScans(@Req() req: Request, @Body() couponsDTO: CustomerCouponsScanDTO) : Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    couponsDTO.customerid = authInfo._id
    const data = await this.transactionService.couponScans(couponsDTO);
    return { data };
  };

  @ApiOperation({ summary: 'Customer Survey Update' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('leaderboard')
  @HttpCode(200)
  protected async SurveyDataUpdate(@Req() req: Request): Promise<SuccessResponse<any>> {
      const data = await this.transactionService.leaderboard(req);
      return { data };
  };


  @ApiOperation({ summary: 'Add Invalid' })
  @ApiResponse({ status: 200, description: 'Success'})
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post("/add-invalid")
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'couponImage', maxCount: 3 }, 
  ], {
    storage: diskStorage({
      destination:UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async addInvalidCoupon(@Req() req: Request,@Body() addInvalidCouponDTO: AddInvalidCouponDTO, @UploadedFiles() files: {
    length: number; couponImage?: Express.Multer.File[]
}): Promise<SuccessResponse<any>> {


         addInvalidCouponDTO.couponImage = []

      if(files){
        let uploadedUrls:any = await imageName(req,files.couponImage)
        addInvalidCouponDTO.couponImage = uploadedUrls;
      }
    // addInvalidCouponDTO.couponImage = files.couponImage.map((ele)=>(ele.path))
    return await this.transactionService.addInvalidCoupon(addInvalidCouponDTO);
  };


  @ApiOperation({ summary: 'Get all invalid coupon ' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid transaction id' })
  @Post("/invalidCoupon")
  protected async getAllCustomerInvalidCoupon(@Req() req: Request,@Body() customerIdDTO:CustomerIdDTO): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)

    customerIdDTO.customerid = authInfo._id
    const data = await this.transactionService.getAllCustomerInvalidCoupon(customerIdDTO);
    return { data };
  };

  @ApiOperation({ summary: 'Coupon Scans' })
  @ApiResponse({ status: 200, description: 'Success', type: TransactionsService })
  @ApiBadRequestResponse({ description: 'Invalid Coupon Scans' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('coupon-scan-by-admin')
  @HttpCode(200)
  protected async couponScansByAdmin(@Req() req: Request,@Body() addInvalidCouponDTO: AddInvalidCouponDTO) : Promise<SuccessResponse<any>> {
    const data = await this.transactionService.couponScansByAdmin(req,addInvalidCouponDTO);
    return { data };
  };

}
