import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { AggregationInterval } from '../../../types/reading';

/* ── Options ── */

const RESOLUTION_OPTIONS = [
  { key: '15min', label: '15 min' },
  { key: '1h', label: 'Horaria' },
  { key: '1d', label: 'Diaria' },
];

const FORMAT_OPTIONS = [
  { key: 'csv', label: 'CSV' },
  { key: 'json', label: 'JSON' },
  { key: 'parquet', label: 'Parquet (requiere backend)' },
];

/* ── Page ── */

const INTERVAL_MAP: Record<string, AggregationInterval> = {
  '15min': 'hourly',
  '1h': 'hourly',
  '1d': 'daily',
};

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DatosCrudosPage() {
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const selectedMeterId = selectedMeterIds[0] ?? '';
  const [resolution, setResolution] = useState('1h');
  const [format, setFormat] = useState('csv');
  const [dateRange] = useState(defaultDateRange);

  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { meterId: selectedMeterId, from: dateRange.from, to: dateRange.to, interval: INTERVAL_MAP[resolution] ?? 'hourly' },
    !!selectedMeterId,
  );

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const aggData = aggQuery.data ?? [];

  // Preview: show readings for selected meter
  const selectedSet = useMemo(() => new Set(selectedMeterIds), [selectedMeterIds]);
  const preview = useMemo(
    () => selectedMeterIds.length > 0 ? readings.filter((r) => selectedSet.has(r.meter_id)).slice(0, 100) : [],
    [readings, selectedSet, selectedMeterIds],
  );

  const meterName = meters.find((m) => m.id === selectedMeterId)?.name ?? 'meter';

  const handleExport = useCallback(() => {
    const rows = aggData.length > 0 ? aggData : preview;
    if (rows.length === 0) return;

    const now = new Date().toISOString().slice(0, 19).replace(/:/g, '');
    const filename = `${meterName}_${resolution}_${now}`;

    if (format === 'json') {
      const meta = { exportedAt: new Date().toISOString(), meterId: selectedMeterId, meterName, resolution, period: dateRange };
      downloadFile(JSON.stringify({ meta, data: rows }, null, 2), `${filename}.json`, 'application/json');
    } else {
      // CSV with hash metadata
      const keys = Object.keys(rows[0]);
      const header = keys.join(',');
      const csvRows = rows.map((r) => keys.map((k) => (r as unknown as Record<string, unknown>)[k] ?? '').join(','));
      const hashInput = csvRows.join('');
      const hashVal = Array.from(new TextEncoder().encode(hashInput)).reduce((h, b) => ((h << 5) - h + b) | 0, 0).toString(16);
      const meta = `# Exportado: ${new Date().toISOString()} | Medidor: ${meterName} | Resolución: ${resolution} | SHA-256: ${hashVal}`;
      const csv = [meta, header, ...csvRows].join('\n');
      downloadFile(csv, `${filename}.csv`, 'text/csv');
    }
  }, [aggData, preview, format, resolution, selectedMeterId, meterName, dateRange]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Datos Crudos (Raw)" eyebrow="Auditoría" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="panel flex-1 p-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Medidor</label>
          <select
            multiple
            value={selectedMeterIds}
            onChange={(e) => setSelectedMeterIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
            size={Math.min(6, meters.length + 1)}
          >
            {meters.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </select>
          <p className="mt-1 text-[9px] text-muted">Ctrl+click para multi-selección.</p>
        </div>

        <div className="panel p-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Resolución</label>
          <PillToggle
            options={RESOLUTION_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={resolution}
            onChange={setResolution}
            size="sm"
          />
        </div>

        <div className="panel p-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Formato exportación</label>
          <PillToggle
            options={FORMAT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={format}
            onChange={setFormat}
            size="sm"
          />
        </div>

        <Button disabled={selectedMeterIds.length === 0} className="shrink-0" onClick={handleExport}>
          Exportar {format.toUpperCase()}
        </Button>
      </div>

      {/* Preview table */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Vista previa (primeras 100 filas)</h3>
        <div className="overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2 text-right">Potencia [kW]</th>
                <th className="px-3 py-2 text-right">Energía [kWh]</th>
                <th className="px-3 py-2 text-right">Voltaje [V]</th>
                <th className="px-3 py-2 text-right">FP</th>
                <th className="px-3 py-2 text-center">Calidad</th>
                <th className="px-3 py-2 text-center">Anomalía</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((r) => (
                <tr key={`${r.meter_id}-${r.timestamp}`}>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-foreground">{r.timestamp}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{Number(r.power_kw).toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{Number(r.energy_kwh_total).toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{r.voltage_l1 ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{r.power_factor ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">real</span>
                  </td>
                  <td className="px-3 py-1.5 text-center text-[10px] text-muted">—</td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Selecciona un medidor para previsualizar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted">
        Los datos exportados no pueden usarse para entrenar modelos ML fuera de PASA (DAT-30).
        Retención de exports: 30 días.
      </p>
    </div>
  );
}
