import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { UsersService } from './users.service';
import { InvitationValidationResponseDto } from './dto/invitation-validation-response.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Validar invitación pública', description: 'Valida un token de invitación firmado y retorna el contexto de acceso previo al primer login.' })
  @ApiParam({ name: 'token', example: 'Q4bR8C7Q1kt3M1gN9rP1m2z4YkH6u7Js' })
  @ApiOkResponse({ type: InvitationValidationResponseDto })
  @ApiNotFoundResponse({ description: 'Token inválido o inexistente' })
  async validateInvitation(@Param('token') token: string) {
    const invitation = await this.usersService.validateInvitationToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }
}