import { PartialType, ApiProperty } from '@nestjs/swagger';


export class GetremarkInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }