import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {MongooseModule } from '@nestjs/mongoose'
import { UsersService } from '../../services/users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../../entities/users.entity';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(UsersController)
  }
}
