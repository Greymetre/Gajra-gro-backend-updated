import { Controller, Get, Post, Body, Query,Patch, Param, Delete, HttpCode, Req, UseInterceptors } from '@nestjs/common';
import { RedemptionService } from '../../services/redemption.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StatusRedemptionDto, UpdateRedemptionDto,StatussRedemptionDto } from './dto/request-redemption.dto';
import {  GetRedemptionInfoDto } from './dto/response-redemption.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';



import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

import { ApprovedRedemptionDto, CreateNeftRedemptionDto, CreateUpiRedemptionDto, FilterPaginationRedemptionsDto, RejectRedemptionDto, TransferRedemptionDto } from 'src/dto/redemption-dto';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
const ObjectId = require('mongoose').Types.ObjectId;
@Controller('user/redemptions')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) { }

  @ApiOperation({ summary: 'Add Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  protected async createRedemption(@Req() req: Request, @Body() createRedemptionDto: CreateNeftRedemptionDto): Promise<any> {
    return this.redemptionService.redemptionViaNeft(createRedemptionDto);
  }

  @ApiOperation({ summary: 'Get all beatschedules' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @Get()
  protected async getRedemption(@Body() paginationDto: FilterPaginationRedemptionsDto): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getAllRedemption(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get all beatschedules' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @Post('all')
  protected async getAllRedemption(@Body() paginationDto: FilterPaginationRedemptionsDto): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getAllRedemption(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular beatschedule details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @Get('/:id')
  protected async getRedemptionInfo(@Param('id') id: string): Promise<SuccessResponse<GetRedemptionInfoDto>> {
    const data = await this.redemptionService.getRedemptionInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'Update Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('updateRedemption')
  @HttpCode(200)
  protected async updateRedemptionInfo(@Body() updateRedemptionDto: UpdateRedemptionDto): Promise<any> {
    // return await this.redemptionService.updateRedemptionItem();
  }

  @Delete(':id')
  protected async deleteRedemption(@Param('id') id: string) {
    return await this.redemptionService.deleteRedemption(id);
  }
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @Patch(':id')
  @HttpCode(200)
  protected async updateRedemptionStatus(@Param('id') id: string, @Body() statussRedemptionDto: StatussRedemptionDto) {
    return await this.redemptionService.updateRedemptionStatus(id,statussRedemptionDto);  
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusRedemptionDto: StatusRedemptionDto) {
    return await this.redemptionService.updateStatus(statusRedemptionDto);
  }

  @Post('couponScans')
  protected async couponScans(@Body() statusRedemptionDto: StatusRedemptionDto) {
    return await this.redemptionService.couponScans(statusRedemptionDto);
  }

  @ApiOperation({ summary: 'Approved Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('approvedRedemption')
  @HttpCode(200)
  protected async approvedRedemption(@Req() req: Request, @Body() approvedRedemptionDto: ApprovedRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    approvedRedemptionDto.approvedBy = ObjectId(authInfo._id)
    const data = await this.redemptionService.approvedRedemption(approvedRedemptionDto);
    return { data };
  }

  @ApiOperation({ summary: 'Reject Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('rejectRedemption')
  @HttpCode(200)
  protected async rejectRedemption(@Req() req: Request, @Body() rejectRedemptionDto: RejectRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    rejectRedemptionDto.rejectedBy = ObjectId(authInfo._id)
    const data = await this.redemptionService.rejectedRedemption(rejectRedemptionDto);
    return { data };
  }

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('transferRedemption')
  @HttpCode(200)
  protected async transferRedemption(@Req() req: Request, @Body() transferDto: TransferRedemptionDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    transferDto.paidBy = ObjectId(authInfo._id)
    const data = await this.redemptionService.transferRedemption(transferDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get Customer Balance' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getCustomerBalance')
  @HttpCode(200)
  protected async getCustomerBalance(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getCustomerBalancePoint(customerIdDTO.customerid)
    return { data };
  }

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('neftRedemption')
  @HttpCode(200)
  protected async createNeftRedemption(@Req() req: Request, @Body() neftRedemption: CreateNeftRedemptionDto): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.redemptionViaNeft(neftRedemption)
    return { data };
  }

  @ApiOperation({ summary: 'Upi Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('upiRedemption')
  @HttpCode(200)
  protected async createUpiRedemption(@Req() req: Request, @Body() upiRedemption: CreateUpiRedemptionDto): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.redemptionViaUpi(upiRedemption)
    return { data };
  }

  @ApiOperation({ summary: 'Get Customer all Transactions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Transactions' })
  @Post('customer')
  protected async getAllCustomerTransaction(@Req() req: Request,@Body() customerIdDTO: CustomerIdDTO,@Query('startDate') startDate: string,@Query('endDate') endDate: string): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getAllUserRedemption(startDate,endDate,customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Neft Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Survey' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkStatusChange')
  @HttpCode(200)
  protected async bulkStatusChange(@Req() req: Request, @Body() transferDto: TransferRedemptionDto[]): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const data = await this.redemptionService.bulkStatusChange(transferDto, authInfo._id);
    return { data };
  }

  @ApiOperation({ summary: 'Get PendingRedemptions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetRedemptionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid PendingRedemptions' })
  @Post('getPendingRedemptions')
  protected async getPendingRedemptions(): Promise<SuccessResponse<any>> {
    const data = await this.redemptionService.getPendingRedemptions();
    return { data };
  }
}
