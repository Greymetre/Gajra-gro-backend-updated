import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllBeatDto {

}

export class GetBeatInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  