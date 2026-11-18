import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CustomersService } from '../../services/customers.service';
import { SfaSyncKeyGuard } from 'src/common/guards/sfa-sync-key.guard';

// Called by the SFA backend (not by app / CRM users), so it has no login middleware
@ApiExcludeController()
@Controller('sfa-sync')
@UseGuards(SfaSyncKeyGuard)
export class SfaSyncController {
  constructor(private readonly customersService: CustomersService) { }

  // { sfaCustomerId, groCustomerId, mobile, active }: a customer switched active / inactive in SFA
  @Post('customers/status')
  @HttpCode(200)
  protected async customerStatus(@Body() body: any) {
    return await this.customersService.customerStatusFromSfa(body);
  }

  // { sfaCustomerId, groCustomerId, mobile }: the customer's KYC documents, bank and UPI details (read only)
  @Post('customers/kyc')
  @HttpCode(200)
  protected async customerKyc(@Body() body: any) {
    return await this.customersService.customerKycForSfa(body);
  }

  // { userMobile }: customers assigned to that SFA user with KYC documents checked by the sales team, pending approval
  @Post('kyc/checked-customers')
  @HttpCode(200)
  protected async checkedKycCustomers(@Body() body: any) {
    return await this.customersService.checkedKycCustomersForSfa(body);
  }

  // { userMobile, groCustomerId, kycdocs, action: approve | reject }: the assigned sales person's decision
  @Post('kyc/action')
  @HttpCode(200)
  protected async kycAction(@Body() body: any) {
    return await this.customersService.kycActionFromSfa(body);
  }

  // { month: "YYYY-MM" }: every mechanic's points, redeemed points and unique coupon scans of that month
  // or { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }: the same for those days
  @Post('mechanics/monthly-summary')
  @HttpCode(200)
  protected async mechanicMonthlySummary(@Body() body: any) {
    return await this.customersService.mechanicMonthlySummary(body);
  }

  // { month: "YYYY-MM" }: the same for every retailer
  @Post('retailers/monthly-summary')
  @HttpCode(200)
  protected async retailerMonthlySummary(@Body() body: any) {
    return await this.customersService.retailerMonthlySummary(body);
  }

  // { from: "YYYY-MM-DD", to: "YYYY-MM-DD", groCustomerIds: [...] }: points and unique coupon scans per customer per day
  @Post('customers/daily-scans')
  @HttpCode(200)
  protected async customerDailyScans(@Body() body: any) {
    return await this.customersService.customerDailyScans(body);
  }
}
