import { IsBoolean } from 'class-validator';

export class AutomatedDecisionsDto {
  @IsBoolean()
  optOut!: boolean;
}
