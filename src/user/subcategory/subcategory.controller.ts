
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SubcategoryService } from '../../services/subcategory.service';
import { CreateSubcategoryDto, StatusSubcategoryDto, UpdateSubcategoryDto } from './dto/request-subcategory.dto';
import { GetSubcategoryInfoDto } from './dto/response-subcategory.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/subcategory')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @ApiOperation({ summary: 'Login into the system' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSubcategoryInfoDto })
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

  protected async createSubcategory(@Req() req: Request, @Body() createSubcategoryDto: CreateSubcategoryDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file => (file.path))
    // const image = await files.image && files.image.map(file => (file.path).replace("dist/", ""))

    const image = await imageName(req,files.image)
    createSubcategoryDto.subcategoryImage = await image && image[0];
    return this.subcategoryService.createSubcategory(createSubcategoryDto, req);
  }
 

  @ApiOperation({ summary: 'Get all subcategory' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetSubcategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid subcategory id' })
  @Get()
  protected async getAllSubcategory(): Promise<SuccessResponse<any>> {
    const data = await this.subcategoryService.getAllSubcategory();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular subcategory details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid subcategory id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSubcategoryInfoDto })
  @Get('/:id')
  protected async getSubcategoryInfo(@Param('id') id: string) : Promise<SuccessResponse<GetSubcategoryInfoDto>> {
    const data = await this.subcategoryService.getSubcategoryInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'SubCategory Update' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSubcategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
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

  protected async updateSubcategoryInfo(@Param('id') id: string,@Req() req: Request, @Body() updateSubcategoryDto: UpdateSubcategoryDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file => (file.path))
    // const image = await files.image && files.image.map(file => (file.path).replace("dist/", ""))

    const image:any  = await files.image && await imageName(req,files.image)
    updateSubcategoryDto.subcategoryImage = await image && image[0];
    return this.subcategoryService.updateSubcategoryInfo(id, updateSubcategoryDto);
  }

  @Delete(':id')
  protected async deleteSubcategory(@Param('id') id: string) {
    return await this.subcategoryService.deleteSubcategory(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusSubcategoryDto: StatusSubcategoryDto) {
    return await this.subcategoryService.updateStatus(statusSubcategoryDto);
  }

  @Post('importSubCategory')
  protected async importSubCategory(@Body() createSubcategoryDto: CreateSubcategoryDto[]): Promise<any> {
    return await this.subcategoryService.importSubCategory(createSubcategoryDto);
  }
}
