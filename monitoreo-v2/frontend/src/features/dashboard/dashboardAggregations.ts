import type { AggregatedReading } from '../../types/reading';
import type { Building } from '../../types/building';
import type { Meter } from '../../types/meter';

export interface PortfolioBucketPoint {
  bucket: string;
  energyKwh: number;
  demandKw: number;
}

export interface BuildingEfficiencyRow {
  buildingId: string;
  buildingName: string;
  totalEnergyKwh: number;
  intensity: number;
  intensityUnit: 'kWh/m²' | 'kWh/medidor';
  meterCount: number;
}

/**
 * Último timestamp disponible en filas de lecturas (p. ej. `/readings/latest`).
 * @param readings - Filas con campo `timestamp`
 * @returns Fecha del dato más reciente, o null si no hay timestamps válidos
 */
export function maxReadingTimestamp(
  readings: Array<{ timestamp?: string | null }>,
): Date | null {
  let maxMs = 0;
  for (const row of readings) {
    if (!row.timestamp) continue;
    const ms = new Date(row.timestamp).getTime();
    if (ms > maxMs) maxMs = ms;
  }
  return maxMs > 0 ? new Date(maxMs) : null;
}

/**
 * Rango ISO [from, to] de N días terminando en `anchor`.
 * @param days - Días hacia atrás desde anchor
 * @param anchor - Fin del rango
 * @returns Fechas from/to en ISO 8601
 */
export function dateRangeFromDays(
  days: number,
  anchor: Date,
): { from: string; to: string } {
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - days);
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Rango relativo anclado al último dato disponible (histórico PASA) o `now` si no hay lecturas.
 * @param days - Ventana en días
 * @param readings - Lecturas recientes para inferir anchor
 * @param now - Fallback cuando no hay datos
 * @returns Fechas from/to en ISO 8601
 */
export function dateRangeFromLatestReadings(
  days: number,
  readings: Array<{ timestamp?: string | null }>,
  now: Date = new Date(),
): { from: string; to: string } {
  const anchor = maxReadingTimestamp(readings) ?? now;
  return dateRangeFromDays(days, anchor);
}

/**
 * Rango ISO [from, to] anclado a un timestamp máximo (p. ej. `/readings/latest-anchor`).
 * @param days - Ventana en días
 * @param anchorIso - Timestamp ISO del dato más reciente, o null para usar `now`
 * @param now - Fallback cuando anchor es null
 * @returns Fechas from/to en ISO 8601
 */
export function dateRangeFromAnchor(
  days: number,
  anchorIso: string | null | undefined,
  now: Date = new Date(),
): { from: string; to: string } {
  const anchor = anchorIso ? new Date(anchorIso) : now;
  return dateRangeFromDays(days, anchor);
}

/**
 * Construye el rango ISO [from, to] a partir de un preset relativo a "ahora".
 * @param preset - Ventana: 7, 30 o 90 días hacia atrás
 * @param now - Referencia temporal (inyectable para tests)
 * @returns Fechas from/to en ISO 8601
 */
export function dateRangeFromPreset(
  preset: '7d' | '30d' | '90d',
  now: Date = new Date(),
): { from: string; to: string } {
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  return dateRangeFromDays(days, now);
}

/**
 * Calcula el intervalo inmediatamente anterior con la misma duración que [from, to].
 * El `to` del periodo anterior termina un instante antes del `from` del periodo actual.
 * @param fromIso - Inicio del periodo actual (ISO 8601)
 * @param toIso - Fin del periodo actual (ISO 8601)
 * @returns Rango [from, to] del periodo previo
 */
export function previousPeriodRange(fromIso: string, toIso: string): { from: string; to: string } {
  const startMs = new Date(fromIso).getTime();
  const endMs = new Date(toIso).getTime();
  const durationMs = endMs - startMs;
  const prevEndMs = startMs - 1;
  const prevStartMs = prevEndMs - durationMs;
  return {
    from: new Date(prevStartMs).toISOString(),
    to: new Date(prevEndMs).toISOString(),
  };
}

/**
 * Agrega lecturas agregadas por bucket para el portfolio completo (todos los medidores).
 * @param rows - Filas `aggregated` por medidor y bucket
 * @returns Puntos ordenados por tiempo con energía sumada y demanda total (suma de promedios por medidor)
 */
export function aggregatePortfolioByBucket(rows: AggregatedReading[]): PortfolioBucketPoint[] {
  const map = new Map<string, { energyKwh: number; demandKw: number }>();
  for (const r of rows) {
    const key = r.bucket;
    const energy = Number(r.energy_delta_kwh ?? 0);
    const avg = Number(r.avg_power_kw ?? 0);
    const cur = map.get(key);
    if (cur) {
      cur.energyKwh += energy;
      cur.demandKw += avg;
    } else {
      map.set(key, { energyKwh: energy, demandKw: avg });
    }
  }
  return Array.from(map.entries())
    .map(([bucket, v]) => ({ bucket, energyKwh: v.energyKwh, demandKw: v.demandKw }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/**
 * Suma energía por edificio en el periodo usando el mapa medidor → edificio.
 * @param rows - Filas agregadas (incluye `meter_id`)
 * @param meterById - Mapa medidor → edificio
 * @returns Energía total por `buildingId`
 */
export function sumEnergyByBuilding(
  rows: AggregatedReading[],
  meterById: Map<string, string>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const bid = meterById.get(r.meter_id);
    if (!bid) continue;
    const e = Number(r.energy_delta_kwh ?? 0);
    out.set(bid, (out.get(bid) ?? 0) + e);
  }
  return out;
}

/**
 * Calcula intensidad energética y ordena edificios (menor intensidad = mejor posición relativa).
 * @param energyByBuilding - Energía total por edificio
 * @param buildings - Metadatos de edificio (nombre, área)
 * @param metersByBuilding - Cantidad de medidores por edificio
 * @returns Filas ordenadas por intensidad ascendente
 */
export function rankBuildingsByIntensity(
  energyByBuilding: Map<string, number>,
  buildings: Building[],
  metersByBuilding: Map<string, number>,
): BuildingEfficiencyRow[] {
  const rows: BuildingEfficiencyRow[] = [];
  for (const b of buildings) {
    const totalEnergyKwh = energyByBuilding.get(b.id) ?? 0;
    const meterCount = metersByBuilding.get(b.id) ?? 0;
    const area = b.areaSqm != null ? Number(b.areaSqm) : 0;
    if (area > 0) {
      rows.push({
        buildingId: b.id,
        buildingName: b.name,
        totalEnergyKwh,
        intensity: totalEnergyKwh / area,
        intensityUnit: 'kWh/m²',
        meterCount,
      });
    } else {
      const denom = meterCount > 0 ? meterCount : 1;
      rows.push({
        buildingId: b.id,
        buildingName: b.name,
        totalEnergyKwh,
        intensity: totalEnergyKwh / denom,
        intensityUnit: 'kWh/medidor',
        meterCount,
      });
    }
  }
  return rows.sort((a, b) => a.intensity - b.intensity);
}

/**
 * Series diarias kWh desde filas ya agregadas por edificio (`groupBy=building`).
 * @param rows - Filas con `meter_id` = buildingId
 * @param buildingIds - Edificios seleccionados
 * @returns Mapa buildingId → [timestamp, kWh]
 */
export function dailyEnergySeriesFromBuildingRows(
  rows: AggregatedReading[],
  buildingIds: string[],
): Map<string, [number, number][]> {
  const allowed = new Set(buildingIds);
  const series = new Map<string, [number, number][]>();
  for (const bid of buildingIds) {
    series.set(bid, []);
  }
  for (const r of rows) {
    const bid = r.meter_id;
    if (!allowed.has(bid)) continue;
    const pts = series.get(bid);
    if (!pts) continue;
    pts.push([new Date(r.bucket).getTime(), Number(r.energy_delta_kwh ?? 0)]);
  }
  for (const pts of series.values()) {
    pts.sort((a, b) => a[0] - b[0]);
  }
  return series;
}

/**
 * Métricas comparativas desde filas agregadas por edificio (`groupBy=building`).
 * @param rows - Filas con `meter_id` = buildingId
 * @param buildingIds - Edificios seleccionados
 * @returns Métricas por edificio
 */
export function compareMetricsFromBuildingRows(
  rows: AggregatedReading[],
  buildingIds: string[],
): Map<string, { energyKwh: number; peakDemandKw: number; avgPf: number; pfWeight: number }> {
  const allowed = new Set(buildingIds);
  const energySum = new Map<string, number>();
  const sumPfAcc = new Map<string, { sum: number; count: number }>();
  const powerByBuildingBucket = new Map<string, Map<string, number>>();

  for (const bid of buildingIds) {
    energySum.set(bid, 0);
    sumPfAcc.set(bid, { sum: 0, count: 0 });
    powerByBuildingBucket.set(bid, new Map());
  }

  for (const r of rows) {
    const bid = r.meter_id;
    if (!allowed.has(bid)) continue;
    energySum.set(bid, (energySum.get(bid) ?? 0) + Number(r.energy_delta_kwh ?? 0));
    const pf = Number(r.avg_power_factor ?? 0);
    if (pf > 0) {
      const acc = sumPfAcc.get(bid)!;
      acc.sum += pf;
      acc.count += 1;
    }
    const ap = Number(r.avg_power_kw ?? 0);
    powerByBuildingBucket.get(bid)!.set(r.bucket, ap);
  }

  const result = new Map<string, { energyKwh: number; peakDemandKw: number; avgPf: number; pfWeight: number }>();
  for (const bid of buildingIds) {
    const bm = powerByBuildingBucket.get(bid)!;
    let peakDemandKw = 0;
    for (const v of bm.values()) {
      if (v > peakDemandKw) peakDemandKw = v;
    }
    const pfA = sumPfAcc.get(bid)!;
    result.set(bid, {
      energyKwh: energySum.get(bid) ?? 0,
      peakDemandKw,
      avgPf: pfA.count > 0 ? pfA.sum / pfA.count : 0,
      pfWeight: pfA.count,
    });
  }
  return result;
}

/**
 * Agrupa energía diaria por edificio para series de gráfico comparativo.
 * @param rows - Filas agregadas diarias
 * @param meterById - Mapa medidor → edificio
 * @param buildingIds - Edificios a incluir
 * @returns Mapa buildingId → lista [timestamp, kWh] ordenada
 */
export function dailyEnergySeriesByBuilding(
  rows: AggregatedReading[],
  meterById: Map<string, string>,
  buildingIds: string[],
): Map<string, [number, number][]> {
  const allowed = new Set(buildingIds);
  const nested = new Map<string, Map<string, number>>();

  for (const bid of buildingIds) {
    nested.set(bid, new Map());
  }

  for (const r of rows) {
    const bid = meterById.get(r.meter_id);
    if (!bid || !allowed.has(bid)) continue;
    const bucket = r.bucket;
    const energy = Number(r.energy_delta_kwh ?? 0);
    const m = nested.get(bid);
    if (!m) continue;
    m.set(bucket, (m.get(bucket) ?? 0) + energy);
  }

  const series = new Map<string, [number, number][]>();
  for (const bid of buildingIds) {
    const m = nested.get(bid);
    if (!m) continue;
    const points: [number, number][] = [];
    for (const [bucket, sum] of m.entries()) {
      points.push([new Date(bucket).getTime(), sum]);
    }
    points.sort((a, b) => a[0] - b[0]);
    series.set(bid, points);
  }
  return series;
}

/**
 * Totales por edificio para tabla comparativa: energía, pico de demanda y FP medio.
 * @param rows - Filas agregadas (intervalo coherente con el periodo)
 * @param meterById - Mapa medidor → edificio
 * @param buildingIds - Edificios seleccionados
 * @returns Métricas agregadas por edificio
 */
export function compareMetricsByBuilding(
  rows: AggregatedReading[],
  meterById: Map<string, string>,
  buildingIds: string[],
): Map<string, { energyKwh: number; peakDemandKw: number; avgPf: number; pfWeight: number }> {
  const allowed = new Set(buildingIds);
  const energySum = new Map<string, number>();
  const sumPfAcc = new Map<string, { sum: number; count: number }>();
  const powerByBuildingBucket = new Map<string, Map<string, number>>();

  for (const bid of buildingIds) {
    energySum.set(bid, 0);
    sumPfAcc.set(bid, { sum: 0, count: 0 });
    powerByBuildingBucket.set(bid, new Map());
  }

  for (const r of rows) {
    const bid = meterById.get(r.meter_id);
    if (!bid || !allowed.has(bid)) continue;
    energySum.set(bid, (energySum.get(bid) ?? 0) + Number(r.energy_delta_kwh ?? 0));
    const pf = Number(r.avg_power_factor ?? 0);
    if (pf > 0) {
      const acc = sumPfAcc.get(bid)!;
      acc.sum += pf;
      acc.count += 1;
    }
    const bucket = r.bucket;
    const ap = Number(r.avg_power_kw ?? 0);
    const bm = powerByBuildingBucket.get(bid)!;
    bm.set(bucket, (bm.get(bucket) ?? 0) + ap);
  }

  const result = new Map<string, { energyKwh: number; peakDemandKw: number; avgPf: number; pfWeight: number }>();
  for (const bid of buildingIds) {
    const bm = powerByBuildingBucket.get(bid)!;
    let peakDemandKw = 0;
    for (const v of bm.values()) {
      if (v > peakDemandKw) peakDemandKw = v;
    }
    const pfA = sumPfAcc.get(bid)!;
    const avgPf = pfA.count > 0 ? pfA.sum / pfA.count : 0;
    result.set(bid, {
      energyKwh: energySum.get(bid) ?? 0,
      peakDemandKw,
      avgPf,
      pfWeight: pfA.count,
    });
  }
  return result;
}

/**
 * Construye `Map<medidorId, buildingId>` a partir del listado de medidores.
 * @param meters - Medidores del tenant
 * @returns Mapa para joins con filas agregadas
 */
export function meterToBuildingMap(meters: Meter[]): Map<string, string> {
  return new Map(meters.map((m) => [m.id, m.buildingId]));
}

/**
 * Cuenta medidores por edificio.
 * @param meters - Medidores del tenant
 * @returns Mapa buildingId → cantidad
 */
export function countMetersByBuilding(meters: Meter[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of meters) {
    map.set(m.buildingId, (map.get(m.buildingId) ?? 0) + 1);
  }
  return map;
}
