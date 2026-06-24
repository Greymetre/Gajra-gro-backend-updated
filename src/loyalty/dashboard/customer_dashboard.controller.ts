import { Controller, Get, Post, Body, HttpCode, Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerDashboardService } from 'src/services/customer_dashboard.service';
import { SettingService } from 'src/services/setting.service';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getCustomerAuthInfo } from 'src/common/utils/jwt.helper';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
@Controller('loyalty/dashboard')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CustomerDashboardController {
  constructor(private readonly dashboardService: CustomerDashboardService, private readonly settingService: SettingService) {}

  @ApiOperation({ summary: 'Get all Dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard number is available', type: CustomerDashboardService })
  @ApiBadRequestResponse({ description: 'Invalid Dashboard id' })
  @Get()
  protected async getDashboardData(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO) : Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    customerIdDTO.customerid = (customerIdDTO.customerid)? customerIdDTO.customerid : authInfo._id
    const [dashboard, setting, balance] = await Promise.all([
      this.dashboardService.getDashboardData(customerIdDTO),
      this.settingService.getLoyaltyDashboardSetting(),
      this.dashboardService.getCustomerBalancePoint(customerIdDTO.customerid),
      
    ]);
    return { data: { ...dashboard, ...setting, ...balance } };
  };

  @ApiOperation({ summary: 'Seen Welcome Message' })
  @ApiResponse({ status: 200, description: 'Success', type: CustomerDashboardService })
  @ApiBadRequestResponse({ description: 'Invalid Loyalty Dashboard' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('seenWelcomeMessage')
  @HttpCode(200)
  protected async hasSeenWelcome(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO) : Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    customerIdDTO.customerid = (customerIdDTO.customerid)? customerIdDTO.customerid : authInfo._id
      const data = await this.dashboardService.hasSeenWelcome(customerIdDTO);
      return { data };
  };


  @ApiOperation({ summary: 'Seen Welcome Message' })
  @ApiResponse({ status: 200, description: 'Success', type: CustomerDashboardService })

  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('token')
  @HttpCode(200)
  protected async addToken(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO) : Promise<SuccessResponse<any>> {
    customerIdDTO.customerid =  customerIdDTO.customerid;
      const data = await this.dashboardService.addToken(customerIdDTO);
      return { data };
  };
}
