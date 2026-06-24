import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Helpdesk, HelpdeskDocument } from '../../entities/helpdesk.entity';
import { CreateHelpDeskDto } from 'src/dto/helpdesk-dto';
import { Request } from 'express';
import { getCustomerAuthInfo } from '../../common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class HelpdeskService {
  constructor(@InjectModel(Helpdesk.name) private helpdeskModel: Model<HelpdeskDocument>) { }

  public async createNewHelpdesk(createHelpdeskDTO: CreateHelpDeskDto, req: Request): Promise<any> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    const helpdesk = new this.helpdeskModel({ ...createHelpdeskDTO, customerid: authInfo._id });
    if (helpdesk.save()) {
      return helpdesk
    }
    else {
      throw new BadRequestException('insufficient balance');
    }
  };
  async getAllHelpdesk(req): Promise<any> {
    try {
      const authInfo = await getCustomerAuthInfo(req.headers)
      const data = await this.helpdeskModel.aggregate([
        { $match: { customerid: ObjectId(authInfo._id) } },
        {
          $project: {
            _id: 1,
            ticketNo: { $ifNull: ["$ticketNo", 0] },
            subject: { $ifNull: ["$subject", ""] },
            details: { $ifNull: ["$details", ""] },
            mobile: { $ifNull: ["$mobile", ""] },
            status: { $ifNull: ["$status", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };

  async getHelpdeskInfo(id: string): Promise<Helpdesk> {
    try {
      const data = await this.helpdeskModel.aggregate([
        { $match: { "_id": ObjectId(id) } },
        {
          $project: {
            _id: 1,
            ticketNo: { $ifNull: ["$ticketNo", 0] },
            subject: { $ifNull: ["$subject", ""] },
            details: { $ifNull: ["$details", ""] },
            mobile: { $ifNull: ["$mobile", ""] },
            files: { $ifNull: ["$files", []] },
            status: { $ifNull: ["$status", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return data[0];
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting transaction details' + e,
      );
    }
  };
}

