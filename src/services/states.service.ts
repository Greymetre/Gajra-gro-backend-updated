import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../entities/state.entity';
import { Country, CountryDocument } from '../entities/country.entity'
import { CreateStateDto, StatusStateDto, UpdateStateDto, CountryStateDto } from '../user/states/dto/request-state.dto';
import { GetStateInfoDto } from '../user/states/dto/response-state.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import axios from "axios";
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class StatesService {
  constructor(@InjectModel(State.name) private stateModel: Model<StateDocument>,
  @InjectModel(Country.name) private countryModel: Model<CountryDocument>) {}
  
  public async createState(createStateDto: CreateStateDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const state = new this.stateModel({...createStateDto, createdBy : authInfo._id });
    if(state.save())
    {
      return new GetStateInfoDto(state)
    }
    throw new BadRequestException('Error in Create State');
  };

  async getAllStates(): Promise<any> {
    try {
      const data = await this.stateModel.aggregate([
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
        'error while getting state details' + e,
      );
    }
  };

  async updateStateInfo(id: string, updateStateDto: UpdateStateDto) : Promise<State> {
    try {
      return await this.stateModel.findByIdAndUpdate(id, updateStateDto)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting state details' +e,);
    }
  };

  async deleteState(id: string) : Promise<State> {
    try {
      return await this.stateModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting state details' +e,);
    }
  };

  async updateStatus(statusStateDto: StatusStateDto) : Promise<State> {
    try {
      return await this.stateModel.findByIdAndUpdate(statusStateDto.stateid, { active : statusStateDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting state details' +e,);
    }
  };

  async getCountryStates(countryStateDto : CountryStateDto): Promise<any> {
    try {

      const data = await this.stateModel.aggregate([
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

  async getStateDropDown(countryStateDto : CountryStateDto): Promise<any> {
    try {
      
      var country = { _id : ''}
      if(countryStateDto.country)
      {
        country =  await this.countryModel.findOne({ countryName : 
          // {
          // $regex:
           countryStateDto.country,
        //   $options: 'i'
        // }
       }).exec()
      }
      var match = (countryStateDto.country) ? { countryid: country._id }: { active : true }
      
      const data = await this.stateModel.aggregate([
        {
          $match: match
        },
        {
          $project: {
            _id : 0,
            label: { $ifNull: ["$stateName", ""] },
            value: { $ifNull: ["$stateName", ""] },
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

  public async importStates(): Promise<any> {
    await axios.post('https://countriesnow.space/api/v0.1/countries/states',{ country : "India"}).then(async(response : any) => {  
    if(response?.data?.error === false)
          {
            const { states } = response?.data?.data
            var country = await this.countryModel.findOne({countryName : "India"}).select("_id ").exec();
            const mappedArray = await Promise.all(states.map(async (item:any) => {
                const statesdata = {
                  stateName : item.name,
                  iso : item.state_code,
                  countryid : country._id
                }
                return statesdata;
              }) 
            );
            await this.stateModel.insertMany(mappedArray).then(async(result:any) => {
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
};
