import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
import { PaginationRequestDto } from './pagination-dto';
import { Optional } from '@nestjs/common';

class CouponItemDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  coupon: string;
}

export class CouponsScanDTO {
  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CouponItemDTO)
  coupons: [CouponItemDTO];
}

export class AdminCouponsScanDTO extends CouponsScanDTO {
  @IsMongoId()
  @IsNotEmpty()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;
}

export class CustomerCouponsScanDTO extends CouponsScanDTO {
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;
}


export class FilterPaginationTransactionDto extends PaginationRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  search: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  startDate: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  endDate: string;

 
  @ApiProperty()
  @IsArray()
  @IsOptional()
  pointType: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  all: string;

  @ApiProperty()
  @IsOptional()
  customerType: string[];
}

export class ImportCouponTransactionDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  coupon: string;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;


}

export class ImportTransactionDTO {
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pointType: string;
}


export class AddInvalidCouponDTO {
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;



  @ApiProperty()
  @IsArray()
  @IsOptional()
  couponImage: string[];

  @ApiProperty()
  @IsArray()
  @IsOptional()
  s3Image: string[];


  @ApiProperty()
  @IsString()
  @IsOptional()
  couponGg: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  couponCode: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  statusType: string;

}


export class FilterPaginationInvalidCouponDto extends PaginationRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  search: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  startDate: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  endDate: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  statusType: string;
}