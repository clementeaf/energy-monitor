import { ApiProperty } from '@nestjs/swagger';
import { AdminUserResponseDto } from './admin-user-response.dto';

export class CreateUserInvitationResponseDto extends AdminUserResponseDto {
  @ApiProperty({ example: 'Q4bR8C7Q1kt3M1gN9rP1m2z4YkH6u7Js' })
  invitationToken!: string;
}