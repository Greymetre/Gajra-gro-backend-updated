import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class CouponItemDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    coupon: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    invoiceNo : string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    points : number;
};
export class CouponsDTO {
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => CouponItemDTO)
    coupons : [CouponItemDTO];
};
