import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllRedemptionDto {

}

export class GetRedemptionInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
}
  