import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { BeatsService } from '../../services/beats.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateBeatDto, UpdateBeatDto, StatusBeatDto, BeatCustomersDto, BeatUsersDto } from './dto/request-beat.dto';
import { GetBeatInfoDto } from './dto/response-beat.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/beats')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class BeatsController {
  constructor(private readonly beatsService: BeatsService) {}
  @ApiOperation({ summary: 'Add Beat' })
  @ApiResponse({ status: 200, description: 'Success', type: GetBeatInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createBeat(@Req() req: Request, @Body() createBeatDto: CreateBeatDto): Promise<any> {
    return this.beatsService.createBeat(createBeatDto, req);
  };

  @ApiOperation({ summary: 'Get all beats' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetBeatInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid beat id' })
  @Get()
  protected async getAllBeat(): Promise<SuccessResponse<any>> {
    const data = await this.beatsService.getAllBeat();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular beat details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid beat id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetBeatInfoDto })
  @Get('/:id')
  protected async getBeatInfo(@Param('id') id: string) : Promise<SuccessResponse<GetBeatInfoDto>> {
    const data = await this.beatsService.getBeatInfo(id);
    return { data };
  };

  @Patch(':id')
  protected async updateBeatInfo(@Param('id') id: string, @Body() updateBeatDto: UpdateBeatDto) {
    return await this.beatsService.updateBeatInfo(id, updateBeatDto);
  };

  @Delete(':id')
  protected async deleteBeat(@Param('id') id: string) {
    return await this.beatsService.deleteBeat(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusBeatDto: StatusBeatDto) {
    return await this.beatsService.updateStatus(statusBeatDto);
  };
  
  @Post('addUsers')
  protected async addUsers(@Body() pincodeCityDto: BeatUsersDto) {
    return await this.beatsService.addUsers(pincodeCityDto);
  };

  @Post('deleteUsers')
  protected async deleteUsers(@Body() pincodeCityDto: BeatUsersDto) {
    return await this.beatsService.deleteUsers(pincodeCityDto);
  };

  @Post('addCustomers')
  protected async addCustomers(@Body() pincodeCityDto: BeatCustomersDto) {
    return await this.beatsService.addCustomers(pincodeCityDto);
  };

  @Post('deleteCustomers')
  protected async deleteCustomers(@Body() pincodeCityDto: BeatCustomersDto) {
    return await this.beatsService.deleteCustomers(pincodeCityDto);
  };
}
