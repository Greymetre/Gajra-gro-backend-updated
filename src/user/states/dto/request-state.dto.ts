import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty , IsMongoId, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
export class CreateStateDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    stateName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    iso: string;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    countryid: ObjectId;

}

export class UpdateStateDto extends CreateStateDto {

}

export class StatusStateDto {
    @ApiProperty()
    @IsString()
    stateid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
}

export class CountryStateDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    country: string;
}