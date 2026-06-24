import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateCategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    categoryName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    categoryDescription: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    ranking: number;

    @ApiProperty()
    @IsOptional()
    categoryImage: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {

}

export class StatusCategoryDto {
    @ApiProperty()
    @IsString()
    categoryid: string;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }