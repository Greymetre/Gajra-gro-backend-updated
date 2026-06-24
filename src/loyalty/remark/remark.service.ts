import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Remark, RemarkDocument } from '../../entities/remark.entity';
import { BadRequestException, Injectable,InternalServerErrorException } from '@nestjs/common';
import {GetremarkInfoDto} from "./dto/response-remark.dto"
import {CreateRemarkDTO} from "./dto/request-remark.dto"
import { Request } from 'express';
@Injectable()
export class RemarkService {
    constructor(
    @InjectModel(Remark.name) private remarkModel: Model<RemarkDocument>) {}

    public async addRemark(req: Request,createRemarkDTO: CreateRemarkDTO) {
      const findRemark = await this.remarkModel.find({remark:createRemarkDTO.remark});
      if(findRemark.length > 0){
        throw new BadRequestException('Remark already exist');
      }
        const remark = new this.remarkModel(createRemarkDTO);
        if(remark.save())
        {
          return new GetremarkInfoDto(remark)
        }
        throw new BadRequestException('Error in Create Remark');
    };

    async getAllRemark(): Promise<any> {
      try {
        const data = await this.remarkModel.find().exec()
        if (!data) {
          throw new BadRequestException('Data Not Found');
        }
        return data;
      } catch (e) {
        throw new InternalServerErrorException(
          'error while getting remark details' + e,
        );
      }
    };
}
