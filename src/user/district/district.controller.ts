import { Controller, Get, Post, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOperation } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { DistrictService } from '../../services/district.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

// Districts are synced from GG SFA, so there is no create / update here (only delete)
@Controller('user/district')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class DistrictController {
  constructor(private readonly districtService: DistrictService) { }

  @ApiOperation({ summary: 'Get all districts, optionally for one state ({ stateid } or { state })' })
  @Post('all')
  protected async getAllDistricts(@Body() body: any): Promise<SuccessResponse<any>> {
    const data = await this.districtService.getAllDistricts(body);
    return { data };
  };

  @ApiOperation({ summary: 'City pincodes, one row each ({ currentPage, recordPerPage, search })' })
  @Post('pincodes')
  protected async getAllPincodes(@Body() body: any): Promise<SuccessResponse<any>> {
    const data = await this.districtService.getAllPincodes(body);
    return { data };
  };

  @ApiOperation({ summary: 'Pull countries / states / districts / cities from GG SFA now ({ full: false } for changes only)' })
  @Post('syncFromSfa')
  protected async syncFromSfa(@Body() body: any): Promise<SuccessResponse<any>> {
    const data = await this.districtService.syncFromSfa(body?.full !== false);
    return { data };
  };

  @ApiOperation({ summary: 'Country / state / district / city counts (total and active)' })
  @Get('counts')
  protected async getLocationCounts(): Promise<SuccessResponse<any>> {
    const data = await this.districtService.getLocationCounts();
    return { data };
  };

  @ApiOperation({ summary: 'Delete a district (its cities are kept, only unlinked)' })
  @Delete(':id')
  protected async deleteDistrict(@Param('id') id: string) {
    return await this.districtService.deleteDistrict(id);
  };

  @ApiOperation({ summary: 'Get district details' })
  @Get('/:id')
  protected async getDistrictInfo(@Param('id') id: string): Promise<SuccessResponse<any>> {
    const data = await this.districtService.getDistrictInfo(id);
    return { data };
  };
}
