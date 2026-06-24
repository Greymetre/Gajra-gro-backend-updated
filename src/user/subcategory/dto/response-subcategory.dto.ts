import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllSubcategoryDto {

}

export class GetSubcategoryInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  