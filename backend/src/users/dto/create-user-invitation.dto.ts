import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUserInvitationDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Operador Turno A' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  roleId!: number;

  @ApiProperty({ example: ['pac4220'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  siteIds!: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}