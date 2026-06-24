import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { SurveyquestionsService } from '../../services/surveyquestions.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateSurveyquestionDto, StatusSurveyquestionDto, UpdateSurveyquestionDto } from './dto/request-surveyquestion.dto';
import { GetSurveyquestionInfoDto } from './dto/response-surveyquestion.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/surveyquestions')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class SurveyquestionsController {
  constructor(private readonly surveyquestionsService: SurveyquestionsService) {}
  @ApiOperation({ summary: 'Add Surveyquestion' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSurveyquestionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createSurveyquestion(@Req() req: Request, @Body() createSurveyquestionDto: CreateSurveyquestionDto): Promise<any> {
    return this.surveyquestionsService.createSurveyquestion(createSurveyquestionDto, req);
  }

  @ApiOperation({ summary: 'Get all surveyquestions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetSurveyquestionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid surveyquestion id' })
  @Get()
  protected async getAllSurveyquestion(): Promise<SuccessResponse<any>> {
    const data = await this.surveyquestionsService.getAllSurveyquestion();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular surveyquestion details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid surveyquestion id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSurveyquestionInfoDto })
  @Get('/:id')
  protected async getSurveyquestionInfo(@Param('id') id: string) : Promise<SuccessResponse<GetSurveyquestionInfoDto>> {
    const data = await this.surveyquestionsService.getSurveyquestionInfo(id);
    return { data };
  }

  @Patch(':id')
  protected async updateSurveyquestionInfo(@Param('id') id: string, @Body() updateSurveyquestionDto: UpdateSurveyquestionDto) {
    return await this.surveyquestionsService.updateSurveyquestionInfo(id, updateSurveyquestionDto);
  }

  @Delete(':id')
  protected async deleteSurveyquestion(@Param('id') id: string) {
    return await this.surveyquestionsService.deleteSurveyquestion(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusSurveyquestionDto: StatusSurveyquestionDto) {
    return await this.surveyquestionsService.updateStatus(statusSurveyquestionDto);
  }
}
