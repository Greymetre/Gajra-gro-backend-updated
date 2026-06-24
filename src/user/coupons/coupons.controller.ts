import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe, Req, UseInterceptors, Query } from '@nestjs/common';
import { CouponProfileService } from '../../services/couponprofile.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CouponImportDto, CouponImportMultipleDto, CouponProfileIdDto, CreateCouponDto, ReplacePackingSlipDto, StatusCouponDto, UpdateCouponDto } from './dto/request-coupon.dto';
import { GetCouponInfoDto } from './dto/response-coupon.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { SearchRequestDto } from 'src/dto/pagination-dto';
const ObjectId = require('mongoose').Types.ObjectId;

@Controller('user/coupons')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CouponsController {
  constructor(private readonly couponService: CouponProfileService) { }

  @ApiOperation({ summary: 'Add Coupon' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCouponInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'pinchin', maxCount: 1 },
    { name: 'punchout', maxCount: 1 },
  ], {
    storage: diskStorage({
      destination: './uploaded/pinchin'
    }),
  }))

  protected async createCoupon(@Req() req: Request, @Body() createCouponDto: CreateCouponDto): Promise<any> {
    const authInfo = await getAuthUserInfo(req.headers)
    createCouponDto.createdBy = authInfo._id
    return this.couponService.createCoupon(createCouponDto);
  };

  @ApiOperation({ summary: 'Get all coupons' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCouponInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid coupon id' })
  @Get()
  protected async getAllCoupon(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const categories = Array.isArray(authInfo.categories) && authInfo.categories.map(category => ObjectId(category))
    const data = await this.couponService.getAllCoupon({ categories, startDate, endDate, search });
    return { data };
  };

  @ApiOperation({ summary: 'Get export coupons with details' })
  @ApiResponse({ status: 200, description: 'Success' })
  @Get('export-all')
  protected async getExportCoupon(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const categories = Array.isArray(authInfo.categories) && authInfo.categories.map(category => ObjectId(category))
    const data = await this.couponService.getExportCoupon({ categories, startDate, endDate });
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular coupon details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid coupon id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCouponInfoDto })
  @Get('/:id')
  protected async getCouponInfo(@Param('id') id: string): Promise<SuccessResponse<any>> {
    const data = await this.couponService.getCouponInfo(id);
    return { data };
  };

  @Patch(':id')
  protected async updateCouponInfo(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return await this.couponService.updateCouponInfo(id, updateCouponDto);
  };

  @Delete(':id')
  protected async deleteCoupon(@Param('id') id: string) {
    return await this.couponService.deleteCoupon(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCouponDto: StatusCouponDto) {
    return await this.couponService.updateStatus(statusCouponDto);
  };

  @ApiOperation({ summary: 'Get all coupons' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCouponInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid coupon id' })
  @Post('couponProfileExport')
  protected async couponProfileExport(@Body() couponProfileDto: CouponProfileIdDto): Promise<SuccessResponse<any>> {
    const data = await this.couponService.couponProfileExport(couponProfileDto);
    return { data };
  };

  @ApiOperation({ summary: 'Import Coupons' })
  @Post('couponExport')
  protected async couponExport(): Promise<SuccessResponse<any>> {
    const data = await this.couponService.couponExport();
    return { data };
  };

  @ApiOperation({ summary: 'Import Coupons' })
  @Post('couponImport')
  protected async couponImport(@Body() couponProfileDto: CouponImportDto): Promise<SuccessResponse<any>> {
    const data = await this.couponService.couponImport(couponProfileDto);
    return { data };
  };

  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCouponInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @Post('search')
  // @UseGuards(PermissionGuard)
  protected async searchCoupons(@Body() searchDto: SearchRequestDto): Promise<SuccessResponse<any>> {
    const data = await this.couponService.searchCoupons(searchDto);
    return { data };
  };


  @ApiOperation({ summary: 'Import Coupons' })
  @Post('couponMultipleImport')
  protected async couponMultipleImport(@Req() req: Request, @Body() couponImportDto: CouponImportMultipleDto): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    couponImportDto.createdBy = authInfo._id
    const data = await this.couponService.couponMultipleImport(couponImportDto);
    return { data };
  };

  @ApiOperation({ summary: 'Replace Packing Slip Number' })
  @ApiResponse({ status: 200, description: 'Packing slip replaced successfully' })
  @ApiBadRequestResponse({ description: 'No records found with the given packing slip' })
  @Post('replacePackingSlip')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async replacePackingSlip(@Body() replaceDto: ReplacePackingSlipDto): Promise<SuccessResponse<any>> {
    const data = await this.couponService.replacePackingSlip(replaceDto.oldPackingSlip, replaceDto.newPackingSlip);
    return { data };
  };

};
