import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProductsService } from 'src/services/products.service';
import { ProductsController } from './products.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Product, ProductSchema } from '../entities/product.entity';
import { Category, CategorySchema } from '../entities/category.entity';
import { Subcategory, SubcategorySchema } from '../entities/subcategory.entity';
import { Transaction, TransactionSchema } from '../entities/transaction.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema },
    { name: Category.name, schema: CategorySchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: Subcategory.name, schema: SubcategorySchema }])],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //   .apply(LoginMiddleware)
  //   .forRoutes(ProductsController)
  // }
}
