import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RedemptionService } from '../../services/redemption.service';
import { RedemptionController } from './redemption.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Redemption, RedemptionSchema } from '../../entities/redemption.entity';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from '../../entities/users.entity';
import { CrmUserMiddleware } from 'src/common/middleware/crm-user.middleware';

@Module({
  imports: [ MongooseModule.forFeature([{ name: Redemption.name, schema: RedemptionSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: Customer.name, schema: CustomerSchema },
    { name: SettingProject.name, schema: SettingProjectSchema },
    { name: User.name, schema: UserSchema },])],
  controllers: [RedemptionController],
  providers: [RedemptionService]
})
export class RedemptionModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware, CrmUserMiddleware)
    .forRoutes(RedemptionController)
  }
}
