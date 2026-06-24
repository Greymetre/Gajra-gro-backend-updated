import { Module } from '@nestjs/common';
import { ActivitiesService } from '../../services/activities.service';
import { ActivitiesController } from './activities.controller';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService]
})
export class ActivitiesModule {}
