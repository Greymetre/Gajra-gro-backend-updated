import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from '../../entities/customer.entity';
import { LoginRequestDto, MobileRequestDto, EmailRequestDto, changePasswordRequestDto, passwordRequestDto } from '../../dto/auth-dto';
import { LoginResponseDto } from './dto/auth.response.dto';
import { CustomerDto } from '../../dto/customer-dto'
import { CustomerJwtTokenInterface } from '../../common/interfaces/jwt.token.interface';
import { destroyCustomerToken, getCustomerAuthInfo } from '../../common/utils/jwt.helper';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import { JWTCLIENTSECRET } from '../../common/constants/index';

const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) { }

  public async userLogin(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.customerModel.findOne({ $or: [{ email: loginDto.username }, { mobile: loginDto.username }] }).select('_id firmName contactPerson mobile email password customerType');
    if (!user) {
      throw new BadRequestException('Invalid email or password.');
    }
    const validate = await bcrypt.compare(loginDto.password, user.password);
    if (!validate) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    try {
      delete user['password'];
      const payload: CustomerJwtTokenInterface = JSON.parse(JSON.stringify(user));
      const token = await jwt.sign(payload, JWTCLIENTSECRET.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRED_TIME,
      });
      //const token = await this.jwtService.sign(payload);
      return new LoginResponseDto({
        ...payload,
        token: token
      });
    }
    catch (err) {
      throw new BadRequestException('Invalid email or password.');
    }
  };

  public async checkMobileExists(mobileDto: MobileRequestDto) {
    const user = await this.customerModel.findOne({ mobile: mobileDto.mobile });
    if (!user) {
      return 'Mobile number is available';
    }
    throw new BadRequestException('Mobile number is not available');
  };

  public async checkEmailExists(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      return 'Email is available';
    }
    throw new BadRequestException('Email is not available');
  };

  public async forgotPassword(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      throw new BadRequestException('Email is not available');
    }
    return 'Password reset link is sent to your registered email address.';
  };

  public async changePassword(req: Request, changePasswordDto: changePasswordRequestDto) {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const user = await this.customerModel.findById(authInfo._id);
    if (!user) {
      throw new BadRequestException('User Not found');
    }
    const validate = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!validate) {
      throw new BadRequestException('Invalid password.');
    }
    const saltOrRounds = 10;
    user.password = await bcrypt.hash(changePasswordDto.password, saltOrRounds);
    if (user.save()) {
      return 'Password Update Succiessfully';
    }
    throw new BadRequestException('Error in Password Update');
  };

  public async resetPassword(req: Request, passwordDto: passwordRequestDto) {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const user = await this.customerModel.findById(authInfo._id);
    if (!user) {
      throw new BadRequestException('User Not found');
    }
    const saltOrRounds = 10;
    user.password = await bcrypt.hash(passwordDto.password, saltOrRounds);
    if (user.save()) {
      return 'Password Update Succiessfully';
    }
    throw new BadRequestException('Error in Password Update');
  };

  public async newOtpRequest(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      throw new BadRequestException('Email is not available');
    }

  };

  public async resendOtpRequest(emailDto: EmailRequestDto) {
    const user = await this.customerModel.findOne({ email: emailDto.email });
    if (!user) {
      throw new BadRequestException('Email is not available');
    }
  };

  public async customerSignup(signupDto: CustomerDto): Promise<LoginResponseDto> {
    try {
      const saltOrRounds = 10;
      signupDto.password = await bcrypt.hash(signupDto.password, saltOrRounds);
      const customer = new this.customerModel(signupDto);
      if (customer.save()) {
        delete customer['password'];
        const payload: CustomerJwtTokenInterface = (({ password, parentid, kycInfo, userAssign, surveyData, createdAt, active, ...o }) => o)(JSON.parse(JSON.stringify(customer)));
        const token = await jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRED_TIME,
        });
        //const token = await this.jwtService.sign(payload);
        return new LoginResponseDto({
          ...payload,
          token: token
        });
      }else{
        throw new BadRequestException('Error in Create Customer');
      }
    }catch (err) {
      throw new BadRequestException('Invalid email or password.');
    }
  };

  public async logoutCustomer(req: Request) {
    const authInfo = await destroyCustomerToken(req.headers)
    if (!authInfo) {
      throw new BadRequestException('User Not found');
    }else{
      return 'Logout Succiessfully';
    }
  };
  
}
