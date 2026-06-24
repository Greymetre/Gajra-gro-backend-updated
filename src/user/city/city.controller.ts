import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { CityService } from '../../services/city.service';
import { CreateCityDto, StatusCityDto, UpdateCityDto, PincodeCityDto , StateCityDto } from './dto/request-city.dto';
import { GetCityInfoDto } from './dto/response-city.dto';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { PaginationRequestDto } from 'src/dto/pagination-dto';

@Controller('user/city')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @ApiOperation({ summary: 'Login into the system' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCityInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createCity(@Req() req: Request, @Body() createCityDto: CreateCityDto): Promise<any> {
    return this.cityService.createCity(createCityDto, req);
  };

  @ApiOperation({ summary: 'Get all city' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCityInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid city id' })
  @Post('all')
  protected async getAllCities(@Body() paginationDto: PaginationRequestDto): Promise<SuccessResponse<any>> {
    const data = await this.cityService.getAllCitys(paginationDto);
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

  @Patch(':id')
  protected async updateCityInfo(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return await this.cityService.updateCityInfo(id, updateCityDto);
  };

  @Delete(':id')
  protected async deleteCity(@Param('id') id: string) {
    return await this.cityService.deleteCity(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCityDto: StatusCityDto) {
    return await this.cityService.updateStatus(statusCityDto);
  };

  @Post('addPincode')
  protected async addPincode(@Body() pincodeCityDto: PincodeCityDto) {
    return await this.cityService.addPincode(pincodeCityDto);
  };
  @Post('deletePincode')
  protected async deletePincode(@Body() pincodeCityDto: PincodeCityDto) {
    return await this.cityService.deletePincode(pincodeCityDto);
  };
  @Post('getStateCities')
  protected async getStateCities(@Body() stateCityDto: StateCityDto) : Promise<SuccessResponse<any>> {
    const data = await this.cityService.getStateCities(stateCityDto);
    return { data };
  };
}
