import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { Types, ObjectId } from "mongoose";

// All fields are optional: the mobile Profile lets customers save partial bank
// details. The IMPS screen still validates and sends all of them itself.
export class BankInfoDTO {
    @ApiProperty()
    @IsString()
    @IsOptional()
    accountNo: string;
  
    @ApiProperty()
    @IsString()
    @IsOptional()
    holderName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    accountType: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    bankName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    branch: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    ifsc: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    image: string;
};

export class UpiInfoDTO {
    
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    upiNumber: string;

    @ApiProperty()
    @IsString()
    upiHolderName: string;

    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    image: string;

};

export class UpiVerifiedDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    upiNumber: string;
    
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    verifiedBy: ObjectId;
};