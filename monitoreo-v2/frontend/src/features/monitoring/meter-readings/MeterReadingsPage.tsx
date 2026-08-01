import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import { useMeterQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { MONTH_NAMES_FULL } from '../../../lib/formatters';
import { ReadingQualityBadge } from '../../../components/ui/ReadingQualityBadge';
import { ReadingsChart } from './ReadingsChart';
import { DaySummaryTable } from './DaySummaryTable';

type MeterTab = 'grafico' | 'tabla';

export function MeterReadingsPage() {
  const { meterId, month } = useParams<{ meterId: string; month: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MeterTab>('grafico');

  const { from, to, monthLabel } = useMemo(() => {
    const [y, m] = (month ?? '2026-01').split('-').map(Number);
    const fromDate = new Date(y, m - 1, 1);
    const toDate = new Date(y, m, 0);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      monthLabel: `${MONTH_NAMES_FULL[m - 1]} ${y}`,
    };
  }, [month]);

  const meterQuery = useMeterQuery(meterId!);
  const buildingsQuery = useBuildingsQuery();
  const readingsQuery = useReadingsQuery({ meterId: meterId!, from, to }, !!meterId);
  const alertsQuery = useAlertsQuery({ meterId: meterId! });

  const meter = meterQuery.data;
  const building = buildingsQuery.data?.find((b) => b.id === meter?.buildingId);
  const readings = readingsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const alertTimestamps = alerts.map((a) => a.createdAt);
  const isLoading = readingsQuery.isPending;
  const readingsQs = useQueryState(readingsQuery, { isEmpty: (d) => !d || d.length === 0 });
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 animate-pulse rounded bg-raised" />
        <div className="h-[340px] animate-pulse rounded-lg bg-raised" />
        <div className="h-48 animate-pulse rounded-lg bg-raised" />
      </div>
    );
  }

  if (readingsQs.phase === 'error') {
    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
          <button type="button" onClick={() => navigate(`/monitoring/meter/${meterId}`)}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface">
            &larr; Volver
          </button>
        </div>
        <DataWidget phase="error" error={readingsQs.error} onRetry={() => { void readingsQuery.refetch(); }}
          emptyTitle="Sin lecturas" emptyDescription="No hay lecturas para este periodo.">
          {null}
        </DataWidget>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <button type="button" onClick={() => navigate(`/monitoring/meter/${meterId}`)}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface">
          &larr; Volver
        </button>
        <Link to="/buildings" className="text-sm text-muted hover:text-foreground">Edificios</Link>
        <Sep />
        {building && (
          <>
            <Link to={`/meters?buildingId=${building.id}`} className="text-sm text-muted hover:text-foreground">
              {building.name}
            </Link>
            <Sep />
          </>
        )}
        <Link to={`/monitoring/meter/${meterId}`} className="text-sm text-muted hover:text-foreground">
          {meter?.name ?? '—'} ({meter?.code ?? meterId})
        </Link>
        <Sep />
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <span className="text-xs text-muted">({readings.length} lecturas)</span>
        {building?.timezone && (
          <span className="text-xs text-subtle" title="Zona horaria del edificio">TZ: {building.timezone}</span>
        )}
        {latestReading && (
          <ReadingQualityBadge quality={latestReading.quality} source={latestReading.source} />
        )}
        {latestReading?.timestamp_local && (
          <span className="text-xs text-subtle">
            Ultima: {latestReading.timestamp_local}
            {latestReading.timezone ? ` (${latestReading.timezone})` : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      {readings.length > 0 && (
        <div className="flex shrink-0 gap-1 border-b border-border">
          <button type="button" onClick={() => setActiveTab('grafico')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'grafico' ? 'border-b-2 border-foreground text-foreground' : 'text-muted hover:text-foreground'}`}>
            Gráfico
          </button>
          <button type="button" onClick={() => setActiveTab('tabla')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'tabla' ? 'border-b-2 border-foreground text-foreground' : 'text-muted hover:text-foreground'}`}>
            Resumen diario
          </button>
        </div>
      )}

      {/* Tab content */}
      {readings.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'grafico' && <ReadingsChart readings={readings} alerts={alerts} />}
          {activeTab === 'tabla' && <DaySummaryTable readings={readings} alertTimestamps={alertTimestamps} meterId={meterId!} />}
        </div>
      )}
    </div>
  );
}

function Sep() {
  return <span className="text-xs text-subtle">/</span>;
}
