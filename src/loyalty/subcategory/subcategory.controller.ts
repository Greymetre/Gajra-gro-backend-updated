
import { Controller, Get, Param, UseInterceptors} from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SubcategoryService } from './subcategory.service';
import { GetSubcategoryInfoDto } from './dto/response-subcategory.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('loyalty/subcategory')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @ApiOperation({ summary: 'Get all subcategory' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetSubcategoryInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid subcategory id' })
  @Get()
  protected async getAllSubcategory(): Promise<SuccessResponse<any>> {
    const data = await this.subcategoryService.getAllSubcategory();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular subcategory details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid subcategory id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSubcategoryInfoDto })
  @Get('/:id')
  protected async getSubcategoryInfo(@Param('id') id: string) : Promise<SuccessResponse<GetSubcategoryInfoDto>> {
    const data = await this.subcategoryService.getSubcategoryInfo(id);
    return { data };
  };
}
