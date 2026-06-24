import { Controller, Get, Post, Body, Param, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StatesService } from './states.service';
import { CountryStateDto } from './dto/request-state.dto';
import { GetStateInfoDto } from './dto/response-state.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/states')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @ApiOperation({ summary: 'Get all states' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetStateInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid state id' })
  @Get()
  protected async getAllStates(): Promise<SuccessResponse<any>> {
    const data = await this.statesService.getAllStates();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular state details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid state id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetStateInfoDto })
  @Get('/:id')
  protected async getStateInfo(@Param('id') id: string) : Promise<SuccessResponse<GetStateInfoDto>> {
    const data = await this.statesService.getStateInfo(id);
    return { data };
  };

  @Post('getCountryStates')
  protected async getCountryStates(@Body() countryStateDto: CountryStateDto) : Promise<SuccessResponse<GetStateInfoDto>> {
    const data = await this.statesService.getCountryStates(countryStateDto);
    return { data };
  };
}
