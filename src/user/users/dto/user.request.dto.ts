import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString,IsEmail, MaxLength, ValidateIf, IsNumber, IsArray, ArrayNotEmpty, ValidateNested, validate, IsDefined, IsNotEmptyObject, IsObject, IsNotEmpty , IsMongoId, IsDate, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

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

export class CreateUserDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    firstName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    lastName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    phoneCode: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    mobile: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value?.trim())
    email: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    password: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    gender: string;

    @ApiProperty()
    @IsOptional()
    avatar: any;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    reporting: ObjectId[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    workingArea: string[];

    @ApiProperty()
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dateOfBirth: Date;

    @ApiProperty()
    @IsOptional()
    @IsObject()
    @Type(() => addressDTO)
    address: addressDTO;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    userType: string;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    createdBy: ObjectId;

    @ApiProperty()
    @IsOptional()
    // @Transform(({ value }) => value.toString())
    categories: ObjectId[];
}

export class UpdateUserDto extends CreateUserDto {
  
}

export class StatusUserDto {
    @ApiProperty()
    @IsString()
    userid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    active: boolean;
  }


  
  export class BulkUsersDto {
    @ValidateNested({ each: true })
    @Type(() => CreateUserDto)
    @IsOptional()
    users?: CreateUserDto[];
  }
 
  export class dashboardDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    userType: string;
  }
 


