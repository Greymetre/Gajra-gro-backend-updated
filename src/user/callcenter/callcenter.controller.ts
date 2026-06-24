import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { CallCenterService } from '../../services/callcenter.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { PaginationRequestDto } from 'src/dto/pagination-dto';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { CreateCallSummaryDTO, GetCallSummaryDto } from 'src/dto/callcenter-dto';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
const ObjectId = require('mongoose').Types.ObjectId;
@Controller('user/callcenter')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CallCenterController {
  constructor(private readonly callCenterService: CallCenterService) {}

  @ApiOperation({ summary: 'Add CallSummary' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)

  protected async createCallSummary(@Req() req: Request, @Body() createCallSummaryDto: CreateCallSummaryDTO): Promise<any> {
    const authInfo = await getAuthUserInfo(req.headers)
    createCallSummaryDto.userid = authInfo._id
    return this.callCenterService.createCallSummary(createCallSummaryDto);
  };
 
  @ApiOperation({ summary: 'Get all callSummary' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid callSummary id' })
  @Post('all')
  protected async getCallSummary(@Req() req: Request, @Body() paginationDto : PaginationRequestDto): Promise<SuccessResponse<any>> {
    const data = await this.callCenterService.getAllCallSummary(paginationDto);
    return { data };
  };
  @ApiOperation({ summary: 'Get paticular callcenter details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid callcenter id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @Get('/:id')
  protected async getCallCenterInfo(@Param('id') id: string) : Promise<SuccessResponse<GetCallSummaryDto>> {
    const data = await this.callCenterService.getCallCenterInfo(id);
    return { data };
  };

  @ApiOperation({ summary: 'Update CallCenter' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  protected async updateCallCenterInfo(@Param('id') id: string, @Body() updateCallCenterDto: CreateCallSummaryDTO): Promise<any> {
    return this.callCenterService.updateCallCenterInfo(id, updateCallCenterDto);
  };

  @Delete(':id')
  protected async deleteCallCenter(@Param('id') id: string) {
    return await this.callCenterService.deleteCallCenter(id);
  };
  @ApiOperation({ summary: 'Bulk Insert CallCenter' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid CallCenter' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkDataInsert')
  @HttpCode(200)
  protected async bulckCustomerInsert() : Promise<SuccessResponse<any>> {
    const data = await this.callCenterService.bulkDataInsert();
    return { data };
  };

  @ApiOperation({ summary: 'Add Multiple CallCenter' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('import')
  @HttpCode(200)
  protected async importProducts(@Req() req: Request, @Body() createCallSummaryDto: CreateCallSummaryDTO[]): Promise<any> {
    const data = await this.callCenterService.importCallSummary(createCallSummaryDto);
    return { data };
  };

  @ApiOperation({ summary: 'Customer CallSummary' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCallSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('customer')
  @HttpCode(200)
  protected async getCustomerCallList(@Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const data = await this.callCenterService.getCustomerCallList(customerIdDTO);
    return { data };
  };
}