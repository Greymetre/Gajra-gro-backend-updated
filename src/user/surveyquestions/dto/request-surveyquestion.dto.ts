import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateSurveyquestionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    fieldName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    fieldType: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    labelName: string;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    isRequired: string;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    isMultiple: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsArray()
    customerType: string;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    options: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    ranking: number;
}

export class UpdateSurveyquestionDto extends CreateSurveyquestionDto {

}

export class StatusSurveyquestionDto {
    @ApiProperty()
    @IsString()
    questionid: string;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
  }