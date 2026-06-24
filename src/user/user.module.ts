import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { AttendancesModule } from './attendances/attendances.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ProductsModule } from './products/products.module';
import { BeatsModule } from './beats/beats.module';
import { BeatschedulesModule } from './beatschedules/beatschedules.module';
import { CustomervisitModule } from './customervisit/customervisit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivitiesModule } from './activities/activities.module';
import { ShoppingcartModule } from './shoppingcart/shoppingcart.module';
import { OrdersModule } from './orders/orders.module';
import { LoyaltyschemeModule } from './loyaltyscheme/loyaltyscheme.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SalesModule } from './sales/sales.module';
import { SurveyquestionsModule } from './surveyquestions/surveyquestions.module';
import { StatesModule } from './states/states.module';
import { CouponsModule } from './coupons/coupons.module';
import { AuthModule } from './auth/auth.module';
import { PackingListModule } from './packing-list/packing-list.module';
import { CategoryModule } from './category/category.module';
import { SubcategoryModule } from './subcategory/subcategory.module';
import { CountryModule } from './country/country.module';
import { CityModule } from './city/city.module';
import { GiftModule } from './gift/gift.module';
import { RedemptionModule } from './redemptions/redemption.module';
import { SettingModule } from './setting/setting.module';
import { AddressModule } from './address/address.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CallCenterModule } from './callcenter/callcenter.module';
import { S3Module } from '../s3/s3.module';

@Module({
  //imports: [MongooseModule.forRoot('mongodb://FieldKonnectUsr:BridgeIT2022@localhost:27017/FieldKonnectDb'), UsersModule, CustomersModule, AttendancesModule, ExpensesModule, ProductsModule, BeatsModule, BeatschedulesModule, CustomervisitModule, NotificationsModule, ActivitiesModule, ShoppingcartModule, OrdersModule, LoyaltyschemeModule, TransactionsModule, SalesModule, SurveyquestionsModule, StatesModule, CouponsModule, AuthModule, CategoryModule, SubcategoryModule, CountryModule, CityModule, AddressModule],
  imports: [UsersModule, S3Module, CustomersModule, AttendancesModule, ExpensesModule, ProductsModule, BeatsModule, BeatschedulesModule, CustomervisitModule, NotificationsModule, ActivitiesModule, ShoppingcartModule, OrdersModule, LoyaltyschemeModule, TransactionsModule, SalesModule, SurveyquestionsModule, StatesModule, CouponsModule, AuthModule, CategoryModule, SubcategoryModule, CountryModule, CityModule, GiftModule, RedemptionModule, SettingModule, AddressModule, DashboardModule, CallCenterModule, PackingListModule],
  controllers: [],
  providers: [],
})
export class UserModule { }
