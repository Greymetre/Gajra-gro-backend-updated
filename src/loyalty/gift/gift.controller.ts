import { Controller, Get, Param, UseInterceptors} from '@nestjs/common';
import { GiftService } from './gift.service';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/gift')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class GiftController {
  constructor(private readonly giftService: GiftService) {}

  @ApiOperation({ summary: 'Get all gift' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GiftService })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @Get()
  protected async getAllGift(): Promise<SuccessResponse<any>> {
    const data = await this.giftService.getAllGift();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular product details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid product id' })
  @ApiResponse({ status: 200, description: 'Success', type: GiftService })
  @Get('/:id')
  protected async getGiftInfo(@Param('id') id: string) : Promise<SuccessResponse<GiftService>> {
    const data = await this.giftService.getGiftInfo(id);
    return { data };
  };

}
