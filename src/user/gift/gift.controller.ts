import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { GiftService } from '../../services/gift.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateGiftDto, StatusGiftDto, UpdateGiftDto } from './dto/request-gift.dto';
import { GetGiftInfoDto } from './dto/response-gift.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';

@Controller('user/gift')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class GiftController {
  constructor(private readonly giftService: GiftService) {}

  @ApiOperation({ summary: 'Add Gift' })
  @ApiResponse({ status: 200, description: 'Success', type: GetGiftInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'images', maxCount: 4 },
      ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,

            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
  protected async createGift(@Req() req: Request, @Body() createGiftDto: CreateGiftDto, @UploadedFiles() files: { images?: Express.Multer.File[] } ): Promise<any> {
    // createGiftDto.images = await files.images && files.images.map(file => (file.path))
    // createGiftDto.images = await files.images && files.images.map(file => (file.path).replace("dist/", ""))
    createGiftDto.images = await files.images && await imageName(req,files.images)
    // createGiftDto.images = uploadedUrls;
    return await this.giftService.createGift(createGiftDto, req);
  }

  @ApiOperation({ summary: 'Get all gift' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetGiftInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid gift id' })
  @Get()
  protected async getAllGift(): Promise<SuccessResponse<any>> {
    const data = await this.giftService.getAllGift();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular gift details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid gift id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetGiftInfoDto })
  @Get('/:id')
  protected async getGiftInfo(@Param('id') id: string) : Promise<SuccessResponse<GetGiftInfoDto>> {
    const data = await this.giftService.getGiftInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'Update Gift' })
  @ApiResponse({ status: 200, description: 'Success', type: GetGiftInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'images', maxCount: 4 },
      ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,

            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
  protected async updateGiftInfo(@Param('id') id: string, @Req() req: Request, @Body() updateGiftDto: UpdateGiftDto, @UploadedFiles() files: { images?: Express.Multer.File[] } ): Promise<any> {
    // updateGiftDto.images = await files.images && files.images.map(file => (file.path).replace("dist/", ""))
    // updateGiftDto.images = await files.images && files.images.map(file => (file.path))
    updateGiftDto.images = await files.images && await imageName(req,files.images)
    // updateGiftDto.images = uploadedUrls;
    return await this.giftService.updateGiftInfo(id,updateGiftDto, req);
  }

  @Delete(':id')
  protected async deleteGift(@Param('id') id: string) {
    return await this.giftService.deleteGift(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusGiftDto: StatusGiftDto) {
    return await this.giftService.updateStatus(statusGiftDto);
  }
}
