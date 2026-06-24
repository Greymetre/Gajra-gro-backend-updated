import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HelpdeskService } from './helpdesk.service';
import { HelpdeskController } from './helpdesk.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Helpdesk, HelpdeskSchema } from '../../entities/helpdesk.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([{ name: Helpdesk.name, schema: HelpdeskSchema }
  ])],
  controllers: [HelpdeskController],
  providers: [HelpdeskService]
})
export class HelpdeskModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(HelpdeskController)
  }
}
