import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveRectificationDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
