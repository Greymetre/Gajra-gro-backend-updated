import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
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
    ranking: number;

     @ApiProperty()
@IsOptional()
@Transform(({ value }) => value === 'true' || value === true)
@IsBoolean()
isNewLaunch: boolean;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    discount: number;

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    productDetail: object;
}

export class UpdateProductDto extends CreateProductDto {

}

export class StatusProductDto {
    @ApiProperty()
    @IsString()
    productid: string;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }