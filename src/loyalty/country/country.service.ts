import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Country, CountryDocument } from '../../entities/country.entity';
import { CreateCountryDto, StatusCountryDto, UpdateCountryDto } from './dto/request-country.dto';
import { Request } from 'express';
import { GetCountryInfoDto } from './dto/response-country.dto';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class CountryService {
  constructor(@InjectModel(Country.name) private countryModel: Model<CountryDocument>) {}

  async getAllCountries(): Promise<any> {
    try {
      const data = await this.countryModel.aggregate([
        { $match: {"active":  true} },
        {
          $project: {
            label: { $ifNull: ["$countryName", ""] },
            value: { $ifNull: ["$phoneCode", ""] },
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
        'error while getting product details' +e,
      );
    }
  };

  async getCountryInfo(id: string): Promise<any> {
    try {
      const data = await this.countryModel.aggregate([
        {
          $project: {
            label: { $ifNull: ["$countryName", ""] },
            value: { $ifNull: ["$phoneCode", ""] },
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
        'error while getting product details' +e,
      );
    }
  };
};
