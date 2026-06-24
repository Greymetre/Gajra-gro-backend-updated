import { PartialType, ApiProperty } from '@nestjs/swagger';

export class GetAllAttendanceDto {

}

export class GetAttendanceInfoDto {
    @ApiProperty()
    protected readonly data: object;
    constructor(data) {
      return data;
    }
  }
  