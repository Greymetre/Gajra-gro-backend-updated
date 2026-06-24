import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CreateCouponPointDto {

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string[];
}



export class CreateTransactionDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
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
