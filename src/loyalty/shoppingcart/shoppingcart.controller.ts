import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { ShoppingcartService } from './shoppingcart.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { ShoppingCartDTO } from 'src/dto/shoppingcart-dto'

@Controller('loyalty/shoppingcart')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)

export class ShoppingcartController {
  constructor(private readonly shoppingcartService: ShoppingcartService) {}

  @ApiOperation({ summary: 'Add Beatschedule' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploaded/schemes'
    })
  }))
  protected async createBeatschedule(@Req() req: Request, @Body() shoppingCartDto: ShoppingCartDTO): Promise<any> {
    return this.shoppingcartService.createBeatschedule(shoppingCartDto, req);
  };

  @ApiOperation({ summary: 'Get all beatschedules' })
  @ApiResponse({ status: 200, description: 'Mobile number is available' })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @Get()
  protected async getAllBeatschedule(): Promise<SuccessResponse<any>> {
    const data = await this.shoppingcartService.getAllBeatschedule();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular beatschedule details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid beatschedule id' })
  @ApiResponse({ status: 200, description: 'Success',})
  @Get('/:id')
  protected async getBeatscheduleInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.shoppingcartService.getBeatscheduleInfo(id);
    return { data };
  };

  @Patch(':id')
  protected async updateBeatscheduleInfo(@Param('id') id: string, @Body() shoppingCartDto: ShoppingCartDTO) {
    return await this.shoppingcartService.updateBeatscheduleInfo(id, shoppingCartDto);
  };

  @Delete(':id')
  protected async deleteBeatschedule(@Param('id') id: string) {
    return await this.shoppingcartService.deleteBeatschedule(id);
  };
}
