import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shoppingcart, ShoppingcartDocument } from '../../entities/shoppingcart.entity';
import { Request } from 'express';
import { getAuthUserInfo } from '../../common/utils/jwt.helper';
import { ShoppingCartDTO } from 'src/dto/shoppingcart-dto'
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class ShoppingcartService {
  constructor(@InjectModel(Shoppingcart.name) private cartModel: Model<ShoppingcartDocument>) {}

  public async createBeatschedule(shoppingCartDto: ShoppingCartDTO, req: Request) {
    const authInfo = await getAuthUserInfo(req.headers)
    const beatschedule = new this.cartModel({...shoppingCartDto, createdBy : authInfo._id });
    if(beatschedule.save())
    {
      return beatschedule
    }
    throw new BadRequestException('Error in Create Beatschedule');
  }

  async getAllBeatschedule(): Promise<any> {
    try {
      const data = await this.cartModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beats",
            localField: "beatid",
            foreignField: "_id",
            as: "beatInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: "$beatInfo" },
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
            title: { $ifNull: ["$title", ""] },
            type: { $ifNull: ["$type", []] },
            objectives: { $ifNull: ["$objectives", ""] },
            visitedAt: { $ifNull: ["$visitedAt", ""] },
            cities: { $ifNull: ["$cities", []] },
            visitedcities: { $ifNull: ["$visitedcities", []] },
            beatid: { $ifNull: ["$beatid", ""] },
            beatName: { $ifNull: ["$beatInfo.beatName", ""] },
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
      throw new InternalServerErrorException(
        'error while getting beatschedule details' +e,
      );
    }
  }

  async getBeatscheduleInfo(id: string): Promise<any> {
    try {
      const data = await this.cartModel.aggregate([
        { $match: {"_id":  ObjectId(id)} },
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "beats",
            localField: "beatid",
            foreignField: "_id",
            as: "beatInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $unwind: "$beatInfo" },
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
            title: { $ifNull: ["$title", ""] },
            type: { $ifNull: ["$type", []] },
            objectives: { $ifNull: ["$objectives", ""] },
            visitedAt: { $ifNull: ["$visitedAt", ""] },
            cities: { $ifNull: ["$cities", []] },
            visitedcities: { $ifNull: ["$visitedcities", []] },
            beatid: { $ifNull: ["$beatid", ""] },
            beatName: { $ifNull: ["$beatInfo.beatName", ""] },
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
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting beatschedule details' +e,
      );
    }
  }

  async updateBeatscheduleInfo(id: string, shoppingCartDto: ShoppingCartDTO) : Promise<any> {
    try {
      return await this.cartModel.findByIdAndUpdate(id, shoppingCartDto,{ new: true, useFindAndModify: false })
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e,);
    }
  }

  async deleteBeatschedule(id: string) : Promise<any> {
    try {
      return await this.cartModel.findByIdAndDelete(id)
    } 
    catch (e) {
      throw new InternalServerErrorException('error while getting beatschedule details' +e,);
    }
  }
}