import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../../entities/state.entity';
import { Country, CountryDocument } from '../../entities/country.entity'
import { CreateStateDto, StatusStateDto, UpdateStateDto, CountryStateDto } from './dto/request-state.dto';
import { GetStateInfoDto, GetAllStateDto } from './dto/response-state.dto';
import { CountryService } from "../country/country.service"
import { Request } from 'express';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class StatesService {
  constructor(@InjectModel(State.name) private stateModel: Model<StateDocument>,
  @InjectModel(Country.name) private countryModel: Model<CountryDocument>) {}

  async getAllStates(): Promise<any> {
    try {
      const data = await this.stateModel.aggregate([
        { $match: {"active":  true} },
        {
          $lookup: {
            from: "countries",
            localField: "countryid",
            foreignField: "_id",
            as: "countryInfo",
          },
        },
        { $unwind: "$countryInfo" },
        {
          $project: {
            _id: 1,
            stateName: { $ifNull: ["$stateName", ""] },
            iso: { $ifNull: ["$iso", ""] },
            countryid: { $ifNull: ["$countryid", ""] },
            countryName: { $ifNull: ["$countryInfo.countryName", ""] },
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

  async getStateInfo(id: string): Promise<GetStateInfoDto> {
    try {
      const data = await this.stateModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "countries",
            localField: "countryid",
            foreignField: "_id",
            as: "countryInfo",
          },
        },
        { $unwind: "$countryInfo" },
        {
          $project: {
            _id: 1,
            stateName: { $ifNull: ["$stateName", ""] },
            iso: { $ifNull: ["$iso", ""] },
            countryid: { $ifNull: ["$countryid", ""] },
            countryName: { $ifNull: ["$countryInfo.countryName", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetStateInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting state details' +e,
      );
    }
  };

  async getCountryStates(countryStateDto : CountryStateDto): Promise<any> {
    try {
      const country = await this.countryModel.findOne({countryName: { $regex: countryStateDto.country } }).select('_id');
      const data = await this.stateModel.aggregate([
        { $match: {"countryid":  ObjectId(country._id)} },
        {
          $project: {
            _id: 1,
            stateName: { $ifNull: ["$stateName", ""] },
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
