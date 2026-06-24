import { Controller, Get, Post, Body, Param, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { CityService } from './city.service';
import { StateCityDto } from './dto/request-city.dto';
import { GetCityInfoDto } from './dto/response-city.dto';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/city')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @ApiOperation({ summary: 'Get all city' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCityInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid city id' })
  @Get()
  protected async getAllCountries(): Promise<SuccessResponse<any>> {
    const data = await this.cityService.getAllCitys();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular city details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid city id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCityInfoDto })
  @Get('/:id')
  protected async getCityInfo(@Param('id') id: string) : Promise<SuccessResponse<GetCityInfoDto>> {
    const data = await this.cityService.getCityInfo(id);
    return { data };
  };

  @Post('getStateCities')
  protected async getStateCities(@Body() stateCityDto: StateCityDto) : Promise<SuccessResponse<any>> {
    const data = await this.cityService.getStateCities(stateCityDto);
    return { data };
  };
}
