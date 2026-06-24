import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllStateDto {

}

export class GetStateInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  