import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CreateCouponPointDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string;
}



export class CreateRedemptionDto {

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
    points: number;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    salesid: ObjectId;
}

export class UpdateRedemptionDto {
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    status: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    details: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    transactionID: string;

}

export class StatusRedemptionDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }


  export class StatussRedemptionDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    id: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value.toString())
    status: string;
  }
