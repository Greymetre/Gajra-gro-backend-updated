import { Module, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashfreeStatementController } from './cashfree-statement.controller';
import { CashfreeStatementService } from '../../services/cashfree-statement.service';
import { CashfreeStatement, CashfreeStatementSchema } from '../../entities/cashfree-statement.entity';
import { SettingService } from '../../services/setting.service';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { Redemption, RedemptionSchema } from '../../entities/redemption.entity';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CashfreeStatement.name, schema: CashfreeStatementSchema },
            { name: SettingProject.name, schema: SettingProjectSchema },
            { name: Redemption.name, schema: RedemptionSchema },
        ]),
    ],
    controllers: [CashfreeStatementController],
    providers: [CashfreeStatementService, SettingService],
})
export class CashfreeStatementModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoginMiddleware)
            .forRoutes(CashfreeStatementController);
    }
}
