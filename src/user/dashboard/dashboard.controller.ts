
import { Controller, Get, Param, Query, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { DashboardService } from 'src/services/dashboard.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { dashboardDto } from '../users/dto/user.request.dto';

@Controller('user/dashboard')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get Desktop data' })
  @ApiResponse({ status: 200, description: 'Mobile number is available'})
  @ApiBadRequestResponse({ description: 'Invalid subcategory id' })
  @Get()
  protected async getAllSubcategory(@Query("customerType") customerType: string): Promise<SuccessResponse<any>> {
    const [customers, transactions, pendingApproval, approvedRedeemption, redeemptions, coupons, activeCustomers,successRedemption] = await Promise.all([
      this.dashboardService.getCustomerDashboard(customerType),
      this.dashboardService.getTransactionDashboard(customerType),
      this.dashboardService.getRedemptionPendingApprovalDashboard(customerType),
      this.dashboardService.getRedemptionApprovedDashboard(customerType),
      this.dashboardService.getRedemptionDashboard(customerType),
      this.dashboardService.getCouponDashboard(customerType),
      this.dashboardService.getActiveCustomer(customerType),
      this.dashboardService.getSuccessRedemptionDashboard(customerType),
    ]);
  
    return {
      data: {
        customers: customers,
        transactions: transactions,
        pendingApproval: pendingApproval,
        approvedRedeemption: approvedRedeemption,
        redeemptions: redeemptions,
        coupons: coupons,
        activeCustomers: activeCustomers,
        successRedemption:successRedemption
      }
    };
  }
  
  
}
