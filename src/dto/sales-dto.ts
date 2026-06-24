import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId, IsArray, ValidateNested, MinLength, MaxLength, IsDate} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class DetailDto {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    productid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    productDetailid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    quantity: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    price: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    discount: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    tax: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    lineTotal: number;
};

export class CreateSaleDTO {
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => DetailDto)
    detail : [DetailDto];

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(70)
    @Transform(({ value }) => value.toString())
    invoiceNo : string;

    @ApiProperty()
    @IsDate()
    @IsOptional()
    invoiceDate : Date;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid : ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    parentid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    orderid : ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    subTotal: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    totalAmount: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    discountAmount: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    taxAmount: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    status: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    paymentStatus: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    address: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @MinLength(3)
    @MaxLength(500)
    @Transform(({ value }) => value.toString())
    terms : string;

    @ApiProperty()
    @IsOptional()
    images: string[];
};


export class GetSaleInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
};