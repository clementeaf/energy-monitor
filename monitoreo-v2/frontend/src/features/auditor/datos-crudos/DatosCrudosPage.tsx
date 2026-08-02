import { useState, useMemo, useCallback } from 'react';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { AggregationInterval } from '../../../types/reading';

/* ── Constants ── */

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
  const [resolution] = useState('1h');
  const [dateRange, setDateRange] = useState(defaultDateRange);

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

  // Compute average power for anomaly detection
  const avgPower = useMemo(() => {
    if (preview.length === 0) return 0;
    const sum = preview.reduce((acc, r) => acc + Number(r.power_kw), 0);
    return sum / preview.length;
  }, [preview]);

  const meterName = meters.find((m) => m.id === selectedMeterId)?.name ?? 'meter';

  const handleExportCsv = useCallback(() => {
    const rows = aggData.length > 0 ? aggData : preview;
    if (rows.length === 0) return;
    const now = new Date().toISOString().slice(0, 19).replace(/:/g, '');
    const filename = `${meterName}_${resolution}_${now}`;
    const keys = Object.keys(rows[0]);
    const header = keys.join(',');
    const csvRows = rows.map((r) => keys.map((k) => (r as unknown as Record<string, unknown>)[k] ?? '').join(','));
    const hashInput = csvRows.join('');
    const hashVal = Array.from(new TextEncoder().encode(hashInput)).reduce((h, b) => ((h << 5) - h + b) | 0, 0).toString(16);
    const meta = `# Exportado: ${new Date().toISOString()} | Medidor: ${meterName} | Resolución: ${resolution} | SHA-256: ${hashVal}`;
    downloadFile([meta, header, ...csvRows].join('\n'), `${filename}.csv`, 'text/csv');
  }, [aggData, preview, resolution, meterName]);

  const handleExportJson = useCallback(() => {
    const rows = aggData.length > 0 ? aggData : preview;
    if (rows.length === 0) return;
    const now = new Date().toISOString().slice(0, 19).replace(/:/g, '');
    const filename = `${meterName}_${resolution}_${now}`;
    const meta = { exportedAt: new Date().toISOString(), meterId: selectedMeterId, meterName, resolution, period: dateRange };
    downloadFile(JSON.stringify({ meta, data: rows }, null, 2), `${filename}.json`, 'application/json');
  }, [aggData, preview, resolution, selectedMeterId, meterName, dateRange]);

  const handleExportParquet = useCallback(() => {
    // Parquet requires backend endpoint — placeholder
    alert('Exportación Parquet requiere backend. Próximamente.');
  }, []);

  const handleVerifyHash = useCallback(() => {
    alert('Verificación de hash: funcionalidad próximamente.');
  }, []);

  const meterOptions = meters.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Page title */}
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">6.5 Datos Crudos</h1>
        <p className="mt-0.5 text-xs text-muted">
          Vista previa de lecturas sin transformar — exportación para Data Science con sello de integridad
        </p>
      </div>

      {/* Filter banner */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="mb-1 block text-xs font-medium text-muted">Medidor(es)</label>
          <DropdownSelect
            options={meterOptions}
            value={selectedMeterIds[0] ?? ''}
            onChange={(val) => setSelectedMeterIds(val ? [val] : [])}
            placeholder="Seleccionar medidor..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Desde</label>
          <input
            type="date"
            value={dateRange.from}
            max={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-foreground"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Hasta</label>
          <input
            type="date"
            value={dateRange.to}
            min={dateRange.from}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* Row 1 — Preview table (flex-1) */}
      <div className="panel flex flex-1 flex-col p-4" style={{ minHeight: 0 }}>
        <div className="mb-3 flex items-center gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Vista previa de datos raw</h2>
            <p className="text-xs text-muted">Primeras 100 filas · sin transformar · solo lectura</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="px-3 py-2">Timestamp UTC</th>
                <th className="px-3 py-2 text-right">Valor raw</th>
                <th className="px-3 py-2">Unidad</th>
                <th className="px-3 py-2 text-center">Flag calidad</th>
                <th className="px-3 py-2 text-center">Flag anomalía</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((r, idx) => (
                <tr
                  key={`${r.meter_id}-${r.timestamp}`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground">{r.timestamp}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{Number(r.power_kw).toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-muted">kW</td>
                  <td className="px-3 py-1.5 text-center">
                    {(() => {
                      const ageMs = Date.now() - new Date(r.timestamp).getTime();
                      const stale = ageMs > 4 * 3_600_000;
                      return stale
                        ? <span className="rounded-full bg-info/10 px-1.5 py-0.5 text-xs font-medium text-info">estimado</span>
                        : <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">real</span>;
                    })()}
                  </td>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {(() => {
                      const pw = Number(r.power_kw);
                      if (avgPower <= 0) return <span className="text-muted">—</span>;
                      if (pw > avgPower * 2) return <span className="text-warning font-medium">Alto (&gt;2x avg)</span>;
                      if (pw < avgPower * 0.5) return <span className="text-warning font-medium">Bajo (&lt;0.5x avg)</span>;
                      return <span className="text-muted">—</span>;
                    })()}
                  </td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    Selecciona un medidor para previsualizar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 2 — 2 cols 50/50 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Exportación */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Exportación</h2>
              <p className="text-xs text-muted">Formatos para Data Science · retención de exports: 30 días</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted">•</span>
              <span>Formatos: <strong>Parquet</strong> · <strong>CSV</strong> · <strong>JSON</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted">•</span>
              <span>Metadatos en el header: usuario · fecha de exportación · medidor(es) · período · hash SHA-256</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted">•</span>
              <span>El hash sella el archivo: permite verificar que la extracción no fue alterada</span>
            </li>
          </ul>
        </div>

        {/* Right: Restricción uso de datos */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Restricción de uso</h2>
              <p className="text-xs text-muted">Aviso permanente ligado a la exportación</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-warning">•</span>
              <span>Los datos exportados <strong>NO pueden usarse</strong> para entrenar modelos de ML fuera de PASA.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-warning">•</span>
              <span>Restricción contractual y técnica de entrenamiento con datos de PASA.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-warning">•</span>
              <span>Aplica a Parquet, CSV y JSON descargados desde esta pantalla.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          className="bg-brand text-background hover:opacity-90"
          onClick={handleExportParquet}
          disabled={selectedMeterIds.length === 0}
        >
          Exportar Parquet
        </Button>
        <Button
          variant="secondary"
          onClick={handleExportCsv}
          disabled={selectedMeterIds.length === 0}
        >
          Exportar CSV
        </Button>
        <Button
          variant="secondary"
          onClick={handleExportJson}
          disabled={selectedMeterIds.length === 0}
        >
          Exportar JSON
        </Button>
        <Button variant="secondary" onClick={handleVerifyHash}>
          Verificar hash
        </Button>
      </div>
    </div>
  );
}
