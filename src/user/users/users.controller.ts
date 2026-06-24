import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseInterceptors, HttpCode, UsePipes, ValidationPipe, UploadedFiles } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from '../../services/users.service';
import { SuccessResponse } from '../../common/interfaces/response';
import { UserResponseDto } from './dto/users.response.dto'
import { StatusUserDto, CreateUserDto, UpdateUserDto } from './dto/user.request.dto'
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';

@Controller('user/users')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class UsersController {
  constructor(private readonly userService: UsersService) {}
  @ApiOperation({ summary: 'Create New User' })
  @ApiResponse({ status: 200, description: 'Success', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
  ], {
    storage: diskStorage({
        // destination: UploadFilesHelper.destinationPath,
        // filename: UploadFilesHelper.customFileName,
        destination:UploadFilesHelper.s3DestinationPath,
        filename: UploadFilesHelper.customFileName,
    })
},))

  protected async createUser(@Req() req: Request, @Body() createUserDto: CreateUserDto, @UploadedFiles() files: { avatar?: Express.Multer.File[] } ): Promise<any> {
    // const avatar = await files.avatar && files.avatar.map(file => (file.path).replace("dist/", ""));

    let uploadedUrls:any = await files.avatar && await imageName(req,files.avatar)
    const avatar = uploadedUrls;
    // const avatar = await files.avatar && files.avatar.map(file => file.path)
    
    createUserDto.avatar = await avatar && avatar[0];
    const authInfo = await getAuthUserInfo(req.headers)
    createUserDto.createdBy = authInfo._id
    return await this.userService.createUser(createUserDto);
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid user id' })
  @Get()
  protected async getAllUsers(): Promise<SuccessResponse<any>> {
    const data = await this.userService.getAllUsers();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular user details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid user id' })
  @ApiResponse({ status: 200, description: 'Success', type: UserResponseDto })
  @Get('/:id')
  @ApiBearerAuth()
  protected async getUserInfo(@Param('id') id: string) : Promise<SuccessResponse<UserResponseDto>> {
    const data = await this.userService.getUserInfo(id);
    return { data };
  }

  
  @ApiOperation({ summary: 'Update User' })
  @ApiResponse({ status: 200, description: 'Success', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Error in user update' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
  ], {
    storage: diskStorage({
        // destination: UploadFilesHelper.destinationPath,
        // filename: UploadFilesHelper.customFileName,

        destination:UploadFilesHelper.s3DestinationPath,
        filename: UploadFilesHelper.customFileName,
    })
},))
  protected async updateUserInfo(@Param('id') id: string,@Req() req: Request, @Body() updateUserDto: UpdateUserDto, @UploadedFiles() files: { avatar?: Express.Multer.File[] } ): Promise<any> {
    // const avatar = await files.avatar && files.avatar.map(file => (file.path).replace("dist/", ""))
    // const avatar = await files.avatar && files.avatar.map(file => file.path)

    let uploadedUrls:any = await files.avatar &&  await imageName(req,files.avatar)
    const avatar = uploadedUrls;
    updateUserDto.avatar = await avatar && avatar[0];
    return await this.userService.updateUserInfo(id, updateUserDto);
  }

  @Delete(':id')
  protected async deleteUser(@Param('id') id: string) {
    return await this.userService.deleteUser(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusUserDto: StatusUserDto) {
    return await this.userService.updateStatus(statusUserDto);
  }

  @Post('insertManyUsers')
  protected async insertManyUsers(@Req() req: Request) {
    return await this.userService.insertManyUsers();
  }

  @ApiOperation({ summary: 'User DropDown List' })
  @ApiResponse({ status: 200, description: 'Success', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('dropdown')
  @HttpCode(200)
  protected async getUsersDropDown(@Req() req: Request) : Promise<SuccessResponse<any>> {
    const data = await this.userService.getUsersDropDown();
    return { data };
  }

}
