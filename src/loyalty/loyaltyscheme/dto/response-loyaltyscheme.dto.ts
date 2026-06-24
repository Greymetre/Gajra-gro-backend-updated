import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllLoyaltyschemeDto {

}

export class GetLoyaltyschemeInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  