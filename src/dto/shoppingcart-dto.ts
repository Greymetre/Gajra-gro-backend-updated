import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class ShoppingCartDTO {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    productid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsMongoId()
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
}
