import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from '../user/notifications/dto/create-notification.dto';
import { UpdateNotificationDto } from '../user/notifications/dto/update-notification.dto';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class NotificationsService {
  create(createNotificationDto: CreateNotificationDto) {
    return 'This action adds a new notification';
  };

  findAll() {
    return `This action returns all notifications`;
  };

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  };

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  };

  remove(id: number) {
    return `This action removes a #${id} notification`;
  };
}
