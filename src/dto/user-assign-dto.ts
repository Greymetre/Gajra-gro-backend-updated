import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class UserAssignDTO {
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;
  
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    reporting: ObjectId;
}