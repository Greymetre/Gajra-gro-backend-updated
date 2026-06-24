import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCityDto {

}

export class GetCityInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  