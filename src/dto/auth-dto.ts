import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf, IsNumber, IsMongoId, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

export class passwordRequestDto {
    @ApiProperty()
    @IsString()
    password: string;
};

export class LoginMobileRequestDto  {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    appVersion : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceToken : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceType : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceName : string;
  
};
export class LoginRequestDto extends LoginMobileRequestDto {
    @ApiProperty()
    @IsString()
    password: string;
};

export class LoginWithOtpRequestDto extends LoginMobileRequestDto  {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    otp: string;  
};


export class EmailRequestDto {
    @ApiProperty()
    @IsString()
    email: string;
};

export class MobileRequestDto {
    @ApiProperty()
    @IsString()
    mobile: string;
};

export class changePasswordRequestDto extends passwordRequestDto{
    @ApiProperty()
    @IsString()
    currentPassword: string;
};

export class CreatePasswordRequestDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    password: string;

};



