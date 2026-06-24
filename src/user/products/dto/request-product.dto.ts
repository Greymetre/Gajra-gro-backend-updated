import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, IsBoolean, IsMongoId, IsDefined } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { Types, ObjectId } from "mongoose";

// class imageDTO {
//     @IsString()
//     @IsNotEmpty()
//     image: string;
// }

export class ProductDetailDTO {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Transform(({ value }) => Number.parseFloat(value))
    mrp: number;
  
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Transform(({ value }) => Number.parseFloat(value))
    price: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    partNo: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    specification: string;
}

export class MeasurementDTO {
    @ApiProperty()
    @IsString()
    @IsOptional()
    weight: string;
  
    @ApiProperty()
    @IsString()
    @IsOptional()
    pcs: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    size: string;
}

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    categoryid: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    subcategoryid: string;

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
    @IsOptional()
    @Transform(({ value }) => Number.parseInt(value))
    ranking: number;

    @ApiProperty()
@IsOptional()
@Transform(({ value }) => value === 'true' || value === true)
@IsBoolean()
isNewLaunch: boolean;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => Number.parseInt(value))
    points: number;
    
    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => Number.parseFloat(value))
    discount: number;

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @Type(() => ProductDetailDTO)
    productDetail:  ProductDetailDTO[];

    @ApiProperty()
    @IsOptional()
    images?: any;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    productNo: string;

    @IsDefined()
    @IsOptional()
    @Type(() => MeasurementDTO)
    measurement: MeasurementDTO;
}

export class ImportProductDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    description: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    productNo: string;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    categoryid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    subcategoryid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    brand: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    weight: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    pcs: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    size: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    model: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    // @Transform(({ value }) => value?.trim())
    mrp: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    // @Transform(({ value }) => value?.trim())
    price: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    partNo: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    specification: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    // @Transform(({ value }) => value?.trim())
    points: string;
}

export class UpdateProductDto extends CreateProductDto {

}

export class StatusProductDto {
    @ApiProperty()
    @IsString()
    productid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
  }