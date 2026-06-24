import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray, IsDefined, IsDateString, IsMongoId, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";

class locationDTO {
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    coordinates: number;
  
    @IsString()
    @IsOptional()
    address: string;
}

export class CreateAttendanceDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    userid: ObjectId;

    @ApiProperty()
    @IsNotEmpty()
    @IsDefined()
    @IsDateString()
    punchinAt: Date;

    @ApiProperty()
    @IsOptional()
    @IsDefined()
    @IsDateString()
    punchoutAt: Date;
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    workedTime: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    punchinImage: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    punchoutImage: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    type: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    punchinSummary: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    punchoutSummary: string;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    beatscheduleid: ObjectId;

    @IsDefined()
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => locationDTO)
    punchinLocation: locationDTO;

    @IsDefined()
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => locationDTO)
    punoutLocation: locationDTO;
}

export class UpdateAttendanceDto extends CreateAttendanceDto {

}

export class StatusAttendanceDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    attendanceid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }