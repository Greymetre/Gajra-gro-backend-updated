import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from '../../services/notifications.service';
import { SettingService } from '../../services/setting.service';
import { NotificationsController } from './notifications.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Notification, NotificationSchema } from '../../entities/notification.entity';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { State, StateSchema } from '../../entities/state.entity';
import { District, DistrictSchema } from '../../entities/district.entity';
import { City, CitySchema } from '../../entities/city.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: State.name, schema: StateSchema },
      { name: District.name, schema: DistrictSchema },
      { name: City.name, schema: CitySchema },
      { name: SettingProject.name, schema: SettingProjectSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, SettingService],
})
export class NotificationsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoginMiddleware).forRoutes(NotificationsController);
  }
}
