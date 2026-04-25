import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'test@test.com',
  tenantId: 'tenant-1',
  roleId: 'role-1',
  roleSlug: 'operator',
  buildingIds: ['bld-1'],
  permissions: ['monitoring_realtime:read'],
};

describe('ReadingsController', () => {
  let controller: ReadingsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findByMeter: jest.fn().mockResolvedValue([]),
      findLatest: jest.fn().mockResolvedValue([]),
      findAggregated: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      controllers: [ReadingsController],
      providers: [{ provide: ReadingsService, useValue: service }],
    }).compile();

    controller = module.get(ReadingsController);
  });

  describe('findByMeter', () => {
    const query = {
      meterId: 'm-1',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
    };

    it('delegates to service with tenant context', async () => {
      await controller.findByMeter(mockUser, query);

      expect(service.findByMeter).toHaveBeenCalledWith(
        'tenant-1',
        ['bld-1'],
        query,
      );
    });

    it('throws BadRequestException when to < from', async () => {
      await expect(
        controller.findByMeter(mockUser, {
          ...query,
          from: '2026-01-02T00:00:00Z',
          to: '2026-01-01T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findLatest', () => {
    it('delegates to service', async () => {
      const query = { buildingId: 'bld-1' };

      await controller.findLatest(mockUser, query);

      expect(service.findLatest).toHaveBeenCalledWith(
        'tenant-1',
        ['bld-1'],
        query,
        undefined,
      );
    });

    it('works without filters', async () => {
      await controller.findLatest(mockUser, {});

      expect(service.findLatest).toHaveBeenCalledWith(
        'tenant-1',
        ['bld-1'],
        {},
        undefined,
      );
    });
  });

  describe('findAggregated', () => {
    const query = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
      interval: 'daily',
    };

    it('delegates to service with tenant context', async () => {
      await controller.findAggregated(mockUser, query);

      expect(service.findAggregated).toHaveBeenCalledWith(
        'tenant-1',
        ['bld-1'],
        query,
      );
    });

    it('throws BadRequestException when to < from', async () => {
      await expect(
        controller.findAggregated(mockUser, {
          ...query,
          from: '2026-02-01T00:00:00Z',
          to: '2026-01-01T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
