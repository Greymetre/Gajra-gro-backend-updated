import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SfaSyncKeyGuard } from 'src/common/guards/sfa-sync-key.guard';
import { DistrictService } from '../../services/district.service';

// Called by the SFA backend (not by app / CRM users), so it has no login middleware
@ApiExcludeController()
@Controller('sfa-sync')
@UseGuards(SfaSyncKeyGuard)
export class SfaLocationSyncController {
  constructor(private readonly districtService: DistrictService) { }

  // { type: countries|states|districts|cities|pincodes, rows: [...], deletedIds: [sfa ids] }
  // pushed by SFA right after a location is created, edited, switched on / off, deleted or imported
  @Post('locations')
  @HttpCode(200)
  protected async locations(@Body() body: any) {
    return await this.districtService.applySfaPush(body);
  }
}
