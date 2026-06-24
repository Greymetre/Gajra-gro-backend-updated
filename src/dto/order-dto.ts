import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId, IsArray, ValidateNested, MinLength, MaxLength} from 'class-validator';
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

export class CreateOrderDTO {
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => DetailDto)
    detail : [DetailDto];

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid : ObjectId;

    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    parentid: ObjectId;

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
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    beatscheduleid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    createdBy : ObjectId;
};


export class CreateCartItemsDto {
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
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid : ObjectId;

};

export class GetQueryUserDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid : ObjectId;
};

export class GetOrderInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
};

export class CancelOrderDto {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    orderid: ObjectId;

    @ApiProperty()
    @IsString()
    @MinLength(10)
    @MaxLength(500)
    @IsNotEmpty()
    cancelReasons: string;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid : ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid : ObjectId;
};