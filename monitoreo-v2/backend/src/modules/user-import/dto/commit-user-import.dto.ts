import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommitUserImportDto {
  @ApiProperty({ description: 'Ley 21.719: admin confirms all users are 14+' })
  @IsBoolean()
  ageVerified!: boolean;
}
