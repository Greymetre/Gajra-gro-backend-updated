import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class schemeDetailDTO {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    detailName: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => IsMongoId())
    products: ObjectId[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => IsMongoId())
    categories: ObjectId[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => IsMongoId())
    subcategories: ObjectId[];

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    minimum: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    maximum: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    points: number;
}

class CategoryPercentageDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty()
    @IsNumber()
    @Type(() => Number)
    percentage: number;
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

    @ApiProperty()
    @IsArray()
    @IsOptional()
    customerType: string[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    @Type(() => IsMongoId())
    customers: ObjectId[];

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    basedOn: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    frequency: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    states: string[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    cities: string[];

    @IsDefined()
    @IsOptional()
    @IsArray()
    @ValidateNested()
    @Type(() => schemeDetailDTO)
    schemeDetail: schemeDetailDTO;

    // basedOn "Percentage": total % of normal scheme points per mechanic category (Platinum, Diamond, ...)
    @ApiProperty({ type: [CategoryPercentageDTO] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CategoryPercentageDTO)
    categoryPercentages: CategoryPercentageDTO[];

    @ApiProperty({ enum: ['Regular', 'Booster'] })
    @IsOptional()
    @IsIn(['Regular', 'Booster'])
    schemeTag: string;
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
    @IsBoolean()
    active: boolean;
}

export class ImportSchemeDetailDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    detailName: string;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    categories: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    subcategories: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    products: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    points: string;
}

export class LoyaltyschemeIDDto {
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    schemeid: ObjectId;
}