import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StatesService } from '../../services/states.service';
import { CreateStateDto, StatusStateDto, UpdateStateDto, CountryStateDto } from './dto/request-state.dto';
import { GetStateInfoDto } from './dto/response-state.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/states')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @ApiOperation({ summary: 'Login into the system' })
  @ApiResponse({ status: 200, description: 'Success', type: GetStateInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createState(@Req() req: Request, @Body() createStateDto: CreateStateDto): Promise<any> {
    return this.statesService.createState(createStateDto, req);
  }

  @ApiOperation({ summary: 'Get all states' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetStateInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid state id' })
  @Get()
  protected async getAllStates(): Promise<SuccessResponse<any>> {
    const data = await this.statesService.getAllStates();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular state details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid state id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetStateInfoDto })
  @Get('/:id')
  protected async getStateInfo(@Param('id') id: string) : Promise<SuccessResponse<GetStateInfoDto>> {
    const data = await this.statesService.getStateInfo(id);
    return { data };
  }

  @Patch(':id')
  protected async updateStateInfo(@Param('id') id: string, @Body() updateStateDto: UpdateStateDto) {
    return await this.statesService.updateStateInfo(id, updateStateDto);
  }

  @Delete(':id')
  protected async deleteState(@Param('id') id: string) {
    return await this.statesService.deleteState(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusStateDto: StatusStateDto) {
    return await this.statesService.updateStatus(statusStateDto);
  }
  @Post('getCountryStates')
  protected async getCountryStates(@Body() countryStateDto: CountryStateDto) : Promise<SuccessResponse<GetStateInfoDto>> {
    const data = await this.statesService.getCountryStates(countryStateDto);
    return { data };
  }
}
