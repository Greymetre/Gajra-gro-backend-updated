import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class SurveyDataDTO {
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    questions: ObjectId;
  
    @IsString()
    @IsNotEmpty()
    answers: string;
}

export class CustomerSurveyDataDTO {
    @ValidateNested({ each: true })
    @Type(() => SurveyDataDTO)
    surveyData: SurveyDataDTO[];
}

