import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { Types, ObjectId } from "mongoose";

export class CustomerIdDTO {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @IsString()
    @IsOptional()
    deviceToken: string;


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
};



