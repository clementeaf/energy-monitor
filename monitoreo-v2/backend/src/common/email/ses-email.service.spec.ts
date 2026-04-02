import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SesEmailService } from './ses-email.service';

describe('SesEmailService', () => {
  it('skips send when SES_FROM_EMAIL is unset', async () => {
    const module = await Test.createTestingModule({
      providers: [
        SesEmailService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    const service = module.get(SesEmailService);
    const result = await service.sendPlainText({
      to: ['a@b.com'],
      subject: 'S',
      body: 'B',
    });

    expect(result.ok).toBe(false);
    expect(result.skippedReason).toBe('not_configured');
  });

  it('skips send when recipient list is empty', async () => {
    const module = await Test.createTestingModule({
      providers: [
        SesEmailService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => (k === 'SES_FROM_EMAIL' ? 'from@verified.com' : undefined)) },
        },
      ],
    }).compile();

    const service = module.get(SesEmailService);
    const result = await service.sendPlainText({
      to: ['  ', ''],
      subject: 'S',
      body: 'B',
    });

    expect(result.ok).toBe(false);
    expect(result.skippedReason).toBe('no_recipients');
  });
});
