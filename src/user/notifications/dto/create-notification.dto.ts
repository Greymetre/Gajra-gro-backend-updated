import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {}

// Query of GET user/notifications/filters
export class NewsFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() districtId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional({ description: 'Search customers by firm name, contact person or mobile' })
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

// Multipart body of POST user/notifications/send (image is the file field `image`)
export class SendNewsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() districtId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional({ description: 'JSON array (or comma separated) of customer ids; empty = all matching customers' })
  @IsOptional() customerIds?: string | string[];
  // Length limits are checked in NotificationsService so the CRM gets a readable message.
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}
