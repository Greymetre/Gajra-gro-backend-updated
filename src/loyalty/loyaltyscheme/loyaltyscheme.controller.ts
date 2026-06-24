import { Controller, Get, Post, Param, UseInterceptors} from '@nestjs/common';
import { LoyaltyschemeService } from './loyaltyscheme.service';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetLoyaltyschemeInfoDto } from './dto/response-loyaltyscheme.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/scheme')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class LoyaltyschemeController {
  constructor(private readonly loyaltyService: LoyaltyschemeService) {}

  @ApiOperation({ summary: 'Get all loyaltyschemes' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid loyaltyscheme id' })
  @Get()
  protected async getAllLoyaltyscheme(): Promise<SuccessResponse<any>> {
    const data = await this.loyaltyService.getAllLoyaltyscheme();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular loyaltyscheme details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid loyaltyscheme id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @Get('/:id')
  protected async getLoyaltyschemeInfo(@Param('id') id: string) : Promise<SuccessResponse<GetLoyaltyschemeInfoDto>> {
    const data = await this.loyaltyService.getLoyaltyschemeInfo(id);
    return { data };
  };


}
