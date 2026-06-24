import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf, IsNumber, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
export class passwordRequestDto {
    @ApiProperty()
    @IsString()
    password: string;
}
export class LoginRequestDto extends passwordRequestDto {
  @ApiProperty()
  @IsString()
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
}

export class EmailRequestDto {
    @ApiProperty()
    @IsString()
    email: string;
}

export class MobileRequestDto {
    @ApiProperty()
    @IsString()
    mobile: string;
}

export class changePasswordRequestDto extends passwordRequestDto{
    @ApiProperty()
    @IsString()
    currentPassword: string;
}

export class CheckUserMobileExistDto extends MobileRequestDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid : string;
}

export class CheckUserEmailExistDto extends EmailRequestDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid : string;
}



