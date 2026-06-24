import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class schemeDetailDTO {
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    productid: ObjectId;
  
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    categoryid: ObjectId;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    subcategoryid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    minimum: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    maximum: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    points: number;
}

export class CreateLoyaltyschemeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    schemeName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    schemeDescription: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    startedAt: Date;

    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    endedAt: Date;

    @ApiProperty()
    @IsString()
    @IsOptional()
    schemeImage: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    schemeType: string;

    @IsDefined()
    @IsOptional()
    @IsArray()
    @ValidateNested()
    @Type(() => schemeDetailDTO)
    schemeDetail: schemeDetailDTO;
}

export class UpdateLoyaltyschemeDto extends CreateLoyaltyschemeDto {

}

export class StatusLoyaltyschemeDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    schemeid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }