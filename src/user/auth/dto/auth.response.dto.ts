import { ApiProperty } from '@nestjs/swagger';
import { User, UserDocument } from '../../../entities/users.entity';
import { InjectModel } from '@nestjs/mongoose';

/**
 * Login response DTO
 */
 export class LoginResponseDto  {
  @ApiProperty()
  protected readonly data: object;
  constructor(data) {
    return data;
  }
}
