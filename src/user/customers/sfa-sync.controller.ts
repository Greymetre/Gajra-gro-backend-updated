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
}
