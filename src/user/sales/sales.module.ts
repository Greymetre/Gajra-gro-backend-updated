import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SalesService } from 'src/services/sales.service';
import { SalesController } from './sales.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Sale, SaleSchema } from '../../entities/sale.entity';
import { Product, ProductSchema } from 'src/entities/product.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema },
    { name: Product.name, schema: ProductSchema }
  ])],
  controllers: [SalesController],
  providers: [SalesService]
})
export class SalesModule {}
