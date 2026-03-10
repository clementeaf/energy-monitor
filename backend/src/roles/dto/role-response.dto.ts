import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'OPERATOR' })
  name!: string;

  @ApiProperty({ example: 'Operador' })
  labelEs!: string;

  @ApiProperty({ example: true })
  requiresSiteScope!: boolean;
}