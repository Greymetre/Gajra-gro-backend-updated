import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Surveyquestion, SurveyquestionDocument } from '../entities/surveyquestion.entity';
import { CreateSurveyquestionDto, StatusSurveyquestionDto, UpdateSurveyquestionDto } from '../user/surveyquestions/dto/request-surveyquestion.dto';
import { GetSurveyquestionInfoDto } from '../user/surveyquestions/dto/response-surveyquestion.dto';
import { Request } from 'express';
import { getAuthUserInfo } from '../common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class SurveyquestionsService {
  constructor(@InjectModel(Surveyquestion.name) private questionModel: Model<SurveyquestionDocument>) {}
  public async createSurveyquestion(createSurveyquestionDto: CreateSurveyquestionDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const surveyquestion = new this.questionModel({...createSurveyquestionDto, createdBy : authInfo._id });
    if(surveyquestion.save())
    {
      return new GetSurveyquestionInfoDto(surveyquestion)
    }
    throw new BadRequestException('Error in Create Surveyquestion');
  };

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

  async updateSurveyquestionInfo(id: string, updateSurveyquestionDto: UpdateSurveyquestionDto) : Promise<Surveyquestion> {
    try {
      return await this.questionModel.findByIdAndUpdate(id, updateSurveyquestionDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting surveyquestion details' +e,);
    }
  };

  async deleteSurveyquestion(id: string) : Promise<Surveyquestion> {
    try {
      return await this.questionModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting surveyquestion details' +e,);
    }
  };

  async updateStatus(statusSurveyquestionDto: StatusSurveyquestionDto) : Promise<Surveyquestion> {
    try {
      return await this.questionModel.findByIdAndUpdate(statusSurveyquestionDto.questionid, { active : statusSurveyquestionDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting surveyquestion details' +e,);
    }
  };
};

