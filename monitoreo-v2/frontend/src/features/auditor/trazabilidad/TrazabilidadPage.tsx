import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import type { LatestReading } from '../../../types/reading';

/* ── Reading quality types ── */

type ReadingType = 'real' | 'estimado' | 'cnr' | 'backfill';

const TYPE_BADGE: Record<ReadingType, string> = {
  real: 'bg-emerald-100 text-emerald-700',
  estimado: 'bg-blue-100 text-blue-700',
  cnr: 'bg-amber-100 text-amber-700',
  backfill: 'bg-purple-100 text-purple-700',
};

/* ── Page ── */

export function TrazabilidadPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState('');

  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const buildingsQuery = useBuildingsQuery();

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const readingMap = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);

  // When selectedTimestamp is set, find the reading closest to that timestamp for the selected meter
  const selectedReading = useMemo(() => {
    const meterReadings = readings.filter((r) => r.meter_id === selectedMeterId);
    if (meterReadings.length === 0) return undefined;
    if (!selectedTimestamp) return readingMap.get(selectedMeterId);
    const targetMs = new Date(selectedTimestamp).getTime();
    let closest = meterReadings[0];
    let closestDiff = Math.abs(new Date(closest.timestamp).getTime() - targetMs);
    for (const r of meterReadings) {
      const diff = Math.abs(new Date(r.timestamp).getTime() - targetMs);
      if (diff < closestDiff) { closest = r; closestDiff = diff; }
    }
    return closest;
  }, [readings, selectedMeterId, selectedTimestamp, readingMap]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Trazabilidad / Lineage" eyebrow="Auditoría" />

      <div className="flex gap-4">
        {/* Selector */}
        <div className="panel w-64 shrink-0 space-y-3 p-3">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted">Medidor</label>
            <select
              value={selectedMeterId}
              onChange={(e) => setSelectedMeterId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
            >
              <option value="">Seleccionar medidor</option>
              {meters.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted">Fecha/hora lectura</label>
            <input
              type="datetime-local"
              value={selectedTimestamp}
              onChange={(e) => setSelectedTimestamp(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
            />
            <p className="mt-1 text-[9px] text-muted">Deje vacío para última lectura.</p>
          </div>
        </div>

        {/* Lineage panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {selectedReading ? (
            <LineagePanel reading={selectedReading} buildingName={buildingMap.get(selectedReading.building_id) ?? 'Desconocido'} />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-[13px] text-muted">Selecciona un medidor para ver el linaje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lineage Panel ── */

function LineagePanel({ reading, buildingName }: Readonly<{ reading: LatestReading; buildingName: string }>) {
  // ponytail: derive type from data freshness — stale > 4h = estimated, no data = CNR
  const ageMs = Date.now() - new Date(reading.timestamp).getTime();
  const readingType: ReadingType = ageMs > 24 * 3_600_000 ? 'cnr' : ageMs > 4 * 3_600_000 ? 'estimado' : 'real';

  const lineageSteps = [
    { label: 'Valor en plataforma', value: `${Number(reading.power_kw).toFixed(1)} kW`, detail: `Tipo: ${readingType}` },
    { label: 'Timestamp lectura', value: new Date(reading.timestamp).toLocaleString('es-CL'), detail: `Medidor: ${reading.meter_name}` },
    { label: 'Energía acumulada', value: `${Number(reading.energy_kwh_total).toFixed(1)} kWh`, detail: 'Total acumulado' },
  ];

  // Type-specific detail — derived from actual reading data
  const readingDate = new Date(reading.timestamp);
  const ageHours = Math.round(ageMs / 3_600_000);
  const typeDetail: Record<ReadingType, { label: string; info: string }[]> = {
    real: [
      { label: 'Gateway receptor', info: `${buildingName} — TCP/IP directo` },
      { label: 'Hora ingesta', info: readingDate.toLocaleString('es-CL') },
      { label: 'Transformaciones', info: 'Factor conversión: 1.0 (sin transformación)' },
    ],
    estimado: [
      { label: 'Método estimación', info: 'Interpolación lineal' },
      { label: 'Período ausencia', info: `${ageHours}h sin datos reales (desde ${readingDate.toLocaleString('es-CL')})` },
      { label: 'Confianza', info: ageHours < 12 ? 'Alta — brecha corta' : ageHours < 48 ? 'Media — basado en datos adyacentes' : 'Baja — brecha prolongada' },
    ],
    cnr: [
      { label: 'Edificio afectado', info: buildingName },
      { label: 'Última lectura válida', info: readingDate.toLocaleString('es-CL') },
      { label: 'Justificación', info: `${ageHours}h sin comunicación — pendiente revisión operacional` },
    ],
    backfill: [
      { label: 'Proceso generador', info: 'Backfill automático' },
      { label: 'Período recuperado', info: `Desde ${readingDate.toLocaleString('es-CL')}` },
      { label: 'Calidad asignada', info: 'Estimada — backfill' },
    ],
  };

  const rawVsShown = [
    { field: 'Potencia', raw: `${Number(reading.power_kw).toFixed(3)} kW`, shown: `${Number(reading.power_kw).toFixed(1)} kW`, transform: 'Redondeo 1 decimal' },
    { field: 'Voltaje L1', raw: reading.voltage_l1 ?? '—', shown: reading.voltage_l1 ? `${Number(reading.voltage_l1).toFixed(1)} V` : '—', transform: 'Redondeo + unidad' },
    { field: 'Corriente L1', raw: reading.current_l1 ?? '—', shown: reading.current_l1 ? `${Number(reading.current_l1).toFixed(1)} A` : '—', transform: 'Redondeo + unidad' },
    { field: 'Factor potencia', raw: reading.power_factor ?? '—', shown: reading.power_factor ? Number(reading.power_factor).toFixed(3) : '—', transform: 'Sin transformación' },
  ];

  return (
    <>
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-foreground">Linaje de lectura</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[readingType]}`}>
            {readingType}
          </span>
        </div>
        <dl className="space-y-3">
          {lineageSteps.map((step) => (
            <div key={step.label} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">{step.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-foreground">{step.value}</dd>
              <dd className="text-[11px] text-muted">{step.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Type-specific detail */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">
          Detalle — {readingType}
        </h3>
        <dl className="space-y-1.5">
          {typeDetail[readingType].map((d) => (
            <div key={d.label} className="flex justify-between text-[12px]">
              <dt className="text-muted">{d.label}</dt>
              <dd className="text-foreground">{d.info}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Comparación raw vs. mostrado</h3>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
              <th className="pb-2">Campo</th>
              <th className="pb-2">Valor raw</th>
              <th className="pb-2">Valor mostrado</th>
              <th className="pb-2">Transformación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rawVsShown.map((row) => (
              <tr key={row.field}>
                <td className="py-1.5 text-muted">{row.field}</td>
                <td className="py-1.5 font-mono text-foreground">{row.raw}</td>
                <td className="py-1.5 text-foreground">{row.shown}</td>
                <td className="py-1.5 text-[11px] text-muted">{row.transform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
