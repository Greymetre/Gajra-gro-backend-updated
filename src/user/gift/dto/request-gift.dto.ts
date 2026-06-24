import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDate, IsNumberString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class CreateGiftDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    giftName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    giftDescription: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    brand: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    model: string;

    @ApiProperty()
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    price: number;

    @ApiProperty()
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    mrp: number;

    @ApiProperty()
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    points: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    giftType: string;

    @ApiProperty()
    @IsDate()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    expirydate: Date;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    images: string[];
}

export class UpdateGiftDto extends CreateGiftDto {

}

export class StatusGiftDto {
    @ApiProperty()
    @IsString()
    giftid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
  }
