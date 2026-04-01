import { IsUUID } from 'class-validator';

export class AddTenantUnitMeterDto {
  @IsUUID()
  meterId!: string;
}
