import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateBeatDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    beatName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    city: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    state: string;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    userid: string;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    customerid: string;
}

export class UpdateBeatDto extends CreateBeatDto {

}

export class StatusBeatDto {
    @ApiProperty()
    @IsString()
    beatid: string;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }

  export class BeatUsersDto {
    @ApiProperty()
    @IsString()
    beatid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsArray()
    users: string;
}

export class BeatCustomersDto {
    @ApiProperty()
    @IsString()
    beatid: string;
  
    @ApiProperty()
    @IsOptional()
    @IsArray()
    customers: string;
}