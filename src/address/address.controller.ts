import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../common/interfaces/response';
import { Request } from 'express';
import { CityService } from '../services/city.service';
import { StatesService } from '../services/states.service';
import { CountryService } from '../services/country.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { CountryStateDto, StateCityDto } from '../dto/address-dto';
import { GetCityInfoDto } from '../loyalty/city/dto/response-city.dto';

@Controller('address')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class AddressController {
  constructor(private readonly cityService: CityService, private readonly stateService: StatesService, private readonly countryService: CountryService) {}
  @ApiOperation({ summary: 'Get all city' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCityInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid city id' })
  @Get()
  protected async getAllCountries(): Promise<SuccessResponse<any>> {
    const data = await this.countryService.getCountryDropDown();
    return { data };
  }
  
  @Post('getStates')
  protected async getStates(@Body() countryStateDto: CountryStateDto) : Promise<SuccessResponse<any>> {
    const data = await this.stateService.getStateDropDown(countryStateDto);
    return { data };
  }
  @Post('getCities')
  protected async getCities(@Body() stateCityDto: StateCityDto) : Promise<SuccessResponse<any>> {
    const data = await this.cityService.getCityDropDown(stateCityDto);
    return { data };
  }
  
}
