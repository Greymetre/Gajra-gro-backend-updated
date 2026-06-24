import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CreateCallSummaryDTO {
    @IsString()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;
  
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    callType: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    summary: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    notes: string;
    
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    callStatus: string;

    @ApiProperty()
    @IsOptional()
    createdAt : Date;

};

export class GetCallSummaryDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
};