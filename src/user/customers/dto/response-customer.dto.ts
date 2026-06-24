import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllCustomerDto {
  @ApiProperty()
    protected readonly data: object;
    protected readonly totalDocs: number;
    protected readonly recordPerPage: number;
    protected readonly currentPage: number;
    constructor(data) {
      return data;
    }
}

export class GetCustomerInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
}
  