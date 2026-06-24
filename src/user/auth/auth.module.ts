import { Module } from '@nestjs/common';
import {MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from "../users/users.module";
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../../entities/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { JWTCLIENTSECRET} from '../../common/constants'

@Module({
  imports: [UsersModule, JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRED_TIME },
  }), MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {
  
}
