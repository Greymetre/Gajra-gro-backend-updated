import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe, Req, UseInterceptors, UploadedFiles, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/entities/users.entity';
import { SettingService } from 'src/services/setting.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BannerProjectSettingDTO, ContactSettingDto, GetSettingInfoDto, ImagePathSettingDTO, LoyaltySettingDto, PermissionDto, ProjectSettingDto } from 'src/dto/setting-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { imageName, UploadFilesHelper } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { PERMISSIONSETTING } from 'src/common/constants/index';
import { YoutubeShortsDto } from 'src/dto/setting-dto';
@Controller('user/setting')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class SettingController {
  constructor(
    private readonly settingService: SettingService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  @ApiOperation({ summary: 'Get all Setting' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: SettingService })
  @ApiBadRequestResponse({ description: 'Invalid sale id' })
  @Get()
  protected async getAdminSetting(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.settingService.getAdminSetting();
    return { data };
  }

  @ApiOperation({ summary: 'Add Banner' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 4 },

  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination: UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  // protected async updateProjectSetting(@Req() req: Request, @Body() projectSettingDto: ProjectSettingDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
  protected async updateProjectSetting(@Req() req: Request, @Body() projectSettingDto: ProjectSettingDto, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    if (files?.image?.length) projectSettingDto.banner = await imageName(req, files.image);
    // projectSettingDto.banner = await files.image && files.image.map(file => file.path)

    return this.settingService.updateProjectSetting(projectSettingDto);
  }

  @ApiOperation({ summary: 'Add Banner' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('uploadBannerImages')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 4 },

  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination: UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async uploadBannerImages(@Req() req: Request, @Body() bannerProjectDto: BannerProjectSettingDTO, @UploadedFiles() files: { image?: Express.Multer.File[] }): Promise<any> {
    bannerProjectDto.banner = await imageName(req, files?.image);
    

    // bannerProjectDto.banner = await files.image && files.image.map(file => (file.path).replace("dist/", ""))
    return { data: await this.settingService.uploadBannerImages(bannerProjectDto) };
  }

  @ApiOperation({ summary: 'Add LoyaltySetting' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Login Required.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('updateLoyaltySetting')
  @HttpCode(200)
  protected async updateLoyaltySetting(@Req() req: Request, @Body() loyaltySettingDto: LoyaltySettingDto): Promise<any> {
    return this.settingService.updateLoyaltySetting(loyaltySettingDto);
  }

  @ApiOperation({ summary: 'Add Contact Setting' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Login Required.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('updateContactSetting')
  @HttpCode(200)
  protected async updateContactSetting(@Req() req: Request, @Body() contactSettingDto: ContactSettingDto): Promise<any> {
    return this.settingService.updateContactSetting(contactSettingDto);
  }

  @ApiOperation({ summary: 'Add Contact Setting' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Login Required.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getCustomerType')
  @HttpCode(200)
  protected async getCustomerType(): Promise<any> {
    const data = await this.settingService.getCustomerType();
    return { data };
  }

  @ApiOperation({ summary: 'Add Contact Setting' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Login Required.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getRedeemTypes')
  @HttpCode(200)
  protected async getRedeemTypes(): Promise<any> {
    const data = await this.settingService.getRedeemTypes();
    return { data };
  }

  @ApiOperation({ summary: 'Get Reject Reason' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Reject Reason' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getRejectReason')
  @HttpCode(200)
  protected async getRejectReason(): Promise<any> {
    const data = await this.settingService.getRejectReason();
    return { data };
  }

  @ApiOperation({ summary: 'Get Roles' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid Roles' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getRoles')
  @HttpCode(200)
  protected async getRoles(): Promise<any> {
    const data = await this.settingService.getRoles();
    return { data };
  }

  @ApiOperation({ summary: 'Get SchemeType' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid LoyaltySchemeType' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getSchemeType')
  @HttpCode(200)
  protected async getSchemeType(): Promise<any> {
    const data = await this.settingService.getSchemeType();
    return { data };
  }

  @ApiOperation({ summary: 'Get Scheme Based On' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid LoyaltySchemeType' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getSchemeBasedOn')
  @HttpCode(200)
  protected async getSchemeBasedOn(): Promise<any> {
    const data = await this.settingService.getSchemeBasedOn();
    return { data };
  }

  @ApiOperation({ summary: 'Permissions Setting' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Login Required.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('updatePermission')
  @HttpCode(200)
  protected async updatePermissionSetting(@Req() req: Request, @Body() body: PermissionDto[]): Promise<any> {
    // Only a CRM user whose own role has permission.update may change roles (app tokens share the JWT secret)
    const authInfo = await getAuthUserInfo(req.headers);
    const userId = authInfo?._id ? String(authInfo._id) : '';
    if (!userId || !Types.ObjectId.isValid(userId) || !(await this.userModel.exists({ _id: userId }))) {
      throw new ForbiddenException({ isError: true, message: 'Only CRM users can change permissions' });
    }
    const current: { role: string; canAccess: string[] }[] = await this.settingService.getRolePermissions();
    const callerRole = SettingService.findRole(current, authInfo?.userType);
    if (!callerRole?.canAccess?.includes(PERMISSIONSETTING.PERMISSION_UPDATE)) {
      throw new ForbiddenException({ isError: true, message: 'You do not have permission to change permissions' });
    }

    // Clean the list: role names trimmed and unique, only known permissions (plus any the role already had)
    const known = new Set<string>(Object.values(PERMISSIONSETTING));
    const items = Array.isArray(body) ? body : Object.values(body || {});
    if (!items.length || items.length > 50) throw new BadRequestException('Send between 1 and 50 roles');
    const seen = new Set<string>();
    const roles = items.map((item: any) => {
      const role = typeof item?.role === 'string' ? item.role.trim().replace(/\s+/g, ' ') : '';
      if (!role || role.length > 50) throw new BadRequestException('Every role needs a name (max 50 characters)');
      const key = role.toLowerCase();
      if (seen.has(key)) throw new BadRequestException(`Role "${role}" is added twice`);
      seen.add(key);
      const before = current.find((r) => String(r?.role || '').trim().toLowerCase() === key);
      const had = new Set<string>(Array.isArray(before?.canAccess) ? before.canAccess : []);
      const canAccess = Array.isArray(item?.canAccess) ? item.canAccess : [];
      return {
        role,
        canAccess: Array.from(new Set<string>(canAccess.filter((p: any) => typeof p === 'string' && (known.has(p) || had.has(p))))),
      };
    });

    // A role that disappears (removed or renamed) must not leave its users without permissions
    const removed = current.filter((r) => r?.role && !seen.has(String(r.role).trim().toLowerCase()));
    for (const role of removed) {
      const name = String(role.role).trim();
      const users = await this.userModel.countDocuments({ userType: { $regex: `^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, $options: 'i' } });
      if (users) throw new BadRequestException(`Role "${name}" is assigned to ${users} user(s). Move them to another role before removing or renaming it.`);
    }

    // Nobody can lock themselves out of this page
    const callerAfter = SettingService.findRole(roles, authInfo?.userType);
    if (!callerAfter?.canAccess?.includes(PERMISSIONSETTING.PERMISSION_UPDATE)) {
      throw new BadRequestException('You cannot remove permission.update from your own role');
    }

    const data = await this.settingService.updatePermissionSetting(roles);
    return { message: 'Permissions saved', data };
  }

  @ApiOperation({ summary: 'Get Scheme Based On' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid LoyaltySchemeType' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getPermissions')
  @HttpCode(200)
  protected async getPermissions(@Req() req: Request): Promise<any> {
    const authInfo = await getAuthUserInfo(req.headers)
    const data = await this.settingService.getPermissions((authInfo.userType) ? authInfo.userType : '');
    return { data };
  }

  @ApiOperation({ summary: 'Get Scheme Based On' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid LoyaltySchemeType' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('permissions')
  @HttpCode(200)
  protected async getPermissionName(@Req() req: Request): Promise<any> {
    const data = Object.values(PERMISSIONSETTING)
    return { data };
  }

  @ApiOperation({ summary: 'Get Scheme Based On' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid LoyaltySchemeType' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getRolePermissions')
  @HttpCode(200)
  protected async getRolePermissions(): Promise<any> {
    const data = await this.settingService.getRolePermissions();
    return { data };
  }

  @ApiOperation({ summary: 'Get Call Types' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid CallTypes' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getCallTypes')
  @HttpCode(200)
  protected async getCallTypes(): Promise<any> {
    const data = await this.settingService.getCallTypes();
    return { data };
  }

  @ApiOperation({ summary: 'Get Call Status' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid CallStatus' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Get('getCallStatus')
  @HttpCode(200)
  protected async getCallStatus(): Promise<any> {
    const data = await this.settingService.getCallStatus();
    return { data };
  }
  @ApiOperation({ summary: 'Remove Image' })
  @ApiResponse({ status: 200, description: 'Success', type: GetSettingInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('removeBannerImage')
  @HttpCode(200)
  protected async removeBannerImage(@Body() imagepathDto: ImagePathSettingDTO): Promise<any> {
    return this.settingService.removeBannerImage(imagepathDto);
  }

  @Post('/youtube-shorts')
async updateYoutubeShorts(
  @Body() youtubeShortsDto: YoutubeShortsDto,
) {
  return await this.settingService.updateYoutubeShorts(
    youtubeShortsDto,
  );
}

@Get('/youtube-shorts')
async getYoutubeShorts() {
  const data = await this.settingService.getYoutubeShorts();

  return { data };
}


}
