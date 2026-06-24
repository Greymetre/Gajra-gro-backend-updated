import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GiftService } from '../../services/gift.service';
import { GiftController } from './gift.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { GiftCatalogue, GiftCatalogueSchema } from '../../entities/gift.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: GiftCatalogue.name, schema: GiftCatalogueSchema }])],
  controllers: [GiftController],
  providers: [GiftService]
})

export class GiftModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(GiftController)
  }
}
