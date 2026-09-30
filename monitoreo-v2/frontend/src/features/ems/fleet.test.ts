import { describe, expect, it } from 'vitest';
import type { Building } from '../../types/building';
import type { Meter } from '../../types/meter';
import type { AggregatedReading, LatestReading } from '../../types/reading';
import {
  buildCentros,
  buildRemarcadores,
  classifyCentro,
  classifyConnection,
  PORTFOLIO_CURVE,
  toLoadCurves,
} from './fleet';

const NOW = new Date('2026-09-30T14:00:00Z');

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function buildBuilding(overrides: Partial<Building>): Building {
  return {
    id: 'b-1', tenantId: 't-1', name: 'Alto Penalolen', code: 'VE-ALTOPENA', address: 'Penalolen',
    areaSqm: '0.00', regionId: null, countryCode: null, timezone: null, externalSiteId: null,
    siteKind: null, latitude: null, longitude: null, isActive: true, createdAt: '', updatedAt: '',
    ...overrides,
  };
}

function buildMeter(overrides: Partial<Meter>): Meter {
  return {
    id: 'm-1', buildingId: 'b-1', name: 'TRAFO-01', code: 'VE-101', meterType: 'electrical', isActive: true,
    metadata: { source: 'varelectric', id_remarcador: 101, protocolo: 'modbus' },
    externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null,
    phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null,
    loadCategory: null, parentMeterId: null, iotDeviceId: null, createdAt: '', updatedAt: '',
    ...overrides,
  };
}

function buildLatest(meterId: string, timestamp: string | null, powerKw = '8.4'): LatestReading {
  return {
    meter_id: meterId, meter_name: '', building_id: 'b-1', timestamp: timestamp as string, power_kw: powerKw,
    energy_kwh_total: '1', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null,
  };
}

function buildAggregate(meterId: string, overrides: Partial<AggregatedReading> = {}): AggregatedReading {
  return {
    bucket: '2026-09-01T00:00:00.000Z', meter_id: meterId, avg_power_kw: '5', max_power_kw: '9',
    min_power_kw: '1', avg_power_factor: '0.93', avg_voltage_l1: '224', energy_delta_kwh: '100', reading_count: '96',
    ...overrides,
  };
}

describe('classifyConnection', () => {
  it('is conectado up to 30 minutes, sin_senal up to 24 hours, caido after or never', () => {
    expect(classifyConnection(minutesAgo(15), NOW)).toBe('conectado');
    expect(classifyConnection(minutesAgo(30), NOW)).toBe('conectado');
    expect(classifyConnection(minutesAgo(31), NOW)).toBe('sin_senal');
    expect(classifyConnection(minutesAgo(24 * 60), NOW)).toBe('sin_senal');
    expect(classifyConnection(minutesAgo(24 * 60 + 1), NOW)).toBe('caido');
    expect(classifyConnection(null, NOW)).toBe('caido');
  });
});

describe('classifyCentro', () => {
  it('takes the worst remarcador state', () => {
    expect(classifyCentro(['conectado', 'conectado'])).toBe('operativo');
    expect(classifyCentro(['conectado', 'sin_senal'])).toBe('advertencia');
    expect(classifyCentro(['sin_senal', 'caido', 'conectado'])).toBe('alarma');
    expect(classifyCentro([])).toBe('operativo');
  });
});

describe('buildRemarcadores', () => {
  it('joins meters with their latest reading and building name', () => {
    const [remarcador, sinLectura] = buildRemarcadores(
      [buildMeter({}), buildMeter({ id: 'm-2', code: 'VE-102', metadata: {} })],
      [buildLatest('m-1', minutesAgo(10))],
      [buildBuilding({})],
      NOW,
    );

    expect(remarcador).toMatchObject({
      code: 'VE-101', centroName: 'Alto Penalolen', protocolo: 'modbus', fuente: 'varelectric',
      idRemarcador: '101', potenciaKw: 8.4, estado: 'conectado',
    });
    expect(sinLectura).toMatchObject({ ultimaLectura: null, potenciaKw: null, protocolo: null, estado: 'caido' });
  });
});

describe('buildCentros', () => {
  it('sums monthly energy per building and derives state and intensity', () => {
    const buildings = [buildBuilding({}), buildBuilding({ id: 'b-2', name: 'Quilicura', areaSqm: '1000' })];
    const remarcadores = buildRemarcadores(
      [buildMeter({}), buildMeter({ id: 'm-2' }), buildMeter({ id: 'm-3', buildingId: 'b-2' })],
      [buildLatest('m-1', minutesAgo(5)), buildLatest('m-2', minutesAgo(90)), buildLatest('m-3', minutesAgo(5))],
      buildings,
      NOW,
    );

    const [alto, quilicura] = buildCentros(buildings, remarcadores, [
      buildAggregate('m-1', { energy_delta_kwh: '120.5' }),
      buildAggregate('m-2', { energy_delta_kwh: null }),
      buildAggregate('m-3', { energy_delta_kwh: '250' }),
      buildAggregate('unknown-meter', { energy_delta_kwh: '999' }),
    ]);

    expect(alto).toMatchObject({ consumoMesKwh: 120.5, remarcadores: 2, estado: 'advertencia', superficie: null, intensidadKwhM2: null });
    expect(quilicura).toMatchObject({ consumoMesKwh: 250, remarcadores: 1, estado: 'operativo', superficie: 1000, intensidadKwhM2: 0.25 });
  });
});

describe('toLoadCurves', () => {
  it('sums per-meter average demand per bucket for each building and the portfolio', () => {
    const buildingByMeter = new Map([['m-1', 'b-1'], ['m-2', 'b-1'], ['m-3', 'b-2']]);
    const curves = toLoadCurves([
      buildAggregate('m-1', { bucket: '2026-09-30T02:00:00.000Z', avg_power_kw: '7' }),
      buildAggregate('m-2', { bucket: '2026-09-30T02:00:00.000Z', avg_power_kw: '3' }),
      buildAggregate('m-3', { bucket: '2026-09-30T01:00:00.000Z', avg_power_kw: '5' }),
      buildAggregate('m-1', { bucket: '2026-09-30T01:00:00.000Z', avg_power_kw: null }),
      buildAggregate('m-unknown', { bucket: '2026-09-30T01:00:00.000Z', avg_power_kw: '100' }),
    ], buildingByMeter);

    expect(curves.get('b-1')).toEqual([
      { timestamp: '2026-09-30T01:00:00.000Z', kw: 0 },
      { timestamp: '2026-09-30T02:00:00.000Z', kw: 10 },
    ]);
    expect(curves.get(PORTFOLIO_CURVE)).toEqual([
      { timestamp: '2026-09-30T01:00:00.000Z', kw: 5 },
      { timestamp: '2026-09-30T02:00:00.000Z', kw: 10 },
    ]);
  });
});
