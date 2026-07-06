import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';

/* ── Reconciliation row ── */

interface ReconciliationRow {
  buildingId: string;
  buildingName: string;
  mainKwh: number;
  subKwh: number;
  differenceKwh: number;
  differencePct: number;
  withinTolerance: boolean;
}

const TOLERANCE_PCT = 2;

function buildReconciliation(
  buildings: Array<{ id: string; name: string }>,
  meters: Meter[],
  readings: LatestReading[],
): ReconciliationRow[] {
  const readingMap = new Map(readings.map((r) => [r.meter_id, Number(r.energy_kwh_total || 0)]));
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  return buildings.map((b) => {
    const bMeters = metersByBuilding.get(b.id) ?? [];
    const mainMeters = bMeters.filter((m) => m.loadCategory === 'main' || m.meterType === 'main');
    const subMeters = bMeters.filter((m) => m.loadCategory !== 'main' && m.meterType !== 'main');

    const mainKwh = mainMeters.reduce((sum, m) => sum + (readingMap.get(m.id) ?? 0), 0);
    const subKwh = subMeters.reduce((sum, m) => sum + (readingMap.get(m.id) ?? 0), 0);
    const differenceKwh = mainKwh - subKwh;
    const differencePct = mainKwh > 0 ? (differenceKwh / mainKwh) * 100 : 0;

    return {
      buildingId: b.id,
      buildingName: b.name,
      mainKwh,
      subKwh,
      differenceKwh,
      differencePct,
      withinTolerance: Math.abs(differencePct) <= TOLERANCE_PCT,
    };
  });
}

const TOLERANCE_BADGE: Record<string, string> = {
  true: 'bg-emerald-100 text-emerald-700',
  false: 'bg-red-100 text-red-700',
};

/* ── Page ── */

export function CuadraturaPage() {
  const navigate = useNavigate();
  const [mallFilter, setMallFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  // 12-month aggregated for deviation chart
  const evoRange = useMemo(() => {
    const now = new Date();
    return { from: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(), to: now.toISOString() };
  }, []);
  const evoQuery = useAggregatedReadingsQuery({ ...evoRange, interval: 'monthly' });

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const evoAgg = evoQuery.data ?? [];

  const allRows = useMemo(
    () => buildReconciliation(buildings, meters, readings),
    [buildings, meters, readings],
  );
  const rows = mallFilter === 'all' ? allRows : allRows.filter((r) => r.buildingId === mallFilter);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader
        title="Cuadratura Agregación"
        eyebrow="Auditoría"
        actions={
          <div className="flex items-center gap-2">
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="month">Mes actual</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Año</option>
            </select>
            <select value={mallFilter} onChange={(e) => setMallFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="all">Todos los centros</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => {
                const now = new Date().toISOString();
                const csvBody = rows.map((r) => `${r.buildingName},${r.mainKwh.toFixed(1)},${r.subKwh.toFixed(1)},${r.differenceKwh.toFixed(1)},${r.differencePct.toFixed(2)},${r.withinTolerance ? 'Sí' : 'No'}`).join('\n');
                // ponytail: sync SHA-256 via SubtleCrypto not available in sync context; use simple hash
                const hashVal = Array.from(new TextEncoder().encode(csvBody)).reduce((h, b) => ((h << 5) - h + b) | 0, 0).toString(16).replace('-', '');
                const header = `# Exportado: ${now} | Hash: ${hashVal}\nCentro,Remarcador kWh,Suma sub kWh,Diferencia kWh,Dif %,Dentro tolerancia`;
                const csv = [header, ...rows.map((r) => `${r.buildingName},${r.mainKwh.toFixed(1)},${r.subKwh.toFixed(1)},${r.differenceKwh.toFixed(1)},${r.differencePct.toFixed(2)},${r.withinTolerance ? 'Sí' : 'No'}`)].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `cuadratura_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface"
            >
              Exportar CSV
            </button>
          </div>
        }
      />

      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Tabla de reconciliación</h3>
        <p className="mb-3 text-[11px] text-muted">Tolerancia: ±{TOLERANCE_PCT}%</p>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Centro</th>
              <th className="px-3 py-2 text-right">Remarcador [kWh]</th>
              <th className="px-3 py-2 text-right">Suma sub-med. [kWh]</th>
              <th className="px-3 py-2 text-right">Diferencia [kWh]</th>
              <th className="px-3 py-2 text-right">Dif. %</th>
              <th className="px-3 py-2 text-center">Tolerancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.buildingId} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-medium text-foreground">{row.buildingName}</td>
                <td className="px-3 py-2 text-right text-muted">{row.mainKwh.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-muted">{row.subKwh.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-foreground">{row.differenceKwh.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-foreground">{row.differencePct.toFixed(2)}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TOLERANCE_BADGE[String(row.withinTolerance)]}`}>
                    {row.withinTolerance ? 'Sí' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">Sin datos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Deviation bar chart — 12 months from real aggregated data */}
      {rows.length > 0 && (
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Análisis de desviaciones — 12 meses</h3>
          {(() => {
            // Build per-month main vs sub difference from aggregated data
            const meterTypeMap = new Map(meters.map((m) => [m.id, m.loadCategory ?? m.meterType]));
            const filteredMeterIds = mallFilter === 'all'
              ? new Set(meters.map((m) => m.id))
              : new Set(meters.filter((m) => m.buildingId === mallFilter).map((m) => m.id));

            const months: { label: string; diff: number }[] = [];
            const now = new Date();
            for (let m = 11; m >= 0; m--) {
              const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
              const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
              let mainKwh = 0;
              let subKwh = 0;
              for (const r of evoAgg) {
                const b = new Date(r.bucket);
                if (b.getFullYear() !== d.getFullYear() || b.getMonth() !== d.getMonth()) continue;
                if (!filteredMeterIds.has(r.meter_id)) continue;
                const energy = parseFloat(r.energy_delta_kwh ?? '0');
                const cat = meterTypeMap.get(r.meter_id);
                if (cat === 'main') mainKwh += energy;
                else subKwh += energy;
              }
              months.push({ label, diff: mainKwh - subKwh });
            }
            const maxDiff = Math.max(1, ...months.map((m) => Math.abs(m.diff)));
            const outOfTolerance = months.filter((m) => Math.abs(m.diff) > maxDiff * (TOLERANCE_PCT / 100));

            return (
              <>
                <div className="flex h-24 items-center gap-[2px]">
                  {months.map((m) => {
                    const h = (Math.abs(m.diff) / maxDiff) * 100;
                    const isNeg = m.diff < 0;
                    return (
                      <div key={m.label} className="flex flex-1 flex-col items-center gap-0.5" title={`${m.label}: ${m.diff.toFixed(1)} kWh`}>
                        <div className={`w-full rounded ${isNeg ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ height: `${Math.max(3, h)}%` }} />
                        <span className="text-[8px] text-subtle">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                {outOfTolerance.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-[11px] font-medium text-muted">Meses fuera de tolerancia</h4>
                    <ul className="mt-1 space-y-1 text-[12px]">
                      {outOfTolerance.map((m) => (
                        <li key={m.label} className="flex items-center justify-between">
                          <span className="text-foreground">{m.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${m.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.diff.toFixed(1)} kWh</span>
                            <button type="button" onClick={() => navigate('/auditor/datos-crudos')} className="text-[10px] text-brand hover:underline">Ver raw</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
