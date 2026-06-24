import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CustomerKycInfoDTO {
    @IsString()
    @IsOptional()
    gstinNo: string;
      
    @IsString()
    @IsOptional()
    gstinImage : string;

    @IsString()
    @IsOptional()
    panNo: string;
  
    @IsString()
    @IsOptional()
    panImage : string;

    @IsString()
    @IsOptional()
    aadharNo: string;
  
    @IsString()
    @IsOptional()
    aadharFrontImage : string;

    @IsString()
    @IsOptional()
    aadharBackImage : string;

    @IsString()
    @IsOptional()
    otherNo: string;

    @IsString()
    @IsOptional()
    otherName: string;
  
    @IsString()
    @IsOptional()
    otherFrontImage : string;

    @IsString()
    @IsOptional()
    otherBackImage : string;

    @IsString()
    @IsOptional()
    passbookImage : string;
}