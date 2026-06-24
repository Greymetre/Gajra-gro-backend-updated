import { Controller, Get, Post, Body , Req, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {RemarkService} from "./remark.service";
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { SuccessResponse } from '../../common/interfaces/response';
import {CreateRemarkDTO} from "./dto/request-remark.dto"
import { Request } from 'express';
@Controller('remark')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class RemarkController {
constructor(private readonly remarkService: RemarkService) {}

@ApiOperation({ summary: 'add remark' })
@ApiUnauthorizedResponse({ description: 'Login required' })
@ApiBadRequestResponse({ description: 'Invalid city id' })
@ApiResponse({ status: 200, description: 'Success', type: RemarkService })
@Post()
protected async addRemark(@Req() req: Request, @Body() createRemarkDTO: CreateRemarkDTO,): Promise<SuccessResponse<any>> {
  const data = await this.remarkService.addRemark(req,createRemarkDTO);
  return { data };
};

@ApiOperation({ summary: 'Get all remark' })
@ApiResponse({ status: 200, description: 'list remarks', type: RemarkService })
@Get()
protected async getAllSale(): Promise<SuccessResponse<any>> {
  const data = await this.remarkService.getAllRemark();
  return { data };
};
}
