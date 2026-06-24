import { Controller, Get, Param, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { GetCategoryInfoDto } from './dto/response-category.dto';
import { SuccessResponse } from '../../common/interfaces/response';

import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
@Controller('loyalty/category')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Get all category' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid category id' })
  @Get()
  protected async getAllCategories(): Promise<SuccessResponse<any>> {
    const data = await this.categoryService.getAllCategories();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular category details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid category id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCategoryInfoDto })
  @Get('/:id')
  protected async getCategoryInfo(@Param('id') id: string) : Promise<SuccessResponse<GetCategoryInfoDto>> {
    const data = await this.categoryService.getCategoryInfo(id);
    return { data };
  };
}
