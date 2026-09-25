import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { District, DistrictDocument } from '../entities/district.entity';
import { Country, CountryDocument } from '../entities/country.entity';
import { State, StateDocument } from '../entities/state.entity';
import { City, CityDocument } from '../entities/city.entity';
import { syncLocationsFromSfa } from '../common/utils/sfa-location-sync';
const ObjectId = require('mongoose').Types.ObjectId;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class DistrictService {
  constructor(
    @InjectModel(District.name) private districtModel: Model<DistrictDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
  ) { }

  // body: { stateid?, state?, active? }
  async getAllDistricts(body: any = {}): Promise<any> {
    try {
      const match: Record<string, any> = {};
      if (body?.stateid && ObjectId.isValid(body.stateid)) {
        match.stateid = ObjectId(body.stateid);
      }
      if (body?.state) {
        match.state = { $regex: `^${escapeRegex(String(body.state).trim())}$`, $options: 'i' };
      }
      if (body?.active !== undefined) {
        match.active = !!body.active;
      }
      return await this.districtModel
        .find(match)
        .select('_id districtName stateid state country active sfaId')
        .sort({ state: 1, districtName: 1 })
        .lean()
        .exec();
    } catch (e) {
      throw new InternalServerErrorException('error while getting district details' + e);
    }
  };

  async getDistrictInfo(id: string): Promise<any> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid district id');
    }
    const data = await this.districtModel.findById(id).lean().exec();
    if (!data) {
      throw new BadRequestException('Data Not Found');
    }
    return data;
  };

  // Totals for the Address Master cards: { countries: { total, active }, states, districts, cities }
  async getLocationCounts(): Promise<any> {
    const count = async (model: Model<any>) => {
      const [total, active] = await Promise.all([
        model.countDocuments({}).exec(),
        model.countDocuments({ active: true }).exec(),
      ]);
      return { total, active };
    };
    const [countries, states, districts, cities] = await Promise.all([
      count(this.countryModel),
      count(this.stateModel),
      count(this.districtModel),
      count(this.cityModel),
    ]);
    return { countries, states, districts, cities };
  };

  // Manual trigger for the SFA location sync (the cron runs it automatically)
  async syncFromSfa(full = true): Promise<any> {
    return syncLocationsFromSfa(
      {
        countryModel: this.countryModel,
        stateModel: this.stateModel,
        districtModel: this.districtModel,
        cityModel: this.cityModel,
      },
      full,
    );
  };
}
