import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllProductDto {

}

export class GetProductInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  