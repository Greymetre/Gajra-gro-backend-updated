import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CountryService } from '../../services/country.service';
import { CreateCountryDto, StatusCountryDto, UpdateCountryDto } from './dto/request-country.dto';
import { GetCountryInfoDto } from './dto/response-country.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
@Controller('user/country')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @ApiOperation({ summary: 'Login into the system' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCountryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createCountry(@Req() req: Request, @Body() createCountryDto: CreateCountryDto): Promise<any> {
    return this.countryService.createCountry(createCountryDto, req);
  };

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

  @Patch(':id')
  protected async updateCountryInfo(@Param('id') id: string, @Body() updateCountryDto: UpdateCountryDto) {
    return await this.countryService.updateCountryInfo(id, updateCountryDto);
  };

  @Delete(':id')
  protected async deleteCountry(@Param('id') id: string) {
    return await this.countryService.deleteCountry(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCountryDto: StatusCountryDto) {
    return await this.countryService.updateStatus(statusCountryDto);
  };

  @Post('getCountryCodes')
  protected async getAllCountryCodes() : Promise<SuccessResponse<any>> { 
    const data = await this.countryService.getCountryCodes();
    return { data };
  };
}
