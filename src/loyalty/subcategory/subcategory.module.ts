import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SubcategoryService } from './subcategory.service';
import { SubcategoryController } from './subcategory.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Subcategory, SubcategorySchema } from '../../entities/subcategory.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Subcategory.name, schema: SubcategorySchema }])],
  controllers: [SubcategoryController],
  providers: [SubcategoryService]
})
export class SubcategoryModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //   .apply(LoginMiddleware)
  //   .forRoutes(SubcategoryController)
  // }
}