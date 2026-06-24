import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsArray , IsMongoId, IsBoolean} from 'class-validator';
import { Transform } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
export class CreateCityDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    cityName: string;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    pincode: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    state: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    country: string;
}

export class UpdateCityDto extends CreateCityDto {

}

export class StatusCityDto {
    @ApiProperty()
    @IsString()
    cityid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
}

export class PincodeCityDto {
    @ApiProperty()
    @IsString()
    cityid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsArray()
    pincode: string;
}

export class StateCityDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    state: string;
}