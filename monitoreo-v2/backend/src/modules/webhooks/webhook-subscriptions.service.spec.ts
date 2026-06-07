import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { WebhookSubscriptionsService } from './webhook-subscriptions.service';
import { WebhookSubscription } from '../platform/entities/webhook-subscription.entity';

describe('WebhookSubscriptionsService', () => {
  let service: WebhookSubscriptionsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => ({ id: 'sub-1', createdAt: new Date(), updatedAt: new Date(), ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOneBy: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(2),
      createQueryBuilder: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        WebhookSubscriptionsService,
        { provide: getRepositoryToken(WebhookSubscription), useValue: repo },
      ],
    }).compile();

    service = module.get(WebhookSubscriptionsService);
  });

  it('creates subscription without returning secret', async () => {
    const result = await service.create('t-1', {
      eventType: 'alert.created',
      url: 'https://hooks.example.com/alerts',
      secret: 'abcdefghijklmnop',
    });

    expect(result.id).toBe('sub-1');
    expect(result.eventType).toBe('alert.created');
    expect(result).not.toHaveProperty('secret');
    expect(repo.save).toHaveBeenCalled();
  });

  it('removes subscription by tenant scope', async () => {
    const ok = await service.remove('sub-1', 't-1');
    expect(ok).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith({ id: 'sub-1', tenantId: 't-1' });
  });

  it('rejects private IP URLs on create', async () => {
    await expect(
      service.create('t-1', {
        eventType: 'reading.stale',
        url: 'http://192.168.1.1/hook',
        secret: 'abcdefghijklmnop',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
