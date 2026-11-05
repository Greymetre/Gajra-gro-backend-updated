import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationsController } from './notifications.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Notification, NotificationSchema } from '../../entities/notification.entity';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { State, StateSchema } from '../../entities/state.entity';
import { District, DistrictSchema } from '../../entities/district.entity';
import { City, CitySchema } from '../../entities/city.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: State.name, schema: StateSchema },
      { name: District.name, schema: DistrictSchema },
      { name: City.name, schema: CitySchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoginMiddleware).forRoutes(NotificationsController);
  }
}
