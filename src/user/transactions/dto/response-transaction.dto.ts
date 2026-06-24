import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllTransactionDto {

}

export class GetTransactionInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
}
  