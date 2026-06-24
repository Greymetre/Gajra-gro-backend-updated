import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class DeviceInfoDto {
    @IsString()
    @IsOptional()
    appVersion: string;
  
    @IsString()
    @IsOptional()
    deviceToken: string;

    @IsString()
    @IsOptional()
    deviceType: string;

    @IsString()
    @IsOptional()
    deviceName: string;
};
