import { IsIn } from 'class-validator';

export class UpdateCnrStatusDto {
  @IsIn(['in_review', 'approved', 'rejected'])
  status!: string;
}
