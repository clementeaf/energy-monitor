import { NotFoundException } from '@nestjs/common';
import { InvitationsController } from '../src/users/invitations.controller';
import type { UsersService } from '../src/users/users.service';

describe('InvitationsController', () => {
  const usersService = {
    validateInvitationToken: jest.fn(),
  } as unknown as jest.Mocked<Pick<UsersService, 'validateInvitationToken'>>;

  const controller = new InvitationsController(usersService as unknown as UsersService);

  beforeEach(() => {
    usersService.validateInvitationToken.mockReset();
  });

  it('returns invitation details when token is valid', async () => {
    const result = {
      email: 'operator@example.com',
      name: 'Operador Turno A',
      role: 'OPERATOR',
      roleLabel: 'Operador',
      invitationStatus: 'invited' as const,
      invitationExpiresAt: '2026-03-17T18:30:00.000Z',
    };
    usersService.validateInvitationToken.mockResolvedValue(result);

    await expect(controller.validateInvitation('invite-token-123')).resolves.toEqual(result);
  });

  it('throws NotFoundException when token is invalid', async () => {
    usersService.validateInvitationToken.mockResolvedValue(null);

    await expect(controller.validateInvitation('invalid-token')).rejects.toBeInstanceOf(NotFoundException);
  });
});