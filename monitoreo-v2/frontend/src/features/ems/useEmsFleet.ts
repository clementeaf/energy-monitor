import { useMemo } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery, useLatestReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useAppStore, type CentroSimulado } from '../../store/useAppStore';
import type { AggregationInterval } from '../../types/reading';
import { buildAlertas, type Alerta } from './alerts';
import {
  applyRemarcadorOverrides,
  buildCentros,
  buildRemarcadores,
  startOfDay,
  startOfMonth,
  toLoadCurves,
  type Centro,
  type LoadPoint,
  type Remarcador,
} from './fleet';

export type LoadRange = 'hoy' | '7dias' | '30dias';
export type EmsPhase = 'loading' | 'error' | 'ready';


const LOAD_RANGES: Record<LoadRange, { days: number; interval: AggregationInterval }> = {
  hoy: { days: 0, interval: 'hourly' },
  '7dias': { days: 7, interval: 'hourly' },
  '30dias': { days: 30, interval: 'daily' },
};

export interface EmsFleet {
  phase: EmsPhase;
  error: unknown;
  refetch: () => void;
  centros: Centro[];
  remarcadores: Remarcador[];
}

function toCentroSinRemarcadores(centro: CentroSimulado): Centro {
  return {
    id: centro.id, name: centro.name, code: 'Pendiente de instalación', address: centro.address,
    superficie: null, consumoMesKwh: 0, intensidadKwhM2: null, remarcadores: 0, estado: 'operativo',
  };
}

export function useEmsFleet(): EmsFleet {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const monthRange = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    return { from: monthStart.toISOString(), to: nextMonthStart.toISOString() };
  }, []);
  const monthlyQuery = useAggregatedReadingsQuery({ ...monthRange, interval: 'monthly' });

  const queries = [buildingsQuery, metersQuery, latestQuery, monthlyQuery];
  const failed = queries.find((query) => query.isError);

  const remarcadorOverrides = useAppStore((s) => s.remarcadorOverrides);
  const centrosSimulados = useAppStore((s) => s.centrosSimulados);

  const { centros, remarcadores } = useMemo(() => {
    const buildings = buildingsQuery.data ?? [];
    const realFleet = buildRemarcadores(metersQuery.data ?? [], latestQuery.data ?? [], buildings, new Date());
    const fleet = applyRemarcadorOverrides(realFleet, remarcadorOverrides);
    return { remarcadores: fleet, centros: [...buildCentros(buildings, fleet, monthlyQuery.data ?? []), ...centrosSimulados.map(toCentroSinRemarcadores)] };
  }, [buildingsQuery.data, metersQuery.data, latestQuery.data, monthlyQuery.data, remarcadorOverrides, centrosSimulados]);

  const phase: EmsPhase = failed ? 'error' : queries.some((query) => query.isPending) ? 'loading' : 'ready';

  return {
    phase,
    error: failed?.error ?? null,
    refetch: () => queries.forEach((query) => void query.refetch()),
    centros,
    remarcadores,
  };
}

export function useLoadCurves(range: LoadRange): { phase: EmsPhase; curves: Map<string, LoadPoint[]> } {
  const metersQuery = useMetersQuery();
  const params = useMemo(() => {
    const today = startOfDay(new Date());
    const { days, interval } = LOAD_RANGES[range];
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return { from: from.toISOString(), to: tomorrow.toISOString(), interval };
  }, [range]);
  const readingsQuery = useAggregatedReadingsQuery(params);

  const curves = useMemo(() => {
    const buildingByMeter = new Map((metersQuery.data ?? []).map((meter) => [meter.id, meter.buildingId]));
    return toLoadCurves(readingsQuery.data ?? [], buildingByMeter);
  }, [metersQuery.data, readingsQuery.data]);

  const isError = metersQuery.isError || readingsQuery.isError;
  const isPending = metersQuery.isPending || readingsQuery.isPending;
  return { phase: isError ? 'error' : isPending ? 'loading' : 'ready', curves };
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
