import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CityService } from '../../services/city.service';
import { CityController } from './city.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { City, CitySchema } from '../../entities/city.entity';
import { MongooseModule } from '@nestjs/mongoose'
import { State, StateSchema } from '../../entities/state.entity';
@Module({
  imports: [ MongooseModule.forFeature([
    { name: City.name, schema: CitySchema },
    { name: State.name, schema: StateSchema },
  ])],
  controllers: [CityController],
  providers: [CityService]
})
export class CityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CityController)
  }
}