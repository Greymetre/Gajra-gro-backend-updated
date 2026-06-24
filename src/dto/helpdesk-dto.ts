import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class CreateHelpDeskDto {
    @ApiProperty()
    @IsNumber()
    @IsOptional()
    ticketNo: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    subject: string;
  
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    details: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    mobile: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    files: string[];
};