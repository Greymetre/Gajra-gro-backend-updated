import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../entities/users.entity';
import { LoginRequestDto, changePasswordRequestDto, passwordRequestDto, CheckUserMobileExistDto, CheckUserEmailExistDto, EmailRequestDto } from './dto/auth.request.dto';
import { LoginResponseDto } from './dto/auth.response.dto';
import { JwtTokenInterface } from '../../common/interfaces/jwt.token.interface';
import { generateAuthUserToken, getAuthUserInfo } from '../../common/utils/jwt.helper';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { Request } from 'express';


@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService ,
    @InjectModel(User.name) private userModel: Model<User>,

    ){};

    public async userLogin(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
      const user = await this.userModel.findOne({ $or: [{ email: loginDto.username }, { mobile: loginDto.username }] });
      if (!user) {
        throw new BadRequestException('Invalid email or password.');
      }
      const validate = await bcrypt.compare(loginDto.password, user.password);
      if (!validate) {
        throw new BadRequestException('Invalid email or password.');
      }
      try {
        const payload: JwtTokenInterface = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneCode: user.phoneCode,
          mobile: user.mobile,
          email: user.email,
          userType : user.userType,
          categories : user.categories
        };
      await this.userModel.findOneAndUpdate({ _id : user._id}, {
        $set: { deviceInfo: { appVersion : loginDto.appVersion, deviceToken : loginDto.deviceToken , deviceType : loginDto.deviceType, deviceName : loginDto.deviceName }},
      }, { new: true, upsert: true, setDefaultsOnInsert: false }).lean();
        // const token = await jwt.sign(payload, JWTCLIENTSECRET.JWT_SECRET, {
        //   expiresIn: process.env.JWT_EXPIRED_TIME,
        // });
        const token = await generateAuthUserToken(payload);
        return new LoginResponseDto({
          ...payload,
          token : token
        });
      } 
      catch (err) {
        throw new BadRequestException('Invalid email or password.');
      }
    };

    public async checkMobileExists(mobileDto: CheckUserMobileExistDto) {
      const user = await this.userModel.findOne({ mobile: mobileDto.mobile , _id: { $ne: mobileDto.userid } });
      if (!user) {
        return 'Mobile number is available';
      }
      throw new BadRequestException('Mobile number is not available');
    };

    public async checkEmailExists(emailDto: CheckUserEmailExistDto) {
      const user = await this.userModel.findOne({ email: emailDto.email , _id: { $ne: emailDto.userid } });
      if (!user) {
        return 'Email is available';
      }
      throw new BadRequestException('Email is not available');
    };

    public async forgotPassword(emailDto: EmailRequestDto) {
      const user = await this.userModel.findOne({ email: emailDto.email });
      if (!user) {
        throw new BadRequestException('Email is not available');
      }
      return 'Password reset link is sent to your registered email address.';
    };

    public async changePassword(req: Request, changePasswordDto: changePasswordRequestDto) {
      const authInfo = await getAuthUserInfo(req.headers)
      const user = await this.userModel.findById(authInfo._id);
      if (!user) {
        throw new BadRequestException('User Not found');
      }
      const validate = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
      if (!validate) {
        throw new BadRequestException('Invalid password.');
      }
      const saltOrRounds = 10;
      user.password = await bcrypt.hash(changePasswordDto.password, saltOrRounds);
      if(user.save())
      {
        return 'Password Update Succiessfully';
      }
      throw new BadRequestException('Error in Password Update');
    };

    public async resetPassword(req: Request, passwordDto: passwordRequestDto) {
      const authInfo = await getAuthUserInfo(req.headers)
      const user = await this.userModel.findById(authInfo._id);
      if (!user) {
        throw new BadRequestException('User Not found');
      }
      const saltOrRounds = 10;
      user.password = await bcrypt.hash(passwordDto.password, saltOrRounds);
      if(user.save())
      {
        return 'Password Update Succiessfully';
      }
      throw new BadRequestException('Error in Password Update');
    };

    public async newOtpRequest(emailDto: EmailRequestDto) {
      const user = await this.userModel.findOne({ email: emailDto.email });
      if (!user) {
        throw new BadRequestException('Email is not available');
      }
      
    };

    public async resendOtpRequest(emailDto: EmailRequestDto) {
      const user = await this.userModel.findOne({ email: emailDto.email });
      if (!user) {
        throw new BadRequestException('Email is not available');
      }
      
    };
}
