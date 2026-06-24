import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
import { Optional } from '@nestjs/common';

export class CreateCouponPointDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string;
}



export class CreateTransactionDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    invoiceNo: string;

    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    schemeid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    points: string;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    salesid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    pointType: string;
}

export class UpdateTransactionDto extends CreateTransactionDto {

}

export class StatusTransactionDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    transactionid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }

  class CouponItemDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    coupon: string;
}

  export class CouponsScanDTO {
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;
    
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => CouponItemDTO)
    coupons : [CouponItemDTO];
}


export class StatusCouponDtos {

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  invalidCouponid: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  productid: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  customerid: ObjectId;

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  schemeid: ObjectId;

  
  @ApiProperty()
  @IsNumber()
  @Optional()
  points: number;

  
  @ApiProperty()
  @IsString()
  @Optional()
  couponCode: string;

  @ApiProperty()
  @IsString()
  @Optional()
  pointType: string;

  @ApiProperty()
  @IsOptional()
  @Optional()
  statusType: string;

  @ApiProperty()
  @IsOptional()
  @Optional()
  remark: string;

}

export class ProductDropdownDto {

  @IsMongoId()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  invalidCouponid: ObjectId;

 
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  search: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  pointSearch: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  descriptionSearch: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  numberSearch: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toString())
  partNumberSearch: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  condition: string[];
}