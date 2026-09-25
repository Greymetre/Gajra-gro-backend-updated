import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { District, DistrictDocument } from '../entities/district.entity';
import { Country, CountryDocument } from '../entities/country.entity';
import { State, StateDocument } from '../entities/state.entity';
import { City, CityDocument } from '../entities/city.entity';
import { applyLocationRows, LOCATION_TYPES, LocationType, syncLocationsFromSfa } from '../common/utils/sfa-location-sync';
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

  // One row per city pincode: { currentPage, recordPerPage, search }
  async getAllPincodes(body: any = {}): Promise<any> {
    const currentPage = Math.max(1, Number(body?.currentPage) || 1);
    const recordPerPage = Math.min(500, Math.max(1, Number(body?.recordPerPage) || 100));
    const search = String(body?.search || '').trim();
    const pipeline: any[] = [
      { $match: { 'pincode.0': { $exists: true } } },
      {
        $project: {
          cityName: 1, district: 1, state: 1, country: 1, active: 1,
          pincode: 1,
          sfaPins: { $ifNull: ['$sfaPincodes.pincode', []] },
        },
      },
      { $unwind: '$pincode' },
    ];
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      pipeline.push({ $match: { $or: [{ pincode: rx }, { cityName: rx }, { district: rx }, { state: rx }] } });
    }
    pipeline.push(
      { $sort: { pincode: 1 } },
      {
        $facet: {
          paginate: [{ $count: 'totalDocs' }],
          docs: [
            { $skip: (currentPage - 1) * recordPerPage },
            { $limit: recordPerPage },
            {
              $project: {
                _id: 0,
                cityid: '$_id',
                pincode: 1, cityName: 1, district: 1, state: 1, country: 1, active: 1,
                fromSfa: { $in: ['$pincode', '$sfaPins'] },
              },
            },
          ],
        },
      },
    );
    const [data] = await this.cityModel.aggregate(pipeline).exec();
    const totalDocs = data?.paginate?.[0]?.totalDocs || 0;
    return { docs: data?.docs || [], totalDocs, currentPage, recordPerPage, totalPages: Math.ceil(totalDocs / recordPerPage) };
  };

  // Deletes a district and unlinks it from its cities (the cities themselves stay)
  async deleteDistrict(id: string): Promise<any> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid district id');
    }
    try {
      const district = await this.districtModel.findByIdAndDelete(id).exec();
      if (!district) {
        throw new BadRequestException('District not found');
      }
      await this.cityModel.updateMany(
        { districtid: ObjectId(id) },
        { $unset: { districtid: '' }, $set: { district: '' } },
      ).exec();
      return district;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('error while deleting district' + e);
    }
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
    // Pincodes live as a list on each city; an inactive SFA pincode is not in that list
    const countPincodes = async () => {
      const [row] = await this.cityModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $size: { $ifNull: ['$pincode', []] } } },
            active: {
              $sum: {
                $cond: [{ $eq: ['$active', true] }, { $size: { $ifNull: ['$pincode', []] } }, 0],
              },
            },
          },
        },
      ]).exec();
      return { total: row?.total || 0, active: row?.active || 0 };
    };
    const [countries, states, districts, cities, pincodes] = await Promise.all([
      count(this.countryModel),
      count(this.stateModel),
      count(this.districtModel),
      count(this.cityModel),
      countPincodes(),
    ]);
    return { countries, states, districts, cities, pincodes };
  };

  private get syncDeps() {
    return {
      countryModel: this.countryModel,
      stateModel: this.stateModel,
      districtModel: this.districtModel,
      cityModel: this.cityModel,
    };
  }

  // Manual trigger for the SFA location pull (the nightly cron runs it too)
  async syncFromSfa(full = true): Promise<any> {
    return syncLocationsFromSfa(this.syncDeps, full);
  };

  // One change pushed by SFA: { type, rows, deletedIds }
  async applySfaPush(body: any): Promise<any> {
    const type = body?.type as LocationType;
    if (!LOCATION_TYPES.includes(type)) {
      throw new BadRequestException('type must be countries, states, districts, cities or pincodes');
    }
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const deletedIds = Array.isArray(body?.deletedIds) ? body.deletedIds : [];
    return applyLocationRows(this.syncDeps, type, rows, deletedIds);
  };
}
