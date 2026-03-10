import { ApiProperty } from '@nestjs/swagger';

export class ViewResponseDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'BUILDINGS_OVERVIEW' })
  code!: string;

  @ApiProperty({ example: 'Edificios' })
  label!: string;

  @ApiProperty({ example: '/' })
  routePath!: string;

  @ApiProperty({ example: 'Dashboard' })
  navigationGroup!: string;

  @ApiProperty({ example: true })
  showInNav!: boolean;

  @ApiProperty({ example: 10 })
  sortOrder!: number;

  @ApiProperty({ example: false })
  isPublic!: boolean;
}