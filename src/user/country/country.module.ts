import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CountryService } from '../../services/country.service';
import { CountryController } from './country.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Country, CountrySchema } from '../../entities/country.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }])],
  controllers: [CountryController],
  providers: [CountryService]
})
export class CountryModule  {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CountryController)
  }
}