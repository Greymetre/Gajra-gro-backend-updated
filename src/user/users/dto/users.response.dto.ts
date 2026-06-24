import { ApiProperty } from '@nestjs/swagger';

 export class UserResponseDto  {
  @ApiProperty()
  protected readonly data: object;
  constructor(data) {
    return data;
  }
}
