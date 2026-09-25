import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { DistrictService } from '../../services/district.service';
import { DistrictController } from './district.controller';
import { District, DistrictSchema } from '../../entities/district.entity';
import { Country, CountrySchema } from '../../entities/country.entity';
import { State, StateSchema } from '../../entities/state.entity';
import { City, CitySchema } from '../../entities/city.entity';

@Module({
  imports: [MongooseModule.forFeature([
    { name: District.name, schema: DistrictSchema },
    { name: Country.name, schema: CountrySchema },
    { name: State.name, schema: StateSchema },
    { name: City.name, schema: CitySchema },
  ])],
  controllers: [DistrictController],
  providers: [DistrictService]
})
export class DistrictModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginMiddleware)
      .forRoutes(DistrictController)
  }
}
