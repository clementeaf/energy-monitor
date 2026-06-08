import { Type } from 'class-transformer';
import { IsIn, IsInt } from 'class-validator';

/** Query params for compare dashboard building aggregates. */
export class CompareBuildingsQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 7, 30])
  days!: number;
}
