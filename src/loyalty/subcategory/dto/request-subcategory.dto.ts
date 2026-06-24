import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
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
    ranking: number;

    @ApiProperty()
    @IsOptional()
    subcategoryImage: string;
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    categoryid: string;

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