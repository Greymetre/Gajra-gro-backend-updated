import { Controller, Get,Param, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CountryService } from './country.service';
import { GetCountryInfoDto } from './dto/response-country.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
@Controller('loyalty/country')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @ApiOperation({ summary: 'Get all countrys' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCountryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid country id' })
  @Get()
  protected async getAllCountries(): Promise<SuccessResponse<any>> {
    const data = await this.countryService.getAllCountries();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular country details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid country id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCountryInfoDto })
  @Get('/:id')
  protected async getCountryInfo(@Param('id') id: string) : Promise<SuccessResponse<GetCountryInfoDto>> {
    const data = await this.countryService.getCountryInfo(id);
    return { data };
  };
}
