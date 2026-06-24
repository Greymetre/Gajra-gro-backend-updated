import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Surveyquestion, SurveyquestionDocument } from '../../entities/surveyquestion.entity';
import { CreateSurveyquestionDto, StatusSurveyquestionDto, UpdateSurveyquestionDto } from './dto/request-surveyquestion.dto';
import { GetSurveyquestionInfoDto, GetAllSurveyquestionDto } from './dto/response-surveyquestion.dto';
import { Request } from 'express';

const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class SurveyquestionsService {
  constructor(@InjectModel(Surveyquestion.name) private questionModel: Model<SurveyquestionDocument>) {}
  
  async getAllSurveyquestion(): Promise<any> {
    try {
      const data = await this.questionModel.aggregate([
        {
          $project: {
            _id: 1,
            fieldName: { $ifNull: ["$fieldName", ""] },
            fieldType: { $ifNull: ["$fieldType", ""] },
            labelName: { $ifNull: ["$labelName", ""] },
            isRequired: { $ifNull: ["$isRequired", false] },
            isMultiple: { $ifNull: ["$isMultiple", false] },
            customerType: { $ifNull: ["$customerType", []] },
            options: { $ifNull: ["$options", []] },
            ranking: { $ifNull: ["$ranking", 1000] },
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
        'error while getting surveyquestion details' +e,
      );
    }
  };

  async getSurveyquestionInfo(id: string): Promise<GetSurveyquestionInfoDto> {
    try {
      const data = await this.questionModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $project: {
            _id: 1,
            fieldName: { $ifNull: ["$fieldName", ""] },
            fieldType: { $ifNull: ["$fieldType", ""] },
            labelName: { $ifNull: ["$labelName", ""] },
            isRequired: { $ifNull: ["$isRequired", false] },
            isMultiple: { $ifNull: ["$isMultiple", false] },
            customerType: { $ifNull: ["$customerType", []] },
            options: { $ifNull: ["$options", []] },
            ranking: { $ifNull: ["$ranking", 1000] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSurveyquestionInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting surveyquestion details' +e,
      );
    }
  };

}

