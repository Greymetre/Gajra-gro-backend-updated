import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Country, CountryDocument } from '../entities/country.entity';
import { CreateCountryDto, StatusCountryDto, UpdateCountryDto } from '../user/country/dto/request-country.dto';
import { Request } from 'express';
import { GetCountryInfoDto } from '../user/country/dto/response-country.dto';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";

@Injectable()
export class CountryService {
  constructor(@InjectModel(Country.name) private countryModel: Model<CountryDocument>) {}

  public async createCountry(createCountryDto: CreateCountryDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const country = new this.countryModel({...createCountryDto, createdBy : authInfo._id });
    if(country.save())
    {
      return new GetCountryInfoDto(country)
    }
    throw new BadRequestException('Error in Create Country');
  };

  async getAllCountries(): Promise<any> {
    const countries = await this.countryModel.find().select('countryName iso phoneCode currency timezones flag active').exec();
    if(!countries)
    {
      throw new BadRequestException('Data Not Found');
    }
    return countries;
  };

  async getCountryInfo(id: string): Promise<GetCountryInfoDto> {
    try {
      const data = await this.countryModel.findById(id).select('countryName iso phoneCode currency timezones flag active');
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCountryInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting country details' +e,
      );
    }
  };

  async updateCountryInfo(id: string, updateCountryDto: UpdateCountryDto) : Promise<Country> {
    try {
      return await this.countryModel.findByIdAndUpdate(id, updateCountryDto)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting country details' +e,);
    }
  };

  async deleteCountry(id: string) : Promise<Country> {
    try {
      return await this.countryModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting country details' +e,);
    }
  };

  async updateStatus(statusCountryDto: StatusCountryDto) : Promise<Country> {
    try {
      return await this.countryModel.findByIdAndUpdate(statusCountryDto.countryid, { active : statusCountryDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting country details' +e,);
    }
  };

  async getCountryCodes(): Promise<any> {
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

  async getCountryDropDown(): Promise<any> {
    try {
      const data = await this.countryModel.aggregate([
        { $match: { active : true } },
        {
          $project: {
            _id : 0,
            label: { $ifNull: ["$countryName", ""] },
            value: { $ifNull: ["$countryName", ""] },
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
        'error while getting country' +e,
      );
    }
  };

  public async importCountries(): Promise<any> {
      await axios.get('https://countriesnow.space/api/v0.1/countries/codes').then(async(response : any) => {    
      if(response?.data?.error === false)
            {
              const mappedArray = await Promise.all(response?.data?.data.map(async (item:any) => {
                  const country = {
                    countryName : item.name.trim(),
                    iso : item.code.trim(),
                    phoneCode : item.dial_code.trim(),
                    flag : item.code.toLowerCase(),
                    active : false
                  }
                  return country;
                }) 
              );
              await this.countryModel.insertMany(mappedArray).then(async(result:any) => {
                return result;
              })
              .catch(function (error) {
                throw new BadRequestException(error);
              })
            }
          })
        .catch((error) => {
          console.log('error', error);
          throw new BadRequestException(error);
        });
  };
}
