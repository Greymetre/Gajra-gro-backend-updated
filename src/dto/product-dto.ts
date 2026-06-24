import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId, IsArray, ValidateNested, MinLength, MaxLength} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
import { PaginationRequestDto } from './pagination-dto';
export class CategoryIdArrayDto {
    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => String)
    category: string[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => String)
    exceptids: string[];
};

export class FilterPaginationProductDto extends PaginationRequestDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    search: string;

    @ApiProperty()
    @IsOptional()
    categories: string[];

      @IsOptional()
  @IsString()
  productNo: string;

  @IsOptional()
  @IsString()
  partNo: string;

  @IsOptional()
  @IsString()
  specification: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  brand: string;

  @IsOptional()
  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  categoryName: string;

  @IsOptional()
  @IsString()
  subcategoryName: string;
};