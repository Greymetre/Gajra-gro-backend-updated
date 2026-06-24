import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllSurveyquestionDto {

}

export class GetSurveyquestionInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  