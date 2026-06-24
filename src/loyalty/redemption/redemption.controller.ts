import { Controller, Get, Post, Body, Param,Query, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { RedemptionService } from '../../services/redemption.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateGiftRedemptionDto, CreateNeftRedemptionDto, CreateUpiRedemptionDto, CreateWalletRedemptionDto } from 'src/dto/redemption-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getCustomerAuthInfo } from 'src/common/utils/jwt.helper';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';

@Controller('loyalty/redemption')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @ApiOperation({ summary: 'Add Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createRedemption(@Req() req: Request, @Body() createRedemptionDto: CreateGiftRedemptionDto ): Promise<any> {
    createRedemptionDto.redeemedpoints = createRedemptionDto.points * createRedemptionDto.quantity ;
    return await this.redemptionService.createRedemption(createRedemptionDto, req);
  };

  @ApiOperation({ summary: 'Get all redemption' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid redemption id' })
  @Get()
  protected async getAllRedemption(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO,@Query('startDate') startDate: string,@Query('endDate') endDate: string): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
   
    if(authInfo.customerType == "Mechanic" || authInfo.customerType == "Retailer"){
      customerIdDTO.customerid = authInfo._id
    }
    const data = await this.redemptionService.getAllUserRedemption(startDate,endDate,customerIdDTO);
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular redemption details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid redemption id' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @Get('/:id')
  protected async getRedemptionInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getRedemptionUserInfo(id);
    return { data };
  };

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('neftRedemption')
  @HttpCode(200)
  protected async NeftRedemption(@Req() req: Request, @Body() neftRedemptionDto: CreateNeftRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
      neftRedemptionDto.customerid = authInfo._id
      const data = await this.redemptionService.redemptionViaNeft(neftRedemptionDto);
      return { data };
  };

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('upiRedemption')
  @HttpCode(200)
  protected async UpiRedemption(@Req() req: Request, @Body() upiRedemptionDto: CreateUpiRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    upiRedemptionDto.customerid = authInfo._id
      const data = await this.redemptionService.redemptionViaUpi(upiRedemptionDto);
      return { data };
  };

  @ApiOperation({ summary: 'Paytm Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('paytmRedemption')
  @HttpCode(200)
  protected async paytmRedemption(@Req() req: Request, @Body() walletRedemptionDto: CreateWalletRedemptionDto): Promise<SuccessResponse<any>> {
      const data = await this.redemptionService.paytmRedemption(walletRedemptionDto, req);
      return { data };
  };

  @ApiOperation({ summary: 'Paytm Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('balancePoint')
  @HttpCode(200)
  protected async balancePoint(@Req() req: Request): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.redemptionService.getCustomerBalancePoint(authInfo._id);
      return { data };
  };

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: RedemptionService })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getLastRedemption')
  @HttpCode(200)
  protected async getLastRedemption(@Req() req: Request, @Body() neftRedemptionDto: CreateNeftRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.redemptionService.getLastRedemption(authInfo._id);
      return { data };
  };
}
