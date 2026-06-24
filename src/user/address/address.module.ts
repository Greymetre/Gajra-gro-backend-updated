import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CityService } from '../../services/city.service';
import { StatesService } from '../../services/states.service';
import { CountryService } from '../../services/country.service';
import { AddressController } from './address.controller';
import { City, CitySchema } from '../../entities/city.entity';
import { State, StateSchema } from '../../entities/state.entity';
import { Country, CountrySchema } from '../../entities/country.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: City.name, schema: CitySchema },
    { name: State.name, schema: StateSchema },
    { name: Country.name, schema: CountrySchema },
  ])],
  controllers: [AddressController],
  providers: [CityService, StatesService, CountryService]
})
export class AddressModule {}