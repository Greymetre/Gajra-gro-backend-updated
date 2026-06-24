import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CategoryService } from '../../services/category.service';
import { CategoryController } from './category.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Category, CategorySchema } from '../../entities/category.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  controllers: [CategoryController],
  providers: [CategoryService]
})
export class CategoryModule  {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(CategoryController)
  }
}