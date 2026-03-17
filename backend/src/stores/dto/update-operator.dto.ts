import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateOperatorDto {
  @IsString()
  @IsNotEmpty()
  newName!: string;
}
