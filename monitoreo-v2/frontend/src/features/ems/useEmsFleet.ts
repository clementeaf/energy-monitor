import { useMemo } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery, useLatestReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import type { AggregationInterval } from '../../types/reading';
import {
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

const DAY_MS = 86_400_000;

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

export function useEmsFleet(): EmsFleet {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const monthRange = useMemo(() => {
    const now = new Date();
    return { from: startOfMonth(now).toISOString(), to: now.toISOString() };
  }, []);
  const monthlyQuery = useAggregatedReadingsQuery({ ...monthRange, interval: 'monthly' });

  const queries = [buildingsQuery, metersQuery, latestQuery, monthlyQuery];
  const failed = queries.find((query) => query.isError);

  const { centros, remarcadores } = useMemo(() => {
    const buildings = buildingsQuery.data ?? [];
    const fleet = buildRemarcadores(metersQuery.data ?? [], latestQuery.data ?? [], buildings, new Date());
    return { remarcadores: fleet, centros: buildCentros(buildings, fleet, monthlyQuery.data ?? []) };
  }, [buildingsQuery.data, metersQuery.data, latestQuery.data, monthlyQuery.data]);

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
    const now = new Date();
    const { days, interval } = LOAD_RANGES[range];
    const from = days === 0 ? startOfDay(now) : new Date(now.getTime() - days * DAY_MS);
    return { from: from.toISOString(), to: now.toISOString(), interval };
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
