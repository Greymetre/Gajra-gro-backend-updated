import {BadRequestException, Injectable,InternalServerErrorException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/users.entity';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../user/users/dto/users.response.dto'
import { StatusUserDto, CreateUserDto, UpdateUserDto } from '../user/users/dto/user.request.dto'
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  public async createUser(createUserDto: CreateUserDto) {
    try {
      const saltOrRounds = 10;
      if(createUserDto.password) {
        createUserDto.password = await bcrypt.hash(createUserDto.password, saltOrRounds);
      }
      const existUser = await this.userModel.findOne({ mobile: createUserDto.mobile }).select('_id mobile').exec();
      if (!existUser) {
        const user = new this.userModel({
          ...createUserDto,
          createdAt: new Date(),
        });
        if (user.save()) {
          return new UserResponseDto(user);
        } else {
          throw new BadRequestException("Error in Create User");
        }
      }else {
        throw new BadRequestException("User Already Exist");
      }
    }catch (err) {
      console.log('err', err);

      throw new BadRequestException(err);
    }
  };

  async getAllUsers(): Promise<any> {
    const users = await this.userModel.aggregate([
      {
        $project: {
          _id: 1,
          firstName: { $ifNull: ["$firstName", ""] },
          lastName: { $ifNull: ["$lastName", ""] },
          phoneCode: { $ifNull: ["$phoneCode", ''] },
          mobile: { $ifNull: ["$mobile", null] },
          email: { $ifNull: ["$email", ''] },
          gender: { $ifNull: ["$gender", ''] },
          active: { $ifNull: ["$active", false] },
        },
      },
    ]).exec();
    if(!users){
      throw new BadRequestException('Data Not Found');
    }
    return users;
  };

  async getUserInfo(id: string): Promise<UserResponseDto> {
    try {
      const data = await this.userModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            firstName: { $ifNull: ["$firstName", ""] },
            lastName: { $ifNull: ["$lastName", ""] },
            phoneCode: { $ifNull: ["$phoneCode", ''] },
            mobile: { $ifNull: ["$mobile", null] },
            email: { $ifNull: ["$email", ''] },
            gender: { $ifNull: ["$gender", ''] },
            address: { $ifNull: ["$address", {}] },
            avatar: { $ifNull: ["$avatar", ''] },
            dateOfBirth: { $ifNull: ["$dateOfBirth", ''] },
            userType: { $ifNull: ["$userType", ''] },
            categories : { $ifNull: ["$categories", ''] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1 },
      ]).exec();
      if(!data){
        throw new BadRequestException('Data Not Found');
      }
      return new UserResponseDto(data[0]);
    }catch (e) {
      throw new InternalServerErrorException(
        'error while getting user details' +e,
      );
    }
  };

  async updateUserInfo(id: string, updateUserDto: UpdateUserDto) : Promise<User> {
    try {
      if(updateUserDto.password){
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }else{
        delete updateUserDto["password"];
      }
      return await this.userModel.findByIdAndUpdate(id, updateUserDto)
    }catch (e) {
      throw new InternalServerErrorException('error while getting user details' +e,);
    }
  };

  async deleteUser(id: string) : Promise<User> {
    try {
      return await this.userModel.findByIdAndDelete(id)
    }catch (e) {
      throw new InternalServerErrorException('error while getting user details' +e,);
    }
  };

  async updateStatus(statusUserDto: StatusUserDto) : Promise<User> {
    try {
      return await this.userModel.findByIdAndUpdate(statusUserDto.userid, { active : statusUserDto.active},{ new: true, useFindAndModify: false })
    }catch (e) {
      throw new InternalServerErrorException('error while getting user details' +e,);
    }
  };

  async insertManyUsers(): Promise<any> {
    try {
      const saltOrRounds = 10;
    await axios.get('https://gajragears.fieldkonnect.io/api/allUsersToGajraMlp').then(async (response: any) => {
      if (response.data.data) {
        const mappedArray = await Promise.all(response?.data?.data.map(async (customer: any) => {
          customer.password = await bcrypt.hash(customer.password.toString(), saltOrRounds);
          return customer;
        }) );
        mappedArray.forEach(async (userData) => {
          try {
            const findUser = await this.userModel.findOne({
              $or: [
                { mobile: userData.mobile },
                { email: userData.email }
              ]
            });
            
        
            if (!findUser) {
              await this.userModel.create(userData)
                .then(result => {
                  console.log('User inserted:', result);
                })
                .catch(error => {
                  throw new BadRequestException('Error inserting user: ' + error);
                });
            }
          } catch (error) {
            console.error('Error processing user data:', error);
            throw new InternalServerErrorException(error);
          }
        });
      }
    }).catch((error) => {
        console.log('error', error);
        throw new BadRequestException(error);
      });
    }catch (e) {
      throw new InternalServerErrorException('error while getting user details' +e,);
    }
  };
  
  async getUsersDropDown(): Promise<any> {
    try {
      const data = await this.userModel.aggregate([
        {  
          $project: {
            _id: 0,
            label: { $concat: [ "$firstName", " ", "$lastName" ] },
            value: { $ifNull: ["$_id", ""] },
          
         
          },}
        
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    }catch (e) {
      throw new InternalServerErrorException(
        'error while getting country' + e,
      );
    }
  };
};
