import { Controller, Get, Post, Body, HttpCode, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { CityService } from '../../services/city.service';
import { StatesService } from '../../services/states.service';
import { CountryService } from '../../services/country.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { CountryStateDto, StateCityDto } from '../../dto/address-dto';
import { GetCityInfoDto } from '../city/dto/response-city.dto';

@Controller('user/address')
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

  @ApiOperation({ summary: 'Insert Country' })
  @ApiResponse({ status: 200, description: 'Success'})
  @ApiBadRequestResponse({ description: 'Invalid id or Country' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importCountry')
  @HttpCode(200)
  protected async bulckCountryInsert() : Promise<SuccessResponse<any>> {
    const data = await this.countryService.importCountries();
    return { data };
  }

  @ApiOperation({ summary: 'Insert Country' })
  @ApiResponse({ status: 200, description: 'Success'})
  @ApiBadRequestResponse({ description: 'Invalid id or Country' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importState')
  @HttpCode(200)
  protected async bulckStateInsert() : Promise<SuccessResponse<any>> {
    const data = await this.stateService.importStates();
    return { data };
  }

  @ApiOperation({ summary: 'Insert City' })
  @ApiResponse({ status: 200, description: 'Success'})
  @ApiBadRequestResponse({ description: 'Invalid id or Country' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importCities')
  @HttpCode(200)
  protected async bulckCityInsert() : Promise<SuccessResponse<any>> {
    const data = await this.cityService.importCities();
    return { data };
  }
}
