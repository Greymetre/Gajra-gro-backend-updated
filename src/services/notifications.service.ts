import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { promises as fs } from 'fs';
import { Notification, NotificationDocument } from '../entities/notification.entity';
import { Customer, CustomerDocument } from '../entities/customer.entity';
import { State, StateDocument } from '../entities/state.entity';
import { District, DistrictDocument } from '../entities/district.entity';
import { City, CityDocument } from '../entities/city.entity';
import { PushNewsNotification } from '../common/utils/helper.service';
import { uploadStoredFile } from '../common/utils/storage-upload';

export const NEWS_TITLE_MAX = 150;
export const NEWS_MESSAGE_MAX = 1000;
export const NEWS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const NEWS_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CUSTOMER_OPTIONS_LIMIT = 50;
const PUSH_CONCURRENCY = 100;

export interface NewsFilterInput {
  stateId?: string;
  districtId?: string;
  cityId?: string;
  customerIds?: string[] | string;
  search?: string;
}

export interface SendNewsInput extends NewsFilterInput {
  title?: string;
  message?: string;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Customer address keeps state/city as free text, so names are matched exactly but case-insensitively.
const exactName = (value: string) => new RegExp(`^\\s*${escapeRegex(value.trim())}\\s*$`, 'i');

const toObjectId = (value: any, label: string): Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (!Types.ObjectId.isValid(String(value))) throw new BadRequestException(`Invalid ${label}`);
  return new Types.ObjectId(String(value));
};

const parseIdList = (value: any): string[] => {
  if (value === undefined || value === null || value === '') return [];
  let list = value;
  if (typeof value === 'string') {
    try { list = JSON.parse(value); } catch { list = value.split(','); }
  }
  if (!Array.isArray(list)) list = [list];
  const ids = [...new Set(list.map((id: any) => String(id).trim()).filter(Boolean))] as string[];
  if (ids.some(id => !Types.ObjectId.isValid(id))) throw new BadRequestException('Invalid customer selected');
  return ids;
};

const imageBaseUrl = () => (process.env.IMAGE_URL || 'https://gajragro.fieldkonnect.io/').replace(/\/+$/, '') + '/';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(District.name) private districtModel: Model<DistrictDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
  ) { }

  // Resolves the selected ids to names and builds the customer match, like Duke's usersQuery().
  private async buildCustomerMatch(input: NewsFilterInput) {
    const stateId = toObjectId(input.stateId, 'state');
    const districtId = toObjectId(input.districtId, 'district');
    const cityId = toObjectId(input.cityId, 'city');
    const customerIds = parseIdList(input.customerIds);

    const [state, district, city] = await Promise.all([
      stateId ? this.stateModel.findById(stateId, { stateName: 1 }).lean() : null,
      districtId ? this.districtModel.findById(districtId, { districtName: 1, state: 1 }).lean() : null,
      cityId ? this.cityModel.findById(cityId, { cityName: 1, state: 1 }).lean() : null,
    ]);
    if (stateId && !state) throw new BadRequestException('Selected state was not found');
    if (districtId && !district) throw new BadRequestException('Selected district was not found');
    if (cityId && !city) throw new BadRequestException('Selected city was not found');

    const match: any = { active: true };
    if (state) match['address.state'] = exactName(state.stateName);
    if (city) {
      match['address.city'] = exactName(city.cityName);
    } else if (district) {
      const cities = await this.cityModel.find({ districtid: districtId, active: true }, { cityName: 1 }).lean();
      const names = [...new Set(cities.map(c => c.cityName).filter(Boolean))];
      // A district without cities matches nobody rather than everybody.
      match['address.city'] = { $in: names.map(exactName) };
    }
    if (customerIds.length) match._id = { $in: customerIds.map(id => new Types.ObjectId(id)) };

    return {
      match,
      customerIds,
      names: { state: state?.stateName, district: district?.districtName, city: city?.cityName },
    };
  }

  async getFilters(input: NewsFilterInput) {
    const stateId = toObjectId(input.stateId, 'state');
    const districtId = toObjectId(input.districtId, 'district');

    const districtQuery: any = { active: true };
    if (stateId) districtQuery.stateid = stateId;
    const cityQuery: any = { active: true };
    if (districtId) {
      cityQuery.districtid = districtId;
    } else if (stateId) {
      const state = await this.stateModel.findById(stateId, { stateName: 1 }).lean();
      if (state) cityQuery.state = exactName(state.stateName);
    }

    const { match } = await this.buildCustomerMatch({ ...input, customerIds: undefined });
    const customerMatch: any = { ...match };
    const search = String(input.search || '').trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      customerMatch.$or = [{ firmName: regex }, { contactPerson: regex }, { mobile: regex }];
    }

    const [states, districts, cities, customers, totalCustomers] = await Promise.all([
      this.stateModel.find({ active: true }, { stateName: 1 }).sort({ stateName: 1 }).lean(),
      this.districtModel.find(districtQuery, { districtName: 1 }).sort({ districtName: 1 }).lean(),
      this.cityModel.find(cityQuery, { cityName: 1 }).sort({ cityName: 1 }).lean(),
      this.customerModel.find(customerMatch, { firmName: 1, contactPerson: 1, mobile: 1, customerType: 1 })
        .sort({ firmName: 1 }).limit(CUSTOMER_OPTIONS_LIMIT).lean(),
      this.customerModel.countDocuments(match),
    ]);

    return {
      states: states.map(s => ({ value: String(s._id), label: s.stateName })),
      districts: districts.map(d => ({ value: String(d._id), label: d.districtName })),
      cities: cities.map(c => ({ value: String(c._id), label: c.cityName })),
      customers: customers.map(c => ({
        value: String(c._id),
        label: [c.firmName, c.contactPerson && c.contactPerson !== c.firmName ? c.contactPerson : '', c.mobile]
          .filter(Boolean).join(' - ') + (c.customerType ? ` (${c.customerType})` : ''),
      })),
      totalCustomers,
    };
  }

  async sendNews(input: SendNewsInput, image: Express.Multer.File | undefined, createdBy: string) {
    try {
      const title = String(input.title || '').trim();
      const message = String(input.message || '').trim();
      if (!title) throw new BadRequestException('Notification title is required');
      if (!message) throw new BadRequestException('Notification message is required');
      if (title.length > NEWS_TITLE_MAX) throw new BadRequestException(`Title can be at most ${NEWS_TITLE_MAX} characters`);
      if (message.length > NEWS_MESSAGE_MAX) throw new BadRequestException(`Message can be at most ${NEWS_MESSAGE_MAX} characters`);
      if (image && !NEWS_IMAGE_TYPES.includes(image.mimetype)) throw new BadRequestException('Image must be JPG, PNG or WebP');

      const { match, customerIds, names } = await this.buildCustomerMatch(input);
      const recipients = await this.customerModel
        .find(match, { _id: 1, deviceToken: 1, 'deviceInfo.deviceToken': 1 })
        .lean();
      if (!recipients.length) {
        return { data: { recipientCount: 0 }, message: 'No active customers matched the selected filters.' };
      }

      const imageKey = image ? await uploadStoredFile(image, 'notifications') : '';
      const tokens = recipients
        .map(r => String((r as any).deviceInfo?.deviceToken || r.deviceToken || '').trim())
        .filter(t => t && t !== 'undefined' && t !== 'null');
      const withoutTokenCount = recipients.length - tokens.length;

      const news = await this.notificationModel.create({
        users: recipients.map(r => ({ userid: r._id, seen: false, isDeleted: false })),
        title,
        message,
        image: imageKey,
        filters: { ...names, customerIds },
        recipientCount: recipients.length,
        withoutTokenCount,
        createdAt: new Date(),
        createdBy: Types.ObjectId.isValid(createdBy) ? new Types.ObjectId(createdBy) : undefined,
        active: true,
      });

      // Push delivery runs in the background so a large audience does not time out the CRM request;
      // the sent/failed counts are written back to the news record (see News History).
      void this.deliverPush(String(news._id), tokens, title, message, imageKey ? imageBaseUrl() + imageKey : undefined);

      let text = `News saved for ${recipients.length} customer(s). Push notification is being sent to ${tokens.length} device(s).`;
      if (withoutTokenCount > 0) {
        text += ` ${withoutTokenCount} customer(s) have no app token and can read it in the app's notification screen.`;
      }
      return {
        data: { _id: news._id, recipientCount: recipients.length, pushQueued: tokens.length, withoutTokenCount },
        message: text,
      };
    } finally {
      if (image?.path) await fs.unlink(image.path).catch(() => undefined);
    }
  }

  private async deliverPush(newsId: string, tokens: string[], title: string, body: string, imageUrl?: string) {
    let sent = 0;
    for (let i = 0; i < tokens.length; i += PUSH_CONCURRENCY) {
      const results = await Promise.all(
        tokens.slice(i, i + PUSH_CONCURRENCY).map(token => PushNewsNotification(token, title, body, imageUrl)),
      );
      sent += results.filter(Boolean).length;
    }
    await this.notificationModel
      .updateOne({ _id: newsId }, { $set: { pushSentCount: sent, pushFailedCount: tokens.length - sent } })
      .catch(error => console.error('Could not save news push counts:', error?.message));
  }

  async getHistory(page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
    const [docs, totalDocs] = await Promise.all([
      this.notificationModel.aggregate([
        { $match: { active: { $ne: false } } },
        { $sort: { createdAt: -1 } },
        { $skip: (currentPage - 1) * perPage },
        { $limit: perPage },
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', pipeline: [{ $project: { firstName: 1, lastName: 1 } }], as: 'creator' } },
        {
          $project: {
            title: 1, message: 1, image: 1, filters: 1, recipientCount: 1, pushSentCount: 1,
            pushFailedCount: 1, withoutTokenCount: 1, createdAt: 1,
            seenCount: { $size: { $filter: { input: { $ifNull: ['$users', []] }, cond: { $eq: ['$$this.seen', true] } } } },
            createdByName: {
              $trim: { input: { $concat: [
                { $ifNull: [{ $arrayElemAt: ['$creator.firstName', 0] }, ''] }, ' ',
                { $ifNull: [{ $arrayElemAt: ['$creator.lastName', 0] }, ''] },
              ] } },
            },
          },
        },
      ]),
      this.notificationModel.countDocuments({ active: { $ne: false } }),
    ]);
    return { docs, totalDocs, page: currentPage, limit: perPage, totalPages: Math.ceil(totalDocs / perPage) };
  }

  // Soft delete: hidden from News History and from every customer's app list. The image stays in storage.
  async deleteNews(newsId: string, deletedBy: string) {
    const id = toObjectId(newsId, 'notification');
    if (!id) throw new BadRequestException('Notification id is required');
    const result = await this.notificationModel.updateOne(
      { _id: id, active: { $ne: false } },
      { $set: { active: false, deletedAt: new Date(), deletedBy: toObjectId(deletedBy, 'user') } },
    );
    if (!result.matchedCount) throw new NotFoundException('News not found or already deleted');
    return { data: { _id: id }, message: 'News deleted successfully' };
  }

  // ---- Customer app (loyalty) ----

  // read: true = only seen, false = only unseen, undefined = all
  async getCustomerNews(customerId: string, page = 1, limit = 20, read?: boolean) {
    const id = toObjectId(customerId, 'customer');
    if (!id) throw new BadRequestException('Login required');
    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
    const mine: any = { userid: id, isDeleted: { $ne: true } };
    if (read === true) mine.seen = true;
    if (read === false) mine.seen = { $ne: true };
    const match = { active: true, users: { $elemMatch: mine } };
    const [docs, totalDocs, unseenCount] = await Promise.all([
      this.notificationModel.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (currentPage - 1) * perPage },
        { $limit: perPage },
        {
          $project: {
            title: 1, message: 1, createdAt: 1,
            image: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$image', ''] } }, 0] }, { $concat: [imageBaseUrl(), '$image'] }, ''] },
            seen: { $anyElementTrue: { $map: { input: '$users', in: { $and: [{ $eq: ['$$this.userid', id] }, { $eq: ['$$this.seen', true] }] } } } },
          },
        },
      ]),
      this.notificationModel.countDocuments(match),
      this.notificationModel.countDocuments({ active: true, users: { $elemMatch: { userid: id, seen: false, isDeleted: { $ne: true } } } }),
    ]);
    return { docs, totalDocs, unseenCount, page: currentPage, limit: perPage, totalPages: Math.ceil(totalDocs / perPage) };
  }

  async markCustomerNewsSeen(customerId: string, newsId?: string) {
    const id = toObjectId(customerId, 'customer');
    if (!id) throw new BadRequestException('Login required');
    const filter: any = { active: true, users: { $elemMatch: { userid: id, seen: false } } };
    if (newsId) filter._id = toObjectId(newsId, 'notification');
    const result = await this.notificationModel.updateMany(
      filter,
      { $set: { 'users.$[me].seen': true, 'users.$[me].seenAt': new Date() } },
      { arrayFilters: [{ 'me.userid': id }] },
    );
    if (newsId && !result.matchedCount) {
      const exists = await this.notificationModel.exists({ _id: filter._id, 'users.userid': id });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { updated: result.modifiedCount };
  }
}
