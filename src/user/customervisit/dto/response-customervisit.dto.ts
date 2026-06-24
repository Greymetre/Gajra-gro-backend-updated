import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCustomervisitDto {

}

export class GetCustomervisitInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  