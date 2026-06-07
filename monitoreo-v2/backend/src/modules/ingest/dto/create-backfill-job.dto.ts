import { IsISO8601, IsUUID } from 'class-validator';

export class CreateBackfillJobDto {
  @IsUUID()
  meterId!: string;

  @IsISO8601()
  fromTs!: string;

  @IsISO8601()
  toTs!: string;
}
