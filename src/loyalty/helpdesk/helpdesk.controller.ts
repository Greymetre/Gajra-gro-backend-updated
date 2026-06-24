import { Controller, Get, Post, Body, Param, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { HelpdeskService } from './helpdesk.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateHelpDeskDto } from 'src/dto/helpdesk-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
@Controller('loyalty/helpdesk')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  @ApiOperation({ summary: 'Add Redemption' })
  @ApiResponse({ status: 200, description: 'Success', type: HelpdeskService })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
      { name: 'image', maxCount: 2 },
    ], {
      storage: diskStorage({
          // destination: UploadFilesHelper.destinationPath,
          // filename: UploadFilesHelper.customFileName,

          destination:UploadFilesHelper.s3DestinationPath,
          filename: UploadFilesHelper.customFileName,
      })
  },))
  protected async createRedemption(@Req() req: Request, @Body() createHelpdeskDTO: CreateHelpDeskDto , @UploadedFiles() files: { image?: Express.Multer.File[]}): Promise<any> {
    // createHelpdeskDTO.files = await files.image && files.image.map(file => (file.path))
    // createHelpdeskDTO.files = await files.image && files.image.map(file => (file.path).replace("dist/", ""))
    createHelpdeskDTO.files = await files.image && await imageName(req,files.image)
    createHelpdeskDTO.ticketNo = Date.now()
    return await this.helpdeskService.createNewHelpdesk(createHelpdeskDTO, req);
  };

  @ApiOperation({ summary: 'Get all helpdesk' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: HelpdeskService })
  @ApiBadRequestResponse({ description: 'Invalid helpdesk id' })
  @Get()
  protected async getAllHelpdesk(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.helpdeskService.getAllHelpdesk(req);
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular helpdesk details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid helpdesk id' })
  @ApiResponse({ status: 200, description: 'Success', type: HelpdeskService })
  @Get('/:id')
  protected async getHelpdeskInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.helpdeskService.getHelpdeskInfo(id);
    return { data };
  };
}
