import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
export class CreateSubcategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    subcategoryName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    subcategoryDescription: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => Number.parseInt(value))
    ranking: number;

    @ApiProperty()
    @IsOptional()
    image: string;

    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    categoryid: ObjectId;

    @ApiProperty()
    @IsOptional()
    subcategoryImage: string;
}

export class UpdateSubcategoryDto extends CreateSubcategoryDto {

}

export class StatusSubcategoryDto {
    @ApiProperty()
    @IsString()
    subcategoryid: string;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }