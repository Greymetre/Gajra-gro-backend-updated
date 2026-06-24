import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { City, CityDocument } from '../entities/city.entity';
import { State, StateDocument } from '../entities/state.entity';
import { CreateCityDto, StatusCityDto, UpdateCityDto, PincodeCityDto, StateCityDto } from '../user/city/dto/request-city.dto';
import { GetCityInfoDto } from '../user/city/dto/response-city.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;
import axios from "axios";
import { PaginationRequestDto } from 'src/dto/pagination-dto';
@Injectable()
export class CityService {
  constructor(@InjectModel(City.name) private cityModel: Model<CityDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>) { }

  public async createCity(createCityDto: CreateCityDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const city = new this.cityModel({ ...createCityDto, createdBy: authInfo._id });
    if (city.save()) {
      return new GetCityInfoDto(city)
    }
    throw new BadRequestException('Error in Create City');
  };

  async getAllCitys(paginationDto: PaginationRequestDto): Promise<any> {
    try {
      const currentPage = paginationDto.currentPage || 1
      const recordPerPage = paginationDto.recordPerPage || 100
      const data = await this.cityModel.aggregate([
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
        {
          $match: {
            $or: [
              { cityName: { $regex: paginationDto.search, '$options': 'i' } },
              { state: { $regex: paginationDto.search, '$options': 'i' } },
            ],
          },
        },
        { $sort: { refno: -1 } },
        {
          $facet: {
            paginate: [
              { $count: "totalDocs" },
              { $addFields: { recordPerPage: recordPerPage, currentPage: currentPage } }
            ],
            docs: [
              { $skip: (currentPage - 1) * recordPerPage },
              { $limit: recordPerPage }
            ]
          }
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException('error while getting transaction details' + e);
    }
  };

  async getCityInfo(id: string): Promise<GetCityInfoDto> {
    try {
      const data = await this.cityModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
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
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetCityInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e);
    }
  };

  async updateCityInfo(id: string, updateCityDto: UpdateCityDto): Promise<City> {
    try {
      return await this.cityModel.findByIdAndUpdate(id, updateCityDto)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e,);
    }
  };

  async deleteCity(id: string): Promise<City> {
    try {
      return await this.cityModel.findByIdAndDelete(id)
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e,);
    }
  };

  async updateStatus(statusCityDto: StatusCityDto): Promise<City> {
    try {
      return await this.cityModel.findByIdAndUpdate(statusCityDto.cityid, { active: statusCityDto.active }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e,);
    }
  };

  async addPincode(pincodeCityDto: PincodeCityDto): Promise<City> {
    try {
      return await this.cityModel.findByIdAndUpdate(pincodeCityDto.cityid, { $push: { pincode: pincodeCityDto.pincode } }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e,);
    }
  };

  async deletePincode(pincodeCityDto: PincodeCityDto): Promise<City> {
    try {
      return await this.cityModel.findByIdAndUpdate(pincodeCityDto.cityid, { $pull: { pincode: { $in: pincodeCityDto.pincode } } }, { new: true, useFindAndModify: false })
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting city details' + e,);
    }
  };

  async getStateCities(stateCityDto: StateCityDto): Promise<any> {
    try {

      const data = await this.cityModel.aggregate([
        { $match: { state: { $regex: stateCityDto.state } } },
        {
          $project: {
            _id: 1,
            cityName: { $ifNull: ["$cityName", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting state details' + e,
      );
    }
  };

  async getCityDropDown(stateCityDto: StateCityDto): Promise<any> {
    try {
      var match = (stateCityDto.state) ? { state: { $regex: stateCityDto.state }, active: true } : { active: true }
      const data = await this.cityModel.aggregate([
        { $match: match },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$cityName", ""] },
            value: { $ifNull: ["$cityName", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting country' + e,
      );
    }
  };

  public async importCities(): Promise<any> {
    const states = await this.stateModel.find({ active: true }).select("_id stateName").populate('countryid', 'countryName').exec();
    await Promise.all(states.map(async (item: any) => {
      await axios.post('https://countriesnow.space/api/v0.1/countries/state/cities', { country: item.countryid.countryName, state: item.stateName }).then(async (response: any) => {
        if (response?.data?.error === false) {
          const mappedCities = await Promise.all(response?.data?.data.map(async (city: any) => {
            const citydata = { cityName: city.trim(), state: item.stateName.trim(), country: item.countryid.countryName.trim() }
            return citydata;
          })
          );
          await this.cityModel.insertMany(mappedCities).then(async (result: any) => {
          })
            .catch(function (error) {
            })
        }
      })
    })
    );
    // const data = require('../../uploaded/data.json');
    // await Promise.all(data.Sheet1.map(async (item:any) => {
    //     await this.cityModel.findOneAndUpdate({cityName : item.City, state : item.State }, { $set: { cityName: item.City, state: item.State , country: "India"},$push: { pincode: item.Pincode} }, { new: true, useFindAndModify: false, upsert: true }).then((result) => {
    //       return result;
    //     });
              
    // }) );
  };

};