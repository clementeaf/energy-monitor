import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';

/* ── Options ── */

const RESOLUTION_OPTIONS = [
  { key: '15min', label: '15 min' },
  { key: '1h', label: 'Horaria' },
  { key: '1d', label: 'Diaria' },
];

const FORMAT_OPTIONS = [
  { key: 'csv', label: 'CSV' },
  { key: 'json', label: 'JSON' },
  { key: 'parquet', label: 'Parquet' },
];

/* ── Page ── */

export function DatosCrudosPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [resolution, setResolution] = useState('1h');
  const [format, setFormat] = useState('csv');

  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  // Preview: show readings for selected meter
  const preview = useMemo(
    () => selectedMeterId ? readings.filter((r) => r.meter_id === selectedMeterId).slice(0, 10) : [],
    [readings, selectedMeterId],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Datos Crudos (Raw)" eyebrow="Auditoría" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="panel flex-1 p-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Medidor</label>
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

        <Button disabled={!selectedMeterId} className="shrink-0">
          Exportar datos
        </Button>
      </div>

      {/* Preview table */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Vista previa (primeras 10 filas)</h3>
        <div className="overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2 text-right">Potencia [kW]</th>
                <th className="px-3 py-2 text-right">Energía [kWh]</th>
                <th className="px-3 py-2 text-right">Voltaje [V]</th>
                <th className="px-3 py-2 text-right">FP</th>
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
                </tr>
              ))}
              {preview.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Selecciona un medidor para previsualizar.</td></tr>
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
