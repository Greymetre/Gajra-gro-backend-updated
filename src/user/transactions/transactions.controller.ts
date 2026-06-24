import { Controller, Get, Post, Body, Patch,Query, Param, Delete, HttpCode, Req, UseInterceptors} from '@nestjs/common';
import { TransactionsService } from '../../services/transactions.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CouponsScanDTO, CreateTransactionDto, ProductDropdownDto, StatusCouponDtos, StatusTransactionDto, UpdateTransactionDto } from './dto/request-transaction.dto';
import { GetTransactionInfoDto } from './dto/response-transaction.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { FilterPaginationInvalidCouponDto, FilterPaginationTransactionDto, ImportCouponTransactionDTO, ImportTransactionDTO } from 'src/dto/transaction.dto';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
@Controller('user/transactions')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class TransactionsController {
  constructor(private readonly transactionService: TransactionsService) {}

  @ApiOperation({ summary: 'Add Transaction' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  protected async createTransaction(@Req() req: Request, @Body() createTransactionDto: CreateTransactionDto): Promise<any> {
    return this.transactionService.createTransaction(createTransactionDto, req);
  }

  @ApiOperation({ summary: 'Get all Transactions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Transactions' })
  @Post('all')
  protected async getAllTransaction(@Body() paginationDto:FilterPaginationTransactionDto): Promise<SuccessResponse<any>> {
    const data = await this.transactionService.getAllTransaction(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get all beatschedules' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @Get()
  protected async getTransaction(@Body() paginationDto : FilterPaginationTransactionDto): Promise<SuccessResponse<any>> {
    const data = await this.transactionService.getAllTransaction(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular beatschedule details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @Get('/:id')
  protected async getTransactionInfo(@Param('id') id: string) : Promise<SuccessResponse<GetTransactionInfoDto>> {
    const data = await this.transactionService.getTransactionInfo(id);
    return { data };
  }

  @Patch(':id')
  protected async updateTransactionInfo(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return await this.transactionService.updateTransactionInfo(id, updateTransactionDto);
  }

  @Delete(':id')
  protected async deleteTransaction(@Param('id') id: string) {
    return await this.transactionService.deleteTransaction(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusTransactionDto: StatusTransactionDto) {
    return await this.transactionService.updateStatus(statusTransactionDto);
  }

  @ApiOperation({ summary: 'Coupon Scans' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Coupon' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('couponScans')
  @HttpCode(200)
  protected async couponScans(@Req() req: Request,@Body() couponsScanDTO: CouponsScanDTO) {
    const data = await this.transactionService.couponScans(couponsScanDTO,req);
    return { data };
  }

  @ApiOperation({ summary: 'Get Customer all Transactions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Transactions' })
  @Post('customer')
  protected async getAllCustomerTransaction(@Query('startDate') startDate: string,@Query('endDate') endDate: string,@Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    // protected async getAllCustomerTransaction(@Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    
    const data = await this.transactionService.getAllCustomerTransaction(startDate,endDate,customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Add Multiple Transaction' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importCouponScan')
  @HttpCode(200)
  protected async importCustomers(@Req() req: Request, @Body() importScanDto: ImportCouponTransactionDTO[]): Promise<any> {
    const data = await this.transactionService.importScanTransactions(importScanDto);
    return { data };
  }

  @ApiOperation({ summary: 'Add Multiple Transaction' })
  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importCRTransactions')
  @HttpCode(200)
  protected async importCRTransactions(@Req() req: Request, @Body() importTransactionDTO: ImportTransactionDTO[]): Promise<any> {
    const data = await this.transactionService.importTransactions(importTransactionDTO);
    return { data };
  }


  @ApiOperation({ summary: 'Get all Transactions' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Transactions' })
  @Post('/allInvalidCoupon')
  protected async getAllInvalidCoupon(@Body() paginationDto:FilterPaginationInvalidCouponDto): Promise<SuccessResponse<any>> {
    const data = await this.transactionService.getAllInvalidCoupon(paginationDto);
    return { data };
  }
  

  @Post('/productDropdown')
  protected async productDropdown(@Body() statusCouponDto: ProductDropdownDto) {
    const data =  await this.transactionService.productDropdown(statusCouponDto);
    return { data };
  }

  @ApiResponse({ status: 200, description: 'Success', type: GetTransactionInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Coupon' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('/updateCouponStatus')
  protected async updateCouponStatus(@Req() req: Request,@Body() statusCouponDto: StatusCouponDtos): Promise<SuccessResponse<any>> {
    const data =  await this.transactionService.updateCouponStatus(req,statusCouponDto);
    return { data };
  }


  @Patch()
  protected async test() {
    const data =  await this.transactionService.test();
    return { data };
  }
}