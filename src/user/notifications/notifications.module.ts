import { Module } from '@nestjs/common';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService]
})
export class NotificationsModule {}
