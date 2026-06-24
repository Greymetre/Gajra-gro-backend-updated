import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors } from '@nestjs/common';
import { BeatschedulesService } from '../../services/beatschedules.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateBeatscheduleDto, StatusBeatscheduleDto, UpdateBeatscheduleDto } from './dto/request-beatschedule.dto';
import { GetBeatscheduleInfoDto } from './dto/response-beatschedule.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/beatschedules')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class BeatschedulesController {
  constructor(private readonly beatscheduleService: BeatschedulesService) {}

  @ApiOperation({ summary: 'Add Beatschedule' })
  @ApiResponse({ status: 200, description: 'Success', type: GetBeatscheduleInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploaded/schemes'
    })
  }))
  protected async createBeatschedule(@Req() req: Request, @Body() createBeatscheduleDto: CreateBeatscheduleDto): Promise<any> {
    return this.beatscheduleService.createBeatschedule(createBeatscheduleDto, req);
  };

  @ApiOperation({ summary: 'Get all beatschedules' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetBeatscheduleInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @Get()
  protected async getAllBeatschedule(): Promise<SuccessResponse<any>> {
    const data = await this.beatscheduleService.getAllBeatschedule();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular beatschedule details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetBeatscheduleInfoDto })
  @Get('/:id')
  protected async getBeatscheduleInfo(@Param('id') id: string) : Promise<SuccessResponse<GetBeatscheduleInfoDto>> {
    const data = await this.beatscheduleService.getBeatscheduleInfo(id);
    return { data };
  };

  @Patch(':id')
  protected async updateBeatscheduleInfo(@Param('id') id: string, @Body() updateBeatscheduleDto: UpdateBeatscheduleDto) {
    return await this.beatscheduleService.updateBeatscheduleInfo(id, updateBeatscheduleDto);
  };

  @Delete(':id')
  protected async deleteBeatschedule(@Param('id') id: string) {
    return await this.beatscheduleService.deleteBeatschedule(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusBeatscheduleDto: StatusBeatscheduleDto) {
    return await this.beatscheduleService.updateStatus(statusBeatscheduleDto);
  };
}
