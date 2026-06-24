import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, IsDefined, IsDateString, IsArray, ArrayMaxSize, Matches } from 'class-validator';
import { Types, ObjectId } from "mongoose";

export class BannerProjectSettingDTO {
    @ApiProperty()
    @IsString()
    @IsOptional()
    banner: any[];
};

export class LoyaltySchemeSettingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value )
  scheme_start_alert: boolean;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  startedAt: Date;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  endedAt: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value )
  coupon_based: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value )
  sales_based: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value )
  customerType_based: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  scheme_types: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  scheme_based: string[];

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  states_based: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  city_based: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  customer_based: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  category_based: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  subcategory_based: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value )
  product_based: boolean;
};

export class LoyaltyPointSettingDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  point_value: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  welcome: number;
};

export class MobileAppSettingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  loyalty_version: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  sales_version: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  distributor_version: string;
};
export class LoyaltyRedemptionSettingDto {

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  startedAt: Date;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  endedAt: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  every_threshold: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  first_threshold: boolean;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  threshold: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  milestone_points: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  automated: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  approval: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  reject_reason: string[];
};


export class LoyaltySettingDto {
  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltySchemeSettingDto)
  loyaltyscheme: LoyaltySchemeSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyPointSettingDto)
  points : LoyaltyPointSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyRedemptionSettingDto)
  redemption : LoyaltyRedemptionSettingDto;
};

export class HelpdeskSettingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  //@Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  whatsapp: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  address: string;
  
};

export class SocialMediaSettingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  facebook: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  youtube: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  instagram: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  linkedin: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  twitter: string;
};

export class LoginSettingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  background: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  login_with_password: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  login_with_otp: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  verified_check: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  image: string;
};

export class CatalogueSettingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  privacy: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  terms: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  loyalty: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  product: string;
  
};

export class GiftSettingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Transform(({ value }) => value?.trim())
  gift_types: string[];
};

export class CallCenterSettingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  calltypes: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  callstatus: string[];
};

export class ContactSettingDto {
  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => HelpdeskSettingDto)
  helpdesk: HelpdeskSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyPointSettingDto)
  socialmedia : LoyaltyPointSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => CatalogueSettingDto)
  catalogue : CatalogueSettingDto;
};

export class ProjectSettingDto {
  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => HelpdeskSettingDto)
  helpdesk: HelpdeskSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyPointSettingDto)
  socialmedia : LoyaltyPointSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => CatalogueSettingDto)
  catalogue : CatalogueSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltySchemeSettingDto)
  loyaltyscheme: LoyaltySchemeSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyPointSettingDto)
  points : LoyaltyPointSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoyaltyRedemptionSettingDto)
  redemption : LoyaltyRedemptionSettingDto;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  banner: [string];

  @ApiProperty()
  @IsArray()
  @IsOptional()
  customerType: [string];

  // @ApiProperty()
  // @IsArray()
  // @IsOptional()
  // roles: [string];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => LoginSettingDto)
  login : LoginSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => GiftSettingDto)
  gift : GiftSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => MobileAppSettingDto)
  mobileapp : MobileAppSettingDto;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  @Type(() => CallCenterSettingDto)
  callcenter : CallCenterSettingDto;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  youtubeShorts: string[];

};

export class GetSettingInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
};

export class PermissionDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  canAccess: string[];
};

export class ImagePathSettingDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  image: string;
};

export class YoutubeShortsDto {
  @ApiProperty({
    type: [String],
    example: [
      'https://youtube.com/shorts/abc123',
      'https://youtube.com/shorts/xyz456',
    ],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Matches(
    /^https?:\/\/(www\.)?(youtube\.com\/shorts\/|youtu\.be\/)/,
    {
      each: true,
      message: 'Invalid YouTube Shorts URL',
    },
  )
  youtubeShorts: string[];
}
