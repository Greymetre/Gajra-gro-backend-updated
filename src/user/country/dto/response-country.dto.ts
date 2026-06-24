import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCountryDto {

}

export class GetCountryInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  