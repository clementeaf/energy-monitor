import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  BreachReportsController,
  BREACH_NOTIFICATION_HOURS,
} from './breach-reports.controller';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { NotFoundException } from '@nestjs/common';

const fakeUser: JwtPayload = {
  sub: 'u-1',
  email: 'admin@test.com',
  tenantId: 't-1',
  role: 'admin',
  permissions: [],
} as unknown as JwtPayload;

describe('BreachReportsController (CYB-16)', () => {
  let controller: BreachReportsController;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [BreachReportsController],
      providers: [{ provide: DataSource, useValue: ds }],
    }).compile();

    controller = module.get(BreachReportsController);
  });

  describe('BREACH_NOTIFICATION_HOURS constant', () => {
    it('equals 24 (Anexo 07 CYB-16)', () => {
      expect(BREACH_NOTIFICATION_HOURS).toBe(24);
    });
  });

  describe('create', () => {
    it('sets deadline to detectedAt + 24h', async () => {
      const detectedAt = '2026-06-15T10:00:00.000Z';
      const expectedDeadline = new Date(
        new Date(detectedAt).getTime() + 24 * 60 * 60 * 1000,
      );

      ds.query.mockResolvedValueOnce([
        { id: 'br-1', notification_deadline: expectedDeadline.toISOString() },
      ]);

      const result = await controller.create(fakeUser, {
        description: 'Data leak',
        dataTypesAffected: ['email'],
        severity: 'high',
        detectedAt,
      });

      const insertCall = ds.query.mock.calls[0];
      const deadlineParam = insertCall[1][7];
      expect(deadlineParam).toBe(expectedDeadline.toISOString());
      expect(result.id).toBe('br-1');
      expect(typeof result.hoursRemaining).toBe('number');
    });

    it('deadline is exactly 24h, not 72h', async () => {
      const detectedAt = '2026-01-01T00:00:00.000Z';
      const wrongDeadline72h = new Date(
        new Date(detectedAt).getTime() + 72 * 60 * 60 * 1000,
      );

      ds.query.mockResolvedValueOnce([
        { id: 'br-2', notification_deadline: '' },
      ]);

      await controller.create(fakeUser, {
        description: 'Test',
        dataTypesAffected: ['phone'],
        severity: 'low',
        detectedAt,
      });

      const deadlineParam = ds.query.mock.calls[0][1][7];
      expect(deadlineParam).not.toBe(wrongDeadline72h.toISOString());

      const expected24h = new Date(
        new Date(detectedAt).getTime() + 24 * 60 * 60 * 1000,
      );
      expect(deadlineParam).toBe(expected24h.toISOString());
    });
  });

  describe('findAll', () => {
    it('returns mapped breach reports', async () => {
      ds.query.mockResolvedValueOnce([
        {
          id: 'br-1',
          description: 'Leak',
          data_types_affected: ['email'],
          estimated_subjects: 50,
          severity: 'high',
          detected_at: '2026-06-15T10:00:00Z',
          notification_deadline: '2026-06-16T10:00:00Z',
          agency_notified_at: null,
          subjects_notified_at: null,
          status: 'open',
          resolution_notes: null,
          reported_by_email: 'admin@test.com',
          created_at: '2026-06-15T10:01:00Z',
        },
      ]);

      const result = await controller.findAll(fakeUser);

      expect(result).toHaveLength(1);
      expect(result[0].notificationDeadline).toBe('2026-06-16T10:00:00Z');
      expect(result[0].severity).toBe('high');
    });
  });

  describe('update', () => {
    it('updates status and resolution notes', async () => {
      ds.query
        .mockResolvedValueOnce([{ id: 'br-1' }])
        .mockResolvedValueOnce(undefined);

      const result = await controller.update('br-1', {
        status: 'resolved',
        resolutionNotes: 'Fixed',
      });

      expect(result.success).toBe(true);
      const updateCall = ds.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE breach_reports');
      expect(updateCall[1]).toContain('resolved');
      expect(updateCall[1]).toContain('Fixed');
    });

    it('throws NotFoundException for missing report', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(
        controller.update('non-existent-id', { status: 'resolved' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets agencyNotifiedAt and subjectsNotifiedAt', async () => {
      ds.query
        .mockResolvedValueOnce([{ id: 'br-1' }])
        .mockResolvedValueOnce(undefined);

      await controller.update('br-1', {
        status: 'notified',
        agencyNotifiedAt: '2026-06-15T12:00:00Z',
        subjectsNotifiedAt: '2026-06-15T13:00:00Z',
      });

      const updateSql = ds.query.mock.calls[1][0];
      expect(updateSql).toContain('agency_notified_at');
      expect(updateSql).toContain('subjects_notified_at');
    });
  });
});
