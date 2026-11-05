import { Controller, Get, Header, HttpCode, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { getCustomerAuthInfo } from 'src/common/utils/jwt.helper';
import { NotificationsService } from '../../services/notifications.service';

// Mobile app notification screen: news sent from CRM News Management to the logged-in customer.
@ApiTags('Loyalty Notifications')
@Controller('loyalty/notification')
@UseInterceptors(TransformInterceptor)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @ApiOperation({ summary: 'News for the logged-in customer, newest first (with unseenCount)' })
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() req: Request, @Query('page') page = 1, @Query('limit') limit = 20, @Query('read') read?: string) {
    const authInfo = await getCustomerAuthInfo(req.headers);
    // read=1 -> read only, read=0 -> unread only, missing -> all
    const readFilter = read === '1' || read === 'true' ? true : read === '0' || read === 'false' ? false : undefined;
    return { data: await this.notificationsService.getCustomerNews(authInfo?._id, page, limit, readFilter) };
  }

  @ApiOperation({ summary: 'Mark all news as seen for the logged-in customer' })
  @Post('seen')
  @HttpCode(200)
  async markAllSeen(@Req() req: Request) {
    const authInfo = await getCustomerAuthInfo(req.headers);
    return { data: await this.notificationsService.markCustomerNewsSeen(authInfo?._id) };
  }

  @ApiOperation({ summary: 'Mark one news item as seen for the logged-in customer' })
  @Post(':id/seen')
  @HttpCode(200)
  async markSeen(@Req() req: Request, @Param('id') id: string) {
    const authInfo = await getCustomerAuthInfo(req.headers);
    return { data: await this.notificationsService.markCustomerNewsSeen(authInfo?._id, id) };
  }
}
