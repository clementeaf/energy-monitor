import { Test } from '@nestjs/testing';
import { OAuthTokenController } from './oauth-token.controller';
import { OAuthClientsService } from './oauth-clients.service';

describe('OAuthTokenController', () => {
  let controller: OAuthTokenController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      issueToken: jest.fn().mockResolvedValue({
        access_token: 'tok',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [OAuthTokenController],
      providers: [{ provide: OAuthClientsService, useValue: service }],
    }).compile();

    controller = module.get(OAuthTokenController);
  });

  it('POST token delegates to service', async () => {
    const result = await controller.issueToken({
      grant_type: 'client_credentials',
      client_id: 'emoc_abc',
      client_secret: 'secret',
    });
    expect(result.access_token).toBe('tok');
    expect(service.issueToken).toHaveBeenCalledWith('emoc_abc', 'secret');
  });
});
