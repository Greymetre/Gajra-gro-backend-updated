import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCouponDto {

}

export class GetCouponInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  