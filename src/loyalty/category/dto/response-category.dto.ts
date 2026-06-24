import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCategoryDto {

}

export class GetCategoryInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  