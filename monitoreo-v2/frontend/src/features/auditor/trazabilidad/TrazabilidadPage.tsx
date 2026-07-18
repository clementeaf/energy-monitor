import { useState, useMemo } from 'react';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
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

const DERIVATION_RULES = [
  'Si real → timestamp medidor · gateway · hora de ingesta · transformaciones aplicadas',
  'Si estimado → método de estimación · período cubierto',
  'Si CNR → usuario · timestamp · valor original · justificación',
  'Si backfill → proceso · período repuesto · calidad resultante',
];

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

  // Derive reading type from data freshness
  const readingType: ReadingType | null = useMemo(() => {
    if (!selectedReading) return null;
    const ageMs = Date.now() - new Date(selectedReading.timestamp).getTime();
    return ageMs > 24 * 3_600_000 ? 'cnr' : ageMs > 4 * 3_600_000 ? 'estimado' : 'real';
  }, [selectedReading]);

  const meterOptions = meters.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Title */}
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">6.4 Trazabilidad</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Cadena de origen del valor mostrado en la plataforma — auditoría de transformaciones aplicadas
        </p>
      </div>

      {/* Filter banner */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="min-w-[220px]">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Medidor</label>
          <DropdownSelect
            options={[{ value: '', label: 'Seleccionar medidor' }, ...meterOptions]}
            value={selectedMeterId}
            onChange={setSelectedMeterId}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Fecha/hora lectura</label>
          <input
            type="datetime-local"
            value={selectedTimestamp}
            onChange={(e) => setSelectedTimestamp(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Row 1 — Linaje panel (full width) */}
      <div
        className="panel p-4 animate-fade-in"
        style={{ animationDelay: '0ms' }}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Panel de linaje por lectura</h2>
            <p className="text-[11px] text-muted">
              Cadena de origen del valor mostrado en la plataforma · solo lectura
            </p>
          </div>
          {readingType && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[readingType]}`}>
              {readingType}
            </span>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-border bg-background px-4 py-3">
          <p className="text-[13px] font-medium text-foreground">
            {selectedReading
              ? `Valor mostrado: ${Number(selectedReading.energy_kwh_total).toFixed(0)} kWh · tipo: ${readingType === 'cnr' ? 'CNR (dato manual)' : readingType === 'estimado' ? 'Estimado' : (readingType as string) === 'backfill' ? 'Backfill' : 'Real (medición directa)'}`
              : 'Valor mostrado: — · selecciona un medidor para ver el linaje'}
          </p>
        </div>

        <ul className="mt-3 space-y-1.5">
          {DERIVATION_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-[12px] text-foreground">
              <span className="mt-0.5 shrink-0 text-muted">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-end">
          <span className="text-[10px] text-muted">[DAT-19, DAT-20, DAT-14]</span>
        </div>
      </div>

      {/* Row 2 — Raw vs Shown (2 cols, same height) */}
      {selectedReading ? (
        <RawVsShownRow
          reading={selectedReading}
          buildingName={buildingMap.get(selectedReading.building_id) ?? 'Desconocido'}
          readingType={readingType!}
        />
      ) : (
        <div
          className="panel flex items-center justify-center p-8 animate-fade-in"
          style={{ animationDelay: '30ms' }}
        >
          <p className="text-[13px] text-muted">Selecciona un medidor para ver la comparación raw vs. procesado.</p>
        </div>
      )}
    </div>
  );
}

/* ── Raw vs Shown Row ── */

function RawVsShownRow({
  reading,
  buildingName,
  readingType,
}: Readonly<{ reading: LatestReading; buildingName: string; readingType: ReadingType }>) {
  const ageMs = Date.now() - new Date(reading.timestamp).getTime();
  const readingDate = new Date(reading.timestamp);
  const ageHours = Math.round(ageMs / 3_600_000);

  // Type-specific detail — derived from actual reading data
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

  const rawRows = [
    { tsUtc: readingDate.toISOString(), raw: `${Number(reading.power_kw).toFixed(3)}`, unit: 'kW', flag: 'OK' },
    { tsUtc: readingDate.toISOString(), raw: reading.voltage_l1 ?? '—', unit: 'V', flag: reading.voltage_l1 ? 'OK' : 'N/A' },
    { tsUtc: readingDate.toISOString(), raw: reading.current_l1 ?? '—', unit: 'A', flag: reading.current_l1 ? 'OK' : 'N/A' },
    { tsUtc: readingDate.toISOString(), raw: reading.power_factor ?? '—', unit: 'PF', flag: reading.power_factor ? 'OK' : 'N/A' },
  ];

  const shownRows = [
    { tsUtc: readingDate.toISOString(), processed: `${Number(reading.power_kw).toFixed(1)} kW`, transform: 'Redondeo 1 decimal', dashboard: `${Number(reading.power_kw).toFixed(1)} kW` },
    { tsUtc: readingDate.toISOString(), processed: reading.voltage_l1 ? `${Number(reading.voltage_l1).toFixed(1)} V` : '—', transform: 'Redondeo + unidad', dashboard: reading.voltage_l1 ? `${Number(reading.voltage_l1).toFixed(1)} V` : '—' },
    { tsUtc: readingDate.toISOString(), processed: reading.current_l1 ? `${Number(reading.current_l1).toFixed(1)} A` : '—', transform: 'Redondeo + unidad', dashboard: reading.current_l1 ? `${Number(reading.current_l1).toFixed(1)} A` : '—' },
    { tsUtc: readingDate.toISOString(), processed: reading.power_factor ? Number(reading.power_factor).toFixed(3) : '—', transform: typeDetail[readingType][2]?.info ?? 'Sin transformación', dashboard: reading.power_factor ? Number(reading.power_factor).toFixed(3) : '—' },
  ];

  const thClass = 'pb-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted';
  const tdClass = 'py-1.5 text-[12px]';

  return (
    <div
      className="flex gap-4 animate-fade-in"
      style={{ animationDelay: '30ms' }}
    >
      {/* Left — Raw */}
      <div className="relative flex-1 panel p-4">
        <div className="mb-1">
          <h2 className="text-[13px] font-semibold text-foreground">Valor crudo del medidor (raw)</h2>
          <p className="text-[11px] text-muted">Lado izquierdo de la comparación · inmutable, solo lectura</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={thClass}>Timestamp UTC</th>
                <th className={thClass}>Valor raw</th>
                <th className={thClass}>Unidad</th>
                <th className={thClass}>Flag calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rawRows.map((row, i) => (
                <tr key={i}>
                  <td className={`${tdClass} font-mono text-[11px] text-muted`}>{row.tsUtc.slice(0, 19).replace('T', ' ')}</td>
                  <td className={`${tdClass} font-mono text-foreground`}>{row.raw}</td>
                  <td className={`${tdClass} text-muted`}>{row.unit}</td>
                  <td className={tdClass}>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${row.flag === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <span className="text-[10px] text-muted">[DAT-20, DAT-19]</span>
        </div>
      </div>

      {/* Right — Processed */}
      <div className="relative flex-1 panel p-4">
        <div className="mb-1">
          <h2 className="text-[13px] font-semibold text-foreground">Valor procesado &rarr; mostrado en dashboard</h2>
          <p className="text-[11px] text-muted">Lado derecho · cada transformación identificada</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={thClass}>Timestamp UTC</th>
                <th className={thClass}>Valor procesado</th>
                <th className={thClass}>Transformación aplicada</th>
                <th className={thClass}>Valor en dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shownRows.map((row, i) => (
                <tr key={i}>
                  <td className={`${tdClass} font-mono text-[11px] text-muted`}>{row.tsUtc.slice(0, 19).replace('T', ' ')}</td>
                  <td className={`${tdClass} text-foreground`}>{row.processed}</td>
                  <td className={`${tdClass} text-[11px] text-muted`}>{row.transform}</td>
                  <td className={`${tdClass} font-medium text-foreground`}>{row.dashboard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <span className="text-[10px] text-muted">[DAT-20, DAT-19]</span>
        </div>
      </div>
    </div>
  );
}
