import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllBeatscheduleDto {

}

export class GetBeatscheduleInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  