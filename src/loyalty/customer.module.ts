import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivitiesModule } from './activities/activities.module';
import { ShoppingcartModule } from './shoppingcart/shoppingcart.module';
import { OrdersModule } from './orders/orders.module';
import { LoyaltyschemeModule } from './loyaltyscheme/loyaltyscheme.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SalesModule } from './sales/sales.module';
import { SurveyquestionsModule } from './surveyquestions/surveyquestions.module';
import { StatesModule } from './states/states.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { SubcategoryModule } from './subcategory/subcategory.module';
import { CountryModule } from './country/country.module';
import { CityModule } from './city/city.module';
import { RedemptionModule } from './redemption/redemption.module';
import { GiftModule } from './gift/gift.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { SettingModule } from './setting/setting.module';
import { CustomerDashboardModule } from './dashboard/customer_dashboard.module';
import { RemarkModule } from './remark/remark.module';
@Module({
    //imports: [MongooseModule.forRoot('mongodb://FieldKonnectUsr:BridgeIT2022@localhost:27017/FieldKonnectDb'), UsersModule, CustomersModule, AttendancesModule, ExpensesModule, ProductsModule, BeatsModule, BeatschedulesModule, CustomervisitModule, NotificationsModule, ActivitiesModule, ShoppingcartModule, OrdersModule, LoyaltyschemeModule, TransactionsModule, SalesModule, SurveyquestionsModule, StatesModule, CouponsModule, AuthModule, CategoryModule, SubcategoryModule, CountryModule, CityModule],
    imports: [
    ProductsModule, 
    NotificationsModule, 
    ActivitiesModule, 
    ShoppingcartModule, 
    OrdersModule, 
    LoyaltyschemeModule, 
    TransactionsModule, 
    SalesModule, 
    SurveyquestionsModule, 
    StatesModule, 
    AuthModule, 
    CategoryModule, 
    SubcategoryModule, 
    CountryModule, 
    CityModule,
    RemarkModule, 
    RedemptionModule, 
    GiftModule, 
    HelpdeskModule, 
    SettingModule, 
    CustomerDashboardModule, 
  ],
    controllers: [],
    providers: [],
  })
export class CustomerModule {}
