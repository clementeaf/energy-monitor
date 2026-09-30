import type { Building } from '../../types/building';
import type { Meter } from '../../types/meter';
import type { AggregatedReading, LatestReading } from '../../types/reading';

export type RemarcadorEstado = 'conectado' | 'sin_senal' | 'caido';
export type CentroEstado = 'operativo' | 'advertencia' | 'alarma';

const MINUTE_MS = 60_000;

export const CONNECTION_MAX_AGE_MINUTES: Record<Exclude<RemarcadorEstado, 'caido'>, number> = {
  conectado: 30,
  sin_senal: 24 * 60,
};

const CENTRO_ESTADO_BY_WORST_REMARCADOR: Record<RemarcadorEstado, CentroEstado> = {
  conectado: 'operativo',
  sin_senal: 'advertencia',
  caido: 'alarma',
};

const REMARCADOR_SEVERITY: RemarcadorEstado[] = ['conectado', 'sin_senal', 'caido'];

export interface Remarcador {
  id: string;
  code: string;
  name: string;
  centroId: string;
  centroName: string;
  protocolo: string | null;
  fuente: string | null;
  idRemarcador: string | null;
  ultimaLectura: string | null;
  potenciaKw: number | null;
  estado: RemarcadorEstado;
}

export interface Centro {
  id: string;
  name: string;
  code: string;
  address: string | null;
  superficie: number | null;
  consumoMesKwh: number;
  intensidadKwhM2: number | null;
  remarcadores: number;
  estado: CentroEstado;
}

export interface LoadPoint {
  timestamp: string;
  kw: number;
}

export function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyConnection(lastReadingAt: string | null, now: Date): RemarcadorEstado {
  if (!lastReadingAt) return 'caido';
  const ageMinutes = (now.getTime() - new Date(lastReadingAt).getTime()) / MINUTE_MS;
  if (ageMinutes <= CONNECTION_MAX_AGE_MINUTES.conectado) return 'conectado';
  if (ageMinutes <= CONNECTION_MAX_AGE_MINUTES.sin_senal) return 'sin_senal';
  return 'caido';
}

export function classifyCentro(estados: RemarcadorEstado[]): CentroEstado {
  const worst = estados.reduce<RemarcadorEstado>(
    (current, estado) =>
      REMARCADOR_SEVERITY.indexOf(estado) > REMARCADOR_SEVERITY.indexOf(current) ? estado : current,
    'conectado',
  );
  return CENTRO_ESTADO_BY_WORST_REMARCADOR[worst];
}

function metadataText(meter: Meter, key: string): string | null {
  const value = meter.metadata?.[key];
  return value === undefined || value === null ? null : String(value);
}

export function buildRemarcadores(
  meters: Meter[],
  latestReadings: LatestReading[],
  buildings: Building[],
  now: Date,
): Remarcador[] {
  const latestByMeter = new Map(latestReadings.map((reading) => [reading.meter_id, reading]));
  const buildingNames = new Map(buildings.map((building) => [building.id, building.name]));

  return meters.map((meter) => {
    const latest = latestByMeter.get(meter.id);
    const lastReadingAt = latest?.timestamp ?? null;
    return {
      id: meter.id,
      code: meter.code,
      name: meter.name,
      centroId: meter.buildingId,
      centroName: buildingNames.get(meter.buildingId) ?? '—',
      protocolo: metadataText(meter, 'protocolo'),
      fuente: metadataText(meter, 'source'),
      idRemarcador: metadataText(meter, 'id_remarcador'),
      ultimaLectura: lastReadingAt,
      potenciaKw: toNumber(latest?.power_kw),
      estado: classifyConnection(lastReadingAt, now),
    };
  });
}

export function buildCentros(
  buildings: Building[],
  remarcadores: Remarcador[],
  monthlyByMeter: AggregatedReading[],
): Centro[] {
  const buildingByMeter = new Map(remarcadores.map((remarcador) => [remarcador.id, remarcador.centroId]));
  const consumoByBuilding = new Map<string, number>();
  for (const row of monthlyByMeter) {
    const buildingId = buildingByMeter.get(row.meter_id);
    if (!buildingId) continue;
    consumoByBuilding.set(buildingId, (consumoByBuilding.get(buildingId) ?? 0) + (toNumber(row.energy_delta_kwh) ?? 0));
  }

  return buildings.map((building) => {
    const own = remarcadores.filter((remarcador) => remarcador.centroId === building.id);
    const superficie = toNumber(building.areaSqm);
    const consumoMesKwh = consumoByBuilding.get(building.id) ?? 0;
    return {
      id: building.id,
      name: building.name,
      code: building.code,
      address: building.address,
      superficie: superficie && superficie > 0 ? superficie : null,
      consumoMesKwh,
      intensidadKwhM2: superficie && superficie > 0 ? consumoMesKwh / superficie : null,
      remarcadores: own.length,
      estado: classifyCentro(own.map((remarcador) => remarcador.estado)),
    };
  });
}

export const PORTFOLIO_CURVE = '_portfolio';

export function toLoadCurves(
  meterRows: AggregatedReading[],
  buildingByMeter: Map<string, string>,
): Map<string, LoadPoint[]> {
  const kwByGroupAndTime = new Map<string, Map<number, number>>();
  const addDemand = (group: string, time: number, kw: number) => {
    const byTime = kwByGroupAndTime.get(group) ?? new Map<number, number>();
    byTime.set(time, (byTime.get(time) ?? 0) + kw);
    kwByGroupAndTime.set(group, byTime);
  };

  for (const row of meterRows) {
    const buildingId = buildingByMeter.get(row.meter_id);
    if (!buildingId) continue;
    const time = new Date(row.bucket).getTime();
    const kw = toNumber(row.avg_power_kw) ?? 0;
    addDemand(PORTFOLIO_CURVE, time, kw);
    addDemand(buildingId, time, kw);
  }

  return new Map(
    [...kwByGroupAndTime].map(([group, byTime]) => [
      group,
      [...byTime]
        .sort(([a], [b]) => a - b)
        .map(([time, kw]) => ({ timestamp: new Date(time).toISOString(), kw })),
    ]),
  );
}

export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
