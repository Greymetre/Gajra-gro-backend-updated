import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { StatesService } from '../../services/states.service';
import { StatesController } from './states.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { State, StateSchema } from '../../entities/state.entity';
import { Country, CountrySchema } from '../../entities/country.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: State.name, schema: StateSchema },
    { name: Country.name, schema: CountrySchema }
  ])],
  controllers: [StatesController],
  providers: [StatesService]
})
export class StatesModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(StatesController)
  }
}