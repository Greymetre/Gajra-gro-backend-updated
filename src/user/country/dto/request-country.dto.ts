import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateCountryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    countryName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    iso: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    phoneCode: string;

    @ApiProperty()
    @IsOptional()
    location: any;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    currency: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    timezones: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    flag: string;
}

export class UpdateCountryDto extends CreateCountryDto {

}

export class StatusCountryDto {
    @ApiProperty()
    @IsString()
    countryid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
  }