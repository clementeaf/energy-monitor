import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery, useLatestReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { readingsEndpoints } from '../../services/endpoints';
import { useAppStore, type CentroSimulado } from '../../store/useAppStore';
import type { Building } from '../../types/building';
import type { AggregatedReading, AggregationInterval } from '../../types/reading';
import { buildAlertas, type Alerta } from './alerts';
import {
  applyRemarcadorOverrides,
  buildCentros,
  buildRemarcadores,
  findLatestReadingAt,
  senalPorRemarcador,
  startOfDay,
  startOfMonth,
  toLoadCurves,
  toNumber,
  type Centro,
  type LoadPoint,
  type Remarcador,
} from './fleet';
import { desplazarMeses, filasDelPeriodo, type Rango } from './periodos';

const DIA_MS = 24 * 60 * 60 * 1000;

export type LoadRange = 'hoy' | '7dias' | '30dias';
export type EmsPhase = 'loading' | 'error' | 'ready';

const LOAD_RANGES: Record<LoadRange, { days: number; interval: AggregationInterval }> = {
  hoy: { days: 0, interval: 'hourly' },
  '7dias': { days: 7, interval: 'daily' },
  '30dias': { days: 30, interval: 'daily' },
};

export interface EmsFleet {
  phase: EmsPhase;
  error: unknown;
  refetch: () => void;
  buildings: Building[];
  centros: Centro[];
  remarcadores: Remarcador[];
  consumoPorRemarcador: Record<string, number>;
  periodo: Date;
}

function toCentroSinRemarcadores(centro: CentroSimulado): Centro {
  return {
    id: centro.id, name: centro.name, code: 'Pendiente de instalación', address: centro.address,
    superficie: null, consumoMesKwh: 0, intensidadKwhM2: null, remarcadores: 0, estado: 'operativo',
    tarifa: null, margen: null,
  };
}

export function useEmsFleet(): EmsFleet {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const periodo = useMemo(
    () => startOfMonth(findLatestReadingAt(latestQuery.data ?? []) ?? new Date()),
    [latestQuery.data],
  );
  const monthRange = useMemo(() => {
    const nextMonthStart = new Date(periodo.getFullYear(), periodo.getMonth() + 1, 1);
    return { from: periodo.toISOString(), to: nextMonthStart.toISOString() };
  }, [periodo]);
  const monthlyQuery = useAggregatedReadingsQuery({ ...monthRange, interval: 'monthly' }, latestQuery.isSuccess);
  const ultimas24h = useMemo(() => {
    const ahora = new Date();
    return { from: new Date(ahora.getTime() - DIA_MS).toISOString(), to: ahora.toISOString(), interval: 'daily' as const };
  }, []);
  const senalQuery = useAggregatedReadingsQuery(ultimas24h);

  const queries = [buildingsQuery, metersQuery, latestQuery, monthlyQuery];
  const failed = queries.find((query) => query.isError);

  const remarcadorOverrides = useAppStore((s) => s.remarcadorOverrides);
  const centrosSimulados = useAppStore((s) => s.centrosSimulados);

  const { centros, remarcadores } = useMemo(() => {
    const buildings = buildingsQuery.data ?? [];
    const senales = senalPorRemarcador(senalQuery.data ?? []);
    const realFleet = buildRemarcadores(metersQuery.data ?? [], latestQuery.data ?? [], buildings, new Date())
      .map((remarcador) => ({ ...remarcador, senalPct: senalQuery.data ? senales.get(remarcador.id) ?? 0 : null }));
    const fleet = applyRemarcadorOverrides(realFleet, remarcadorOverrides);
    return { remarcadores: fleet, centros: [...buildCentros(buildings, fleet, monthlyQuery.data ?? []), ...centrosSimulados.map(toCentroSinRemarcadores)] };
  }, [buildingsQuery.data, metersQuery.data, latestQuery.data, monthlyQuery.data, senalQuery.data, remarcadorOverrides, centrosSimulados]);

  const consumoPorRemarcador = useMemo(
    () => Object.fromEntries((monthlyQuery.data ?? []).map((row) => [row.meter_id, toNumber(row.energy_delta_kwh) ?? 0])),
    [monthlyQuery.data],
  );

  const phase: EmsPhase = failed ? 'error' : queries.some((query) => query.isPending) ? 'loading' : 'ready';

  return {
    phase,
    error: failed?.error ?? null,
    refetch: () => queries.forEach((query) => void query.refetch()),
    buildings: buildingsQuery.data ?? [],
    centros,
    remarcadores,
    consumoPorRemarcador,
    periodo,
  };
}

export function useLoadCurves(range: LoadRange, mesesAtras = 0): { phase: EmsPhase; curves: Map<string, LoadPoint[]>; rango: Rango } {
  const metersQuery = useMetersQuery();
  const params = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const { days, interval } = LOAD_RANGES[range];
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const to = mesesAtras > 0 ? desplazarMeses(now, -mesesAtras) : tomorrow;
    return { from: desplazarMeses(from, -mesesAtras).toISOString(), to: to.toISOString(), interval };
  }, [range, mesesAtras]);
  const readingsQuery = useAggregatedReadingsQuery(params);

  const curves = useMemo(() => {
    const buildingByMeter = new Map((metersQuery.data ?? []).map((meter) => [meter.id, meter.buildingId]));
    return toLoadCurves(readingsQuery.data ?? [], buildingByMeter);
  }, [metersQuery.data, readingsQuery.data]);

  const isError = metersQuery.isError || readingsQuery.isError;
  const isPending = metersQuery.isPending || readingsQuery.isPending;
  const rango = useMemo(() => ({ desde: new Date(params.from), hasta: new Date(params.to) }), [params]);
  return { phase: isError ? 'error' : isPending ? 'loading' : 'ready', curves, rango };
}

export function useCentrosEnRango(
  rango: Rango | null,
  fleet: Pick<EmsFleet, 'buildings' | 'remarcadores'>,
  buildingIds?: string[],
): { phase: EmsPhase; filas: AggregatedReading[]; centros: Centro[]; centrosDe: (periodo: Rango) => Centro[] } {
  const scopes = buildingIds ?? [undefined];
  const results = useQueries({
    queries: scopes.map((buildingId) => {
      const params = { from: rango?.desde.toISOString() ?? '', to: rango?.hasta.toISOString() ?? '', interval: 'monthly' as const, buildingId };
      return {
        queryKey: ['readings', 'aggregated', params],
        queryFn: async (): Promise<AggregatedReading[]> => (await readingsEndpoints.aggregated(params)).data,
        enabled: rango !== null,
        staleTime: 5 * 60 * 1000,
      };
    }),
  });
  const filas = results.flatMap((result) => result.data ?? []);
  const centros = buildCentros(fleet.buildings, fleet.remarcadores, filas);
  const phase: EmsPhase = results.some((result) => result.isError) ? 'error' : results.some((result) => result.isPending) ? 'loading' : 'ready';
  const centrosDe = (periodo: Rango) => buildCentros(fleet.buildings, fleet.remarcadores, filasDelPeriodo(filas, periodo));
  return { phase, filas, centros, centrosDe };
}

export interface EmsAlerta extends Alerta {
  isResuelta: boolean;
}

interface EmsAlertas {
  phase: EmsPhase;
  error: unknown;
  alertas: EmsAlerta[];
  activas: EmsAlerta[];
  criticas: number;
}

export function useEmsAlertas(): EmsAlertas {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertasResueltas = useAppStore((s) => s.alertasResueltas);
  const remarcadorOverrides = useAppStore((s) => s.remarcadorOverrides);

  const alertas = useMemo(() => {
    const realFleet = buildRemarcadores(metersQuery.data ?? [], latestQuery.data ?? [], buildingsQuery.data ?? [], new Date());
    const fleet = applyRemarcadorOverrides(realFleet, remarcadorOverrides);
    const resueltas = new Set(alertasResueltas);
    return buildAlertas(fleet).map((alerta) => ({ ...alerta, isResuelta: resueltas.has(alerta.id) }));
  }, [buildingsQuery.data, metersQuery.data, latestQuery.data, alertasResueltas, remarcadorOverrides]);

  const queries = [buildingsQuery, metersQuery, latestQuery];
  const failed = queries.find((query) => query.isError);
  const phase: EmsPhase = failed ? 'error' : queries.some((query) => query.isPending) ? 'loading' : 'ready';
  const activas = alertas.filter((alerta) => !alerta.isResuelta);
  return { phase, error: failed?.error ?? null, alertas, activas, criticas: activas.filter((alerta) => alerta.severidad === 'critica').length };
}
