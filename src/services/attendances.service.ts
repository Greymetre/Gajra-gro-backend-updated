import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from '../entities/attendance.entity';
import { CreateAttendanceDto, StatusAttendanceDto, UpdateAttendanceDto } from '../user/attendances/dto/request-attendance.dto';
import { GetAttendanceInfoDto } from '../user/attendances/dto/response-attendance.dto';
import { Request } from 'express';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
const ObjectId = require('mongoose').Types.ObjectId;
@Injectable()
export class AttendancesService {
  constructor(@InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>) {}

  public async createAttendance(createAttendanceDto: CreateAttendanceDto, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const attendance = new this.attendanceModel({...createAttendanceDto, createdBy : authInfo._id });
    if(attendance.save())
    {
      return new GetAttendanceInfoDto(attendance)
    }
    throw new BadRequestException('Error in Create Attendance');
  };

  async getAllAttendance(): Promise<any> {
    try {
      const data = await this.attendanceModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beatschedules",
            localField: "beatscheduleid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, title: 1 } }
            ],
            as: "beatscheduleInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            date: { $ifNull: ["$date", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            punchinAt: { $ifNull: ["$punchinAt", ""] },
            punchoutAt: { $ifNull: ["$punchoutAt", ""] },
            workedTime: { $ifNull: ["$workedTime", ""] },
            punchinImage: { $ifNull: ["$punchinImage", ""] },
            punchoutImage: { $ifNull: ["$punchoutImage", ""] },
            punchinLocation: { $ifNull: ["$punchinLocation", {}] },
            punoutLocation: { $ifNull: ["$punoutLocation", {}] },
            type: { $ifNull: ["$type", []] },
            punchinSummary: { $ifNull: ["$punchinSummary", ""] },
            punchoutSummary: { $ifNull: ["$punchoutSummary", ""] },
            title: { $ifNull: ["$beatscheduleInfo.title", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
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
      throw new InternalServerErrorException('error while getting attendance details' +e);
    }
  };

  async getAttendanceInfo(id: string): Promise<GetAttendanceInfoDto> {
    try {
      const data = await this.attendanceModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, firstName: 1, lastName: 1, mobile: 1 } }
            ],
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beatschedules",
            localField: "beatscheduleid",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, title: 1 } }
            ],
            as: "beatscheduleInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: { "path": "$beatscheduleInfo", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 1,
            date: { $ifNull: ["$date", ""] },
            userid: { $ifNull: ["$userid", ""] },
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            punchinAt: { $ifNull: ["$punchinAt", ""] },
            punchoutAt: { $ifNull: ["$punchoutAt", ""] },
            workedTime: { $ifNull: ["$workedTime", ""] },
            punchinImage: { $ifNull: ["$punchinImage", ""] },
            punchoutImage: { $ifNull: ["$punchoutImage", ""] },
            punchinLocation: { $ifNull: ["$punchinLocation", {}] },
            punoutLocation: { $ifNull: ["$punoutLocation", {}] },
            type: { $ifNull: ["$type", []] },
            punchinSummary: { $ifNull: ["$punchinSummary", ""] },
            punchoutSummary: { $ifNull: ["$punchoutSummary", ""] },
            title: { $ifNull: ["$beatscheduleInfo.title", ""] },
            createdAt: { $ifNull: ["$createdAt", ""] },
            active: { $ifNull: ["$active", false] },
          },
        },
        { $limit : 1},
      ]).exec()
      if(!data)
      {
        throw new BadRequestException('Data Not Found');
      }
      return new GetAttendanceInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException('error while getting attendance details' +e);
    }
  };

  async updateAttendanceInfo(id: string, updateAttendanceDto: UpdateAttendanceDto) : Promise<Attendance> {
    try {
      return await this.attendanceModel.findByIdAndUpdate(id, updateAttendanceDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting attendance details' +e,);
    }
  };

  async deleteAttendance(id: string) : Promise<Attendance> {
    try {
      return await this.attendanceModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting attendance details' +e,);
    }
  };

  async updateStatus(statusAttendanceDto: StatusAttendanceDto) : Promise<Attendance> {
    try {
      return await this.attendanceModel.findByIdAndUpdate(statusAttendanceDto.attendanceid, { active : statusAttendanceDto.active},{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting attendance details' +e,);
    }
  };
};