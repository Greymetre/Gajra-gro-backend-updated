import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BeatschedulesService } from '../../services/beatschedules.service';
import { BeatschedulesController } from './beatschedules.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Beatschedule, BeatscheduleSchema } from '../../entities/beatschedule.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Beatschedule.name, schema: BeatscheduleSchema }])],
  controllers: [BeatschedulesController],
  providers: [BeatschedulesService]
})
export class BeatschedulesModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(BeatschedulesController)
  }
}