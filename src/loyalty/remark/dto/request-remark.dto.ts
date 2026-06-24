import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId, IsArray, ValidateNested, MinLength, MaxLength, IsDate} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";



export class CreateRemarkDTO {


    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    remark: string;


}

export class AddRemarkDTO {


    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    remarkid: string;
    
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;


}







