import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllTransactionDto {

}

export class GetTransactionInfoDto {
    @ApiProperty()
    protected readonly data: any;
    constructor(data) {
      return data;
    }
}
  