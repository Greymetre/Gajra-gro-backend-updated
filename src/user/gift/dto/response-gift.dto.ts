import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllGiftDto {

}

export class GetGiftInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
