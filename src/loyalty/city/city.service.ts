import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { City, CityDocument } from '../../entities/city.entity';

import { CreateCityDto, StatusCityDto, UpdateCityDto, PincodeCityDto, StateCityDto } from './dto/request-city.dto';
import { GetCityInfoDto, GetAllCityDto } from './dto/response-city.dto';
import { Request } from 'express';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class CityService {
  constructor(@InjectModel(City.name) private cityModel: Model<CityDocument>) {}

  async getAllCitys(): Promise<any> {
    try {
      const data = await this.cityModel.aggregate([
        { $match: {"active":  true} },
        {
          $project: {
            _id: 1,
            cityName: { $ifNull: ["$cityName", ""] },
          },
        },
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting city details' +e,
      );
    }
  };

  async getCityInfo(id: string): Promise<GetCityInfoDto> {
    try {
      const data = await this.cityModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            cityName: { $ifNull: ["$cityName", ""] },
            pincode: { $ifNull: ["$pincode", []] },
            state: { $ifNull: ["$state", ""] },
            country: { $ifNull: ["$country", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1 },
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCityInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting city details' +e,
      );
    }
  };

  async getStateCities(stateCityDto : StateCityDto): Promise<any> {
    try {

      const data = await this.cityModel.aggregate([
        { $match: {state: { $regex: stateCityDto.state } } },
        {
          $project: {
            _id: 1,
            cityName: { $ifNull: ["$cityName", ""] },
          },
        },
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting state details' +e,
      );
    }
  };

}