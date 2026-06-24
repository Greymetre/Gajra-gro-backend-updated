import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";


export class CouponInfoDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  couponCount: number;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  productid: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  categoryid: ObjectId;

  @ApiProperty()
  @IsOptional()
  packingList : string;
}
export class CreateCouponDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  profileName: string;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  startDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  expiryDate: Date;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  customerType: string[];

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CouponInfoDto)
  couponInfo: [CouponInfoDto];

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  createdBy: ObjectId;

}

export class UpdateCouponDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  profileName: string;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  products: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  categories: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerType: ObjectId[];

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  startDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsDefined()
  @IsDateString()
  expiryDate: Date;
}

export class StatusCouponDto {

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  couponprofileid: ObjectId;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  active: string;

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;
}

export class CouponProfileIdDto {
  @IsMongoId()
  @IsNotEmpty()
  @Transform(({ value }) => value.toString())
  profileid: ObjectId;
}

export class CouponImportDto {
  @ApiProperty()
  @IsArray()
  @IsOptional()
  coupons: any[];
}

export class CouponImportMultipleDto {
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  createdBy: ObjectId;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  coupons: any[];


}

export class ReplacePackingSlipDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPackingSlip: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newPackingSlip: string;
}