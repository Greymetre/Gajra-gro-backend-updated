import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CustomervisitService } from '../../services/customervisit.service';
import { CustomervisitController } from './customervisit.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Customervisit, CustomervisitSchema } from '../../entities/customervisit.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Customervisit.name, schema: CustomervisitSchema }])],
  controllers: [CustomervisitController],
  providers: [CustomervisitService]
})
export class CustomervisitModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CustomervisitController)
  }
}