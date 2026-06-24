import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { LoyaltyschemeService } from '../../services/loyaltyscheme.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateLoyaltyschemeDto, ImportSchemeDetailDto, LoyaltyschemeIDDto, StatusLoyaltyschemeDto, UpdateLoyaltyschemeDto } from './dto/request-loyaltyscheme.dto';
import { GetLoyaltyschemeInfoDto } from './dto/response-loyaltyscheme.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/loyaltyscheme')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class LoyaltyschemeController {
  constructor(private readonly loyaltyService: LoyaltyschemeService) {}

  @ApiOperation({ summary: 'Add Loyaltyscheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination:UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async createLoyaltyscheme(@Req() req: Request, @Body() createLoyaltyschemeDto: CreateLoyaltyschemeDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file => (file.path))
    // const image = await files.image && files.image.map(file => (file.path).replace("dist/", ""))
    // let uploadedUrls:any = await imageName(req,files)
    const image = await files.image && await imageName(req,files.image)
    createLoyaltyschemeDto.schemeImage = await image && image[0];

    const data = await this.loyaltyService.createLoyaltyscheme(createLoyaltyschemeDto, req);
    return { data };
  }

  @ApiOperation({ summary: 'Get all loyaltyschemes' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid loyaltyscheme id' })
  @Get()
  protected async getAllLoyaltyscheme(): Promise<SuccessResponse<any>> {
    const data = await this.loyaltyService.getAllLoyaltyscheme();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular loyaltyscheme details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid loyaltyscheme id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @Get('/:id')
  protected async getLoyaltyschemeInfo(@Param('id') id: string) : Promise<SuccessResponse<GetLoyaltyschemeInfoDto>> {
    const data = await this.loyaltyService.getLoyaltyschemeInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination:UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async updateLoyaltyschemeInfo(@Param('id') id: string, @Req() req: Request, @Body() updateLoyaltyschemeDto: UpdateLoyaltyschemeDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file => (file.path))
    // const image = await files.image && files.image.map(file => (file.path).replace("dist/", ""))
    const image  =  await files.image && await imageName(req,files.image)
    updateLoyaltyschemeDto.schemeImage = await image && image[0];
    return this.loyaltyService.updateLoyaltyschemeInfo(id, updateLoyaltyschemeDto);
  }

  @Delete(':id')
  protected async deleteLoyaltyscheme(@Param('id') id: string) {
    return await this.loyaltyService.deleteLoyaltyscheme(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusLoyaltyschemeDto: StatusLoyaltyschemeDto) {
    return await this.loyaltyService.updateStatus(statusLoyaltyschemeDto);
  }

  @ApiOperation({ summary: 'Add Multiple Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importSchemeDetail')
  @HttpCode(200)
  protected async importProducts(@Req() req: Request, @Body() importSchemeDetailDto: ImportSchemeDetailDto[]): Promise<any> {
    const data = await this.loyaltyService.importSchemeDetail(importSchemeDetailDto);
    return { data };
  }

  @ApiOperation({ summary: 'Add Multiple Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetLoyaltyschemeInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('downloadScheme')
  @HttpCode(200)
  protected async downloadScheme(@Req() req: Request, @Body() loyaltyschemeIDDto: LoyaltyschemeIDDto): Promise<any> {
    const data = await this.loyaltyService.downloadSchemeData(loyaltyschemeIDDto);
    return { data };
  }
  
}
