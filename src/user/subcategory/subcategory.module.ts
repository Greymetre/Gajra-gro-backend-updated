import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SubcategoryService } from '../../services/subcategory.service';
import { SubcategoryController } from './subcategory.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Subcategory, SubcategorySchema } from '../../entities/subcategory.entity';
import { Category, CategorySchema } from '../../entities/category.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: Subcategory.name, schema: SubcategorySchema },
    { name: Category.name, schema: CategorySchema }])],
  controllers: [SubcategoryController],
  providers: [SubcategoryService]
})
export class SubcategoryModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(SubcategoryController)
  }
}