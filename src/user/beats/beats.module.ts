import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BeatsService } from '../../services/beats.service';
import { BeatsController } from './beats.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Beat, BeatSchema } from '../../entities/beat.entity';
import { MongooseModule } from '@nestjs/mongoose'


@Module({
  imports: [ MongooseModule.forFeature([{ name: Beat.name, schema: BeatSchema }])],
  controllers: [BeatsController],
  providers: [BeatsService]
})
export class BeatsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(BeatsController)
  }
}
