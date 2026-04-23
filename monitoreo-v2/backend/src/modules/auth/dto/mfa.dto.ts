import { IsString, IsNotEmpty, IsUUID, Matches } from 'class-validator';

const MFA_CODE_PATTERN = /^\d{6}$/;

export class MfaCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(MFA_CODE_PATTERN, { message: 'Code must be exactly 6 digits.' })
  code!: string;
}

export class MfaValidateDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(MFA_CODE_PATTERN, { message: 'Code must be exactly 6 digits.' })
  code!: string;
}
