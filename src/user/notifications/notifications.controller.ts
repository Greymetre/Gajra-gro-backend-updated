import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, HttpCode, Param, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { promises as fs } from 'fs';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { PERMISSIONSETTING } from 'src/common/constants';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { UploadFilesHelper } from 'src/common/utils/helper.service';
import { SettingService } from '../../services/setting.service';
import { NEWS_IMAGE_MAX_BYTES, NEWS_IMAGE_TYPES, NotificationsService } from '../../services/notifications.service';
import { NewsFilterDto, SendNewsDto } from './dto/create-notification.dto';

const IMAGE_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// CRM News Management (same flow as Duke's notification-management): pick State / District / City /
// Customers, then send a title, message and optional image as a push + in-app notification.
@ApiTags('User News Management')
@Controller('user/notifications')
@UseInterceptors(TransformInterceptor)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly settingService: SettingService,
  ) { }

  // Role permissions are matched exactly (case-insensitive), as in the Cashfree report.
  private async assertAccess(req: Request, permission: string): Promise<string> {
    const authInfo = await getAuthUserInfo(req.headers);
    const userType = String(authInfo?.userType || '').trim().toLowerCase();
    const denied = new ForbiddenException({ isError: true, message: 'You do not have access to News Management' });
    if (!authInfo?._id || !userType) throw denied;
    const roles = await this.settingService.getRolePermissions().catch(() => []);
    const role = Array.isArray(roles)
      ? roles.find((item) => String(item?.role || '').trim().toLowerCase() === userType)
      : null;
    if (!Array.isArray(role?.canAccess) || !role.canAccess.includes(permission)) throw denied;
    return String(authInfo._id);
  }

  @ApiOperation({ summary: 'States, districts, cities and customers for the selected filters' })
  @Get('filters')
  @Header('Cache-Control', 'no-store')
  async getFilters(@Req() req: Request, @Query() query: NewsFilterDto) {
    await this.assertAccess(req, PERMISSIONSETTING.NEWS_READ);
    return { data: await this.notificationsService.getFilters(query) };
  }

  @ApiOperation({ summary: 'Send news to the matching customers (push + in-app)' })
  @Post('send')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: UploadFilesHelper.s3DestinationPath,
      filename: (_req, file, cb) =>
        cb(null, `notification_${Date.now()}_${Math.round(Math.random() * 1e9)}.${IMAGE_EXTENSIONS[file.mimetype] || 'jpg'}`),
    }),
    limits: { fileSize: NEWS_IMAGE_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => NEWS_IMAGE_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException('Image must be JPG, PNG or WebP'), false),
  }))
  async send(@Req() req: Request, @Body() body: SendNewsDto, @UploadedFile() image?: Express.Multer.File) {
    let userId: string;
    try {
      userId = await this.assertAccess(req, PERMISSIONSETTING.NEWS_SEND);
    } catch (error) {
      if (image?.path) await fs.unlink(image.path).catch(() => undefined);
      throw error;
    }
    // sendNews removes the temporary upload itself
    return this.notificationsService.sendNews(body, image, userId);
  }

  @ApiOperation({ summary: 'News sent from CRM, newest first' })
  @Get('history')
  @Header('Cache-Control', 'no-store')
  async history(@Req() req: Request, @Query('page') page = 1, @Query('limit') limit = 20) {
    await this.assertAccess(req, PERMISSIONSETTING.NEWS_READ);
    return { data: await this.notificationsService.getHistory(page, limit) };
  }

  @ApiOperation({ summary: 'Delete a sent news (removed from News History and from the app list)' })
  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = await this.assertAccess(req, PERMISSIONSETTING.NEWS_DELETE);
    return this.notificationsService.deleteNews(id, userId);
  }
}
