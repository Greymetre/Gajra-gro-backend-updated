import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Customer, CustomerSchema } from '../../entities/customer.entity';
import { SettingCustomer, SettingCustomerSchema } from '../../entities/setting.customer.entity';
import { SettingProject, SettingProjectSchema } from '../../entities/setting.project.entity';
import { Transaction, TransactionSchema } from '../../entities/transaction.entity';
import { CustomerDashboardController } from './customer_dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose'
import { CustomerDashboardService } from 'src/services/customer_dashboard.service';
import { SettingService } from 'src/services/setting.service';
import { RedemptionService } from 'src/services/redemption.service';
@Module({
  imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema },
    { name: SettingCustomer.name, schema: SettingCustomerSchema },
    { name: SettingProject.name, schema: SettingProjectSchema },
    { name: Transaction.name, schema: TransactionSchema },
  ])],
  controllers: [CustomerDashboardController],
  providers: [CustomerDashboardService, SettingService]
})
export class CustomerDashboardModule  {}