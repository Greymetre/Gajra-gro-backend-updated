import { Module, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackingListController } from './packing-list.controller';
import { PackingListService } from '../../services/packing-list.service';
import { PackingList, PackingListSchema } from '../../entities/packing-list.entity';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: PackingList.name, schema: PackingListSchema }]),
    ],
    controllers: [PackingListController],
    providers: [PackingListService],
    exports: [PackingListService],
})
export class PackingListModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoginMiddleware)
            .forRoutes(PackingListController);
    }
}
