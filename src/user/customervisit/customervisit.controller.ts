import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { CustomervisitService } from '../../services/customervisit.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateCustomervisitDto, StatusCustomervisitDto, UpdateCustomervisitDto } from './dto/request-customervisit.dto';
import { GetCustomervisitInfoDto } from './dto/response-customervisit.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/customervisit')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CustomervisitController {
  constructor(private readonly customervisitService: CustomervisitService) {}
  @ApiOperation({ summary: 'Add Customervisit' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomervisitInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'checkin', maxCount: 1 },
  ],{
    storage: diskStorage({
      destination: './uploaded/checkin'
    }),
  }))
  protected async createCustomervisit(@Req() req: Request, @Body() createCustomervisitDto: CreateCustomervisitDto): Promise<any> {
    return this.customervisitService.createCustomervisit(createCustomervisitDto, req);
  }

  @ApiOperation({ summary: 'Get all customervisits' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCustomervisitInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customervisit id' })
  @Get()
  protected async getAllCustomervisit(): Promise<SuccessResponse<any>> {
    const data = await this.customervisitService.getAllCustomervisit();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular customervisit details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customervisit id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomervisitInfoDto })
  @Get('/:id')
  protected async getCustomervisitInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.customervisitService.getCustomervisitInfo(id);
    return { data };
  }

  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'checkin', maxCount: 1 },
  ],{
    storage: diskStorage({
      destination: './uploaded/checkin'
    }),
  }))
  protected async updateCustomervisitInfo(@Param('id') id: string, @Req() req: Request, @Body() updateCustomervisitDto: UpdateCustomervisitDto) {
    return await this.customervisitService.updateCustomervisitInfo(id, updateCustomervisitDto);
  }

  @Delete(':id')
  protected async deleteCustomervisit(@Param('id') id: string) {
    return await this.customervisitService.deleteCustomervisit(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCustomervisitDto: StatusCustomervisitDto) {
    return await this.customervisitService.updateStatus(statusCustomervisitDto);
  }
}
