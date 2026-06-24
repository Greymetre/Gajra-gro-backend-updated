import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsEmail, IsDefined, IsNotEmptyObject, IsObject, ValidateNested, IsMongoId, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
import {CustomerDto} from '../../../dto/customer-dto'
import { bool } from 'aws-sdk/clients/signer';
class deviceInfoDTO {
    @IsString()
    @IsOptional()
    appVersion: string;
  
    @IsString()
    @IsOptional()
    deviceToken: string;

    @IsString()
    @IsOptional()
    deviceType: string;

    @IsString()
    @IsOptional()
    deviceName: string;
}

class locationDTO {
    @IsArray()
    @IsOptional()
    coordinates: string;
}

class addressDTO {
    @IsString()
    @IsNotEmpty()
    postalCode: string;
  
    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsString()
    @IsNotEmpty()
    country: string;
}

class kycInfoDTO {
    @IsString()
    @IsNotEmpty()
    docNo: string;
  
    @IsString()
    @IsNotEmpty()
    docType: string;

    @IsString()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    verified: string;
}

class surveyDataDTO {
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    questions: ObjectId;
  
    @IsString()
    @IsNotEmpty()
    answers: string;
}

class userAssignDTO {
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;
  
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    reporting: ObjectId;
}
 
export class CreateCustomerDto extends CustomerDto {

}

export class BulkCustomerDto  { 
    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerDto)
    customers: CustomerDto[];
}

export class UpdateCustomerDto extends CustomerDto {

}

export class StatusCustomerDto {
    @ApiProperty()
    @IsMongoId()
    customerid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
}

export class UserAssignToCustomerDto {
    @ApiProperty()
    @IsMongoId()
    customerid: string;
  
    @IsString()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;
  
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    reporting: ObjectId;
}

export class ParentAssignToCustomerDto {
    @ApiProperty()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;
  
    @ApiProperty()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    parentid: ObjectId;
}

export class AddRemarkDto {
    @ApiProperty()
    @IsMongoId()
    @Transform(({ value }) => value.toString())
    remarkid: ObjectId;
}

