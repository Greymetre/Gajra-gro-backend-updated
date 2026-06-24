import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CityService } from './city.service';
import { CityController } from './city.controller';
import { City, CitySchema } from '../../entities/city.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: City.name, schema: CitySchema }
  ])],
  controllers: [CityController],
  providers: [CityService]
})
export class CityModule {}