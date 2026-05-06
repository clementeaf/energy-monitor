import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeletionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
