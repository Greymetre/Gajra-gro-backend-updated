import { Controller, Get, Post, Req, UseInterceptors } from '@nestjs/common';
import { SettingService } from 'src/services/setting.service';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetSettingInfoDto } from 'src/dto/setting-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
@Controller('loyalty/setting')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class SettingController {
  constructor(private readonly settingService: SettingService) { }

  @ApiOperation({ summary: 'Get all sale' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: SettingService })
  @ApiBadRequestResponse({ description: 'Invalid sale id' })
  @Get()
  protected async getLoyaltyUserSetting(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getLoyaltyUserSetting();
    return { data };
  };
  @ApiOperation({ summary: 'Get paticular customer details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @Post('getBannerImages')
  protected async getBannerImages(): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getBannerImages();
    return { data };
  };

  @ApiOperation({ summary: 'Get Loyalty Setting' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @Post('getLoyaltySetting')
  protected async getLoyaltySetting(): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getLoyaltySetting();
    return { data };
  };

  @ApiOperation({ summary: 'Get Loyalty Setting' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @Post('getRedemptionSetting')
  protected async getRedemptionSetting(): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getRedemptionSetting();
    return { data };
  };

  @ApiOperation({ summary: 'Get Loyalty Setting' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @Post('getContactSetting')
  protected async getContactSetting(): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getContactSetting();
    return { data };
  };
};
