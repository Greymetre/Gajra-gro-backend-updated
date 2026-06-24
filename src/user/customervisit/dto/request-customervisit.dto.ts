import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class locationDTO {
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    coordinates: number;
  
    @IsString()
    @IsOptional()
    address: string;
}

export class CreateCustomervisitDto {

    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    checkinAt: Date;

    @IsDefined()
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => locationDTO)
    checkinLocation: locationDTO;

    @ApiProperty()
    @IsOptional()
    @IsDefined()
    @IsDateString()
    checkoutAt: Date;
    
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    beatscheduleid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    summary: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    summaryType: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    visitImage: string;

    @ApiProperty()
    @IsOptional()
    @IsDefined()
    @IsDateString()
    nextVisitAt: Date;
}

export class UpdateCustomervisitDto extends CreateCustomervisitDto {

}

export class StatusCustomervisitDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customervisitid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }