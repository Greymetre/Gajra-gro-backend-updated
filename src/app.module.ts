import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerModule } from './loyalty/customer.module';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';
import { ServeStaticModule } from '@nestjs/serve-static/dist/serve-static.module';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { Customer, CustomerSchema } from './entities/customer.entity';
import { User, UserSchema } from './entities/users.entity';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { SettingProject, SettingProjectSchema, } from "src/entities/setting.project.entity";
import { CronService } from './cron/cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CronHelper } from './common/utils/helper.service';
import { Redemption, RedemptionSchema } from './entities/redemption.entity';

import { PackingList, PackingListSchema } from './entities/packing-list.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true, }),
    MongooseModule.forRoot(`${process.env.DB_URL}`),
    UserModule,
    CustomerModule,
    AddressModule,
    Customer,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    //   ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'uploaded')
    // }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploaded'),
      serveRoot: '/uploaded',
      // index: false,
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }]),
    MongooseModule.forFeature([{ name: SettingProject.name, schema: SettingProjectSchema }]),
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    MongooseModule.forFeature([{ name: Redemption.name, schema: RedemptionSchema }]),

  ],
  controllers: [AppController],
  providers: [AppService, CronService, CronHelper],
})
export class AppModule { }