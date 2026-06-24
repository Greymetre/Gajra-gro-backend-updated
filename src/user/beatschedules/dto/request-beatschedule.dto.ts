import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CreateBeatscheduleDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    date: Date;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    title: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    type: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    objectives: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    visitedAt: Date;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    cities: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    visitedcities: string;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    beatid: ObjectId;
}

export class UpdateBeatscheduleDto extends CreateBeatscheduleDto {

}

export class StatusBeatscheduleDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    beatscheduleid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }