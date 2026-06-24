import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, Req, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CategoryService } from '../../services/category.service';
import { CreateCategoryDto, StatusCategoryDto, UpdateCategoryDto } from './dto/request-category.dto';
import { GetCategoryInfoDto } from './dto/response-category.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { Types } from 'mongoose';

@Controller('user/category')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @ApiOperation({ summary: 'Login into the system' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
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
  protected async createCategory(@Req() req: Request, @Body() createCategoryDto: CreateCategoryDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file =>(file.path))
    let image:any = await files.image && await imageName(req,files.image)
    // const image = await files.image && files.image.map(file =>(file.path).replace("dist/", ""))
    createCategoryDto.categoryImage = await image && image[0];
    return this.categoryService.createCategory(createCategoryDto, req);
  };


  @ApiOperation({ summary: 'Get all category' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid category id' })
  @Get()
  protected async getAllCategories(): Promise<SuccessResponse<any>> {
    const data = await this.categoryService.getAllCategories();
    return { data };
  };

  @ApiOperation({ summary: 'Get particular category details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid category id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCategoryInfoDto })
  @Get('info/:id')
  protected async getCategoryInfo(@Param('id') id: string): Promise<SuccessResponse<GetCategoryInfoDto>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }
    const data = await this.categoryService.getCategoryInfo(id);
    return { data };
  };

  @ApiOperation({ summary: 'Category Update' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCategoryInfoDto })
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

  protected async updateCategoryInfo(@Req() req: Request,@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.image && files.image.map(file => (file.path))
    // const image = await files.image && files.image.map(file => (file.path).replace("dist/", ""))
    let image:any =await files.image && await imageName(req,files.image)
    updateCategoryDto.categoryImage = await image && image[0];
    return this.categoryService.updateCategoryInfo(id, updateCategoryDto);
  };


  @Delete(':id')
  protected async deleteCategory(@Param('id') id: string) {
    return await this.categoryService.deleteCategory(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCategoryDto: StatusCategoryDto) {
    return await this.categoryService.updateStatus(statusCategoryDto);
  };
  @Post('importCategory')
  protected async importSubCategory(): Promise<any> {
    return await this.categoryService.importCategory();
  };
  @ApiOperation({ summary: 'Get Category DropDown' })
  @ApiResponse({ status: 200, description: 'Category is available', type: GetCategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Category' })
  @Get('dropdown')
  protected async getCategoryDropDown(): Promise<SuccessResponse<any>> {
    const data = await this.categoryService.getCategoryDropDown();
    return { data };
  };
  
}
