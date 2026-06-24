import { Controller, Get, Param, UseInterceptors} from '@nestjs/common';
import { SurveyquestionsService } from './surveyquestions.service';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetSurveyquestionInfoDto } from './dto/response-surveyquestion.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/surveyquestions')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class SurveyquestionsController {
  constructor(private readonly surveyquestionsService: SurveyquestionsService) {}

  @ApiOperation({ summary: 'Get all surveyquestions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetSurveyquestionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid surveyquestion id' })
  @Get()
  protected async getAllSurveyquestion(): Promise<SuccessResponse<any>> {
    const data = await this.surveyquestionsService.getAllSurveyquestion();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular surveyquestion details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid surveyquestion id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSurveyquestionInfoDto })
  @Get('/:id')
  protected async getSurveyquestionInfo(@Param('id') id: string) : Promise<SuccessResponse<GetSurveyquestionInfoDto>> {
    const data = await this.surveyquestionsService.getSurveyquestionInfo(id);
    return { data };
  };
}
