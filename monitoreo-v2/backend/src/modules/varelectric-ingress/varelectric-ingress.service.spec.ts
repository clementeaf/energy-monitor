import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import type { CreateVarElectricDto } from './dto/create-var-electric.dto';
import { VarelectricIngressService } from './varelectric-ingress.service';

const BUILDING_ID = 'b0000002-0000-0000-0000-000000000000';
const TENANT_ID = '84adf8d4-830d-46e1-bef5-e2eac6a19014';

function buildKeyUser(buildingIds: string[]): JwtPayload {
  return {
    sub: 'api-key',
    email: '',
    tenantId: TENANT_ID,
    roleId: '',
    roleSlug: 'api_key',
    permissions: ['varelectric:create'],
    buildingIds,
  };
}

function buildRecord(
  overrides: Partial<CreateVarElectricDto> = {},
): CreateVarElectricDto {
  return {
    idvar_electric: 1,
    estado: 1,
    id_remarcador: 101,
    fecha: '2026-09-30 10:15:00',
    tag1: 230,
    tag2: 231,
    tag3: 229,
    tag4: 12.5,
    tag5: 11.9,
    tag6: 12.1,
    tag9: 8.4,
    tag12: 0.93,
    tag14: 15230.5,
    ...overrides,
  };
}

describe('VarelectricIngressService', () => {
  let query: jest.Mock;
  let service: VarelectricIngressService;

  beforeEach(() => {
    query = jest.fn();
    service = new VarelectricIngressService({ query } as unknown as DataSource);
  });

  it('maps var_electric tags to readings columns in insert order', () => {
    expect(VarelectricIngressService.mapTagsToReadings(buildRecord())).toEqual([
      230, 231, 229, 12.5, 11.9, 12.1, 8.4, 0.93, 15230.5,
    ]);
    expect(
      VarelectricIngressService.mapTagsToReadings(
        buildRecord({ tag12: undefined }),
      )[7],
    ).toBeNull();
  });

  it('treats fecha without offset as building-local time and with offset as absolute', () => {
    expect(
      VarelectricIngressService.splitTimestamp('2026-09-30 10:15:00'),
    ).toEqual({
      absolute: null,
      local: '2026-09-30 10:15:00',
    });
    expect(
      VarelectricIngressService.splitTimestamp('2026-09-30T13:15:00Z'),
    ).toEqual({
      absolute: '2026-09-30T13:15:00Z',
      local: null,
    });
    expect(
      VarelectricIngressService.splitTimestamp('2026-09-30T10:15:00-03:00')
        .absolute,
    ).not.toBeNull();
  });

  it('rejects an API key not scoped to exactly one building', async () => {
    await expect(
      service.ingest(buildKeyUser([]), [buildRecord()]),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.ingest(buildKeyUser(['a', 'b']), [buildRecord()]),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 404 when the key building does not belong to the key tenant', async () => {
    query.mockResolvedValueOnce([]);
    await expect(
      service.ingest(buildKeyUser([BUILDING_ID]), [buildRecord()]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips records missing power or energy and does not touch meters when none remain', async () => {
    query.mockResolvedValueOnce([
      { id: BUILDING_ID, code: 'VE-ALTOPENA', timezone: 'America/Santiago' },
    ]);

    const result = await service.ingest(buildKeyUser([BUILDING_ID]), [
      buildRecord({ tag9: null }),
      buildRecord({ tag14: undefined }),
    ]);

    expect(result).toEqual({ inserted: 0, skipped: 2 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('auto-registers meters and inserts readings scoped to the key building', async () => {
    query
      .mockResolvedValueOnce([
        { id: BUILDING_ID, code: 'VE-ALTOPENA', timezone: 'America/Santiago' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'meter-101', id_remarcador: '101' },
        { id: 'meter-102', id_remarcador: '102' },
      ])
      .mockResolvedValueOnce([{}, {}]);

    const result = await service.ingest(buildKeyUser([BUILDING_ID]), [
      buildRecord(),
      buildRecord({ id_remarcador: 102 }),
      buildRecord({ id_remarcador: 103, tag9: null }),
    ]);

    expect(result).toEqual({ inserted: 2, skipped: 1 });
    const [, meterInsertParams] = query.mock.calls[1] as [string, unknown[]];
    expect(meterInsertParams).toEqual([
      TENANT_ID,
      BUILDING_ID,
      'VE-ALTOPENA',
      [101, 102],
      'varelectric',
    ]);
    const [, readingParams] = query.mock.calls[3] as [string, unknown[]];
    expect(readingParams.slice(0, 7)).toEqual([
      TENANT_ID,
      'America/Santiago',
      'varelectric',
      'meter-101',
      null,
      '2026-09-30 10:15:00',
      230,
    ]);
    expect(readingParams[3 + 12]).toBe('meter-102');
  });
});
