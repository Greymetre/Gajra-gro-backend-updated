import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SettingProject, SettingProjectDocument } from 'src/entities/setting.project.entity';
import { BannerProjectSettingDTO, ContactSettingDto, GetSettingInfoDto, ImagePathSettingDTO, LoyaltySettingDto, PermissionDto, ProjectSettingDto, YoutubeShortsDto } from 'src/dto/setting-dto';
import { RemoveFilesHelper } from 'src/common/utils/helper.service';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class SettingService {
  constructor(@InjectModel(SettingProject.name) private settingModel: Model<SettingProjectDocument>) { }

  async getAdminSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            customerType: { $ifNull: ["$customerType", []] },
            // roles: { $ifNull: ["$roles", []] },
            banner: { $ifNull: ["$banner", []] },
            login: { $ifNull: ["$login", {}] },
            loyaltyscheme: { $ifNull: ["$loyaltyscheme", {}] },
            points: { $ifNull: ["$points", {}] },
            redemption: { $ifNull: ["$redemption", {}] },
            gift: { $ifNull: ["$gift", {}] },
            helpdesk: { $ifNull: ["$helpdesk", {}] },
            socialmedia: { $ifNull: ["$socialmedia", {}] },
            catalogue: { $ifNull: ["$catalogue", {}] },
            mobileapp: { $ifNull: ["$mobileapp", {}] },
            callcenter: { $ifNull: ["$callcenter", {}] },
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

  async getLoyaltyUserSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            customerType: { $ifNull: ["$customerType", []] },
            login_image: { $ifNull: ["$login.image", ''] },
            login_background: { $ifNull: ["$login.background", false] },
            login_with_password: { $ifNull: ["$login.login_with_password", true] },
            verified_check: { $ifNull: ["$login.verified_check", false] },
            login_with_otp: { $ifNull: ["$login.login_with_otp", false] },
            banner: { $ifNull: ["$banner", []] },
            loyaltyscheme: { $ifNull: ["$loyaltyscheme", {}] },
            points: { $ifNull: ["$points", {}] },
            redemption: { $ifNull: ["$redemption", {}] },
            helpdesk: { $ifNull: ["$helpdesk", {}] },
            socialmedia: { $ifNull: ["$socialmedia", {}] },
            catalogue: { $ifNull: ["$catalogue", {}] },
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

  public async uploadBannerImages(createBannetDto: BannerProjectSettingDTO) {
    try {
      return await this.settingModel.findOneAndUpdate({}, { $push: { banner: createBannetDto.banner } }, { new: true, useFindAndModify: false, upsert: true }).then((banner) => {
        if (!banner) throw new BadRequestException('Error in Image Upload');
        return banner;
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  async getBannerImages(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            banner: { $ifNull: ["$banner", []] },
            welcome: { $ifNull: ["$points.welcome", 0] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getWelcomePointsSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            welcome: { $ifNull: ["$points.welcome", 0] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto((data[0]) ? data[0].welcome : 0);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  public async updateLoyaltySetting(loyaltySettingDto: LoyaltySettingDto) {
    try {
      return await this.settingModel.findOneAndUpdate({}, { $set: loyaltySettingDto }, { new: true, useFindAndModify: false, upsert: true }).then((banner) => {
        if (!banner) throw new BadRequestException('Error in Image Upload');
        return banner;
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  public async updateContactSetting(contactSettingDto: ContactSettingDto) {
    try {
      return await this.settingModel.findOneAndUpdate({}, { $set: contactSettingDto }, { new: true, useFindAndModify: false, upsert: true }).then((banner) => {
        if (!banner) throw new BadRequestException('Error in Image Upload');
        return banner;
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  async getLoyaltySetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            coupon_based: { $ifNull: ["$loyaltyscheme.coupon_based", false] },
            sales_based: { $ifNull: ["$loyaltyscheme.sales_based", false] },
            customerType_based: { $ifNull: ["$loyaltyscheme.customerType_based", false] },
            scheme_start_alert: { $ifNull: ["$loyaltyscheme.scheme_start_alert", false] },
            startedAt: { $ifNull: ["$loyaltyscheme.startedAt", ''] },
            endedAt: { $ifNull: ["$loyaltyscheme.endedAt", ''] },
            point_value: { $ifNull: ["$points.point_value", 1] },
            welcome: { $ifNull: ["$points.welcome", 0] },
            scheme_types: { $ifNull: ["$loyaltyscheme.scheme_types", []] },
            scheme_based: { $ifNull: ["$loyaltyscheme.scheme_based", []] },
            states_based: { $ifNull: ["$loyaltyscheme.states_based", false] },
            city_based: { $ifNull: ["$loyaltyscheme.city_based", false] },
            customer_based: { $ifNull: ["$loyaltyscheme.customer_based", false] },
            category_based: { $ifNull: ["$loyaltyscheme.category_based", false] },
            subcategory_based: { $ifNull: ["$loyaltyscheme.subcategory_based", false] },
            product_based: { $ifNull: ["$loyaltyscheme.product_based", false] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getContactSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            helpdesk: { $ifNull: ["$helpdesk", {}] },
            socialmedia: { $ifNull: ["$socialmedia", {}] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getRedemptionSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            startedAt: { $ifNull: ["$redemption.startedAt", ''] },
            endedAt: { $ifNull: ["$redemption.endedAt", ''] },
            every_threshold: { $ifNull: ["$redemption.every_threshold", false] },
            first_threshold: { $ifNull: ["$redemption.first_threshold", false] },
            threshold: { $ifNull: ["$redemption.threshold", 0] },
            milestone_points: { $ifNull: ["$redemption.milestone_points", false] },
            automated: { $ifNull: ["$redemption.automated", false] },
            approval: { $ifNull: ["$redemption.approval", false] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  public async updateProjectSetting(projectSettingDto: ProjectSettingDto) {
    try {
      return await this.settingModel.findOneAndUpdate({}, { $set: projectSettingDto }, { new: true, useFindAndModify: false, upsert: true }).then((banner) => {
        if (!banner) throw new BadRequestException('Error in Image Upload');
        return banner;
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  async getCustomerType(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$customerType", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$customerType", ""] },
            value: { $ifNull: ["$customerType", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getRedeemTypes(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            redeemType: { $ifNull: ["$redemption.redeem_types", []] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0].redeemType);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getLoyaltyDashboardSetting(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            verified_check: { $ifNull: ["$login.verified_check", false] },
            banner: { $ifNull: ["$banner", []] },
            scheme_startedAt: { $ifNull: ["$loyaltyscheme.startedAt", ''] },
            scheme_endedAt: { $ifNull: ["$loyaltyscheme.endedAt", ''] },
            redemption_startedAt: { $ifNull: ["$redemption.startedAt", ''] },
            redemption_endedAt: { $ifNull: ["$redemption.endedAt", ''] },
            threshold: { $ifNull: ["$redemption.threshold", 0] },
            every_threshold: { $ifNull: ["$redemption.every_threshold", false] },
            first_threshold: { $ifNull: ["$redemption.first_threshold", false] },
            loyalty_app_version: { $ifNull: ["$mobileapp.loyalty_version", ''] },
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

  async getRejectReason(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            rejectReason: { $ifNull: ["$redemption.reject_reason", []] },
          },
        },
        { $limit: 1 },
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0].rejectReason);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getRoles(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$permissions", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$permissions.role", ""] },
            value: { $ifNull: ["$permissions.role", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getSchemeType(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$loyaltyscheme.scheme_types", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$loyaltyscheme.scheme_types", ""] },
            value: { $ifNull: ["$loyaltyscheme.scheme_types", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getSchemeBasedOn(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$loyaltyscheme.scheme_based", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$loyaltyscheme.scheme_based", ""] },
            value: { $ifNull: ["$loyaltyscheme.scheme_based", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async updatePermissionSetting(permissionDto: PermissionDto[]): Promise<any> {
    try {
      return await this.settingModel.findOneAndUpdate({}, { $set: { permissions: Object.values(permissionDto) } }, { new: true, useFindAndModify: false, upsert: true }).then((setting) => {
        if (!setting) throw new BadRequestException('Error in Seen Welcome');
        return setting;
      });
    }
    catch (e) {
      throw new InternalServerErrorException('error while getting product details' + e,);
    }
  };

  async getPermissions(userType: string): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$permissions", "preserveNullAndEmptyArrays": true } },
        {
          $match: {
            $or: [
              { "permissions.role": { $regex: userType, '$options': 'i' } },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            role: { $ifNull: ["$permissions.role", ""] },
            canAccess: { $ifNull: ["$permissions.canAccess", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data[0]);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getRolePermissions(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        {
          $project: {
            _id: 0,
            permissions: { $ifNull: ["$permissions", []] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      const permissions = (Array.isArray(data) && data.length && data[0].permissions) ? data[0].permissions : []
      return new GetSettingInfoDto(permissions);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getCallTypes(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$callcenter.calltypes", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$callcenter.calltypes", ""] },
            value: { $ifNull: ["$callcenter.calltypes", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };

  async getCallStatus(): Promise<any> {
    try {
      const data = await this.settingModel.aggregate([
        { $unwind: { "path": "$callcenter.callstatus", "preserveNullAndEmptyArrays": true } },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$callcenter.callstatus", ""] },
            value: { $ifNull: ["$callcenter.callstatus", ""] },
          },
        }
      ]).exec()
      if (!data) {
        throw new BadRequestException('Data Not Found');
      }
      return new GetSettingInfoDto(data);
    } catch (e) {
      throw new InternalServerErrorException(
        'error while getting images' + e,
      );
    }
  };
  
  async removeBannerImage(imagepathDto: ImagePathSettingDTO): Promise<any> {
    try {
      return await this.settingModel.findOne({}, async function (err, docs) {
        if (err) throw new BadRequestException('Data Not Found');
        const images = await docs.banner.filter(function (item: string) { return item !== imagepathDto.image })
        docs.banner = images;
        docs.save(async function (err) {
          if (err) {
            throw new BadRequestException('Data Not Found');
          }
          await RemoveFilesHelper(imagepathDto.image)
          return new GetSettingInfoDto(docs);
        })
      });
    }
    catch (e) {
      throw new InternalServerErrorException(e);
    }
  };

  public async updateYoutubeShorts(
    youtubeShortsDto: YoutubeShortsDto,
  ) {
    try {
      return await this.settingModel.findOneAndUpdate(
        {},
        {
          $set: {
            youtubeShorts: youtubeShortsDto.youtubeShorts,
          },
        },
        {
          new: true,
          useFindAndModify: false,
          upsert: true,
        },
      ).then((data) => {
        if (!data) {
          throw new BadRequestException(
            'Error updating YouTube Shorts links',
          );
        }

        return data;
      });
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

async getYoutubeShorts(): Promise<any> {
  try {
    const data = await this.settingModel.findOne(
      {},
      {
        _id: 0,
        youtubeShorts: 1,
      },
    );

    console.log(data)

    return {
      youtubeShorts: data?.youtubeShorts || [],
    };
  } catch (e) {
    throw new InternalServerErrorException(
      'error while getting youtube shorts ' + e,
    );
  }
}  
};

