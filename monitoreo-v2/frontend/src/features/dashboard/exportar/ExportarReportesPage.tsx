import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced with native selects per wireframe
import { Button } from '../../../components/ui/Button';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import type { Report, ReportFormat } from '../../../types/report';

/* ── Config options (pure data) ── */

interface SelectOption { key: string; label: string }

interface ContentType { key: string; label: string; estimatedRows: number; estimatedSizeKb: number }

const CONTENT_TYPES: ContentType[] = [
  { key: 'consumption', label: 'Consumos agregados por mall', estimatedRows: 50, estimatedSizeKb: 120 },
  { key: 'billing', label: 'Costos y facturación', estimatedRows: 30, estimatedSizeKb: 80 },
  { key: 'quality', label: 'Calidad del dato', estimatedRows: 40, estimatedSizeKb: 95 },
  { key: 'coverage', label: 'Cobertura de medición', estimatedRows: 25, estimatedSizeKb: 60 },
  { key: 'alerts_compliance', label: 'Resumen de alarmas del período', estimatedRows: 100, estimatedSizeKb: 200 },
];

const SCOPE_OPTIONS: SelectOption[] = [
  { key: 'portfolio', label: 'Portafolio completo' },
  { key: 'country', label: 'País' },
  { key: 'building', label: 'Mall específico' },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre actual' },
  { key: 'ytd', label: 'Año en curso' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'custom', label: 'Rango personalizado' },
];

const GRANULARITY_OPTIONS: SelectOption[] = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'weekly', label: 'Semanal' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { key: 'pdf', label: 'PDF ejecutivo (gráficos + presentación)' },
  { key: 'excel', label: 'Excel (tablas de datos planas)' },
  { key: 'csv', label: 'CSV (solo datos, sin formato)' },
  { key: 'zip', label: 'ZIP (multi-contenido)' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { key: 'CLP', label: 'CLP' },
  { key: 'UF', label: 'UF' },
  { key: 'USD', label: 'USD' },
];

/* ── Queue status styling ── */

const QUEUE_STATUS: Record<string, { label: string; style: string }> = {
  queued: { label: 'En cola', style: 'bg-gray-100 text-gray-700' },
  generating: { label: 'Generando', style: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Listo', style: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Error', style: 'bg-red-100 text-red-700' },
};

/* ── Page ── */

export function ExportarReportesPage() {
  const [selectedContent, setSelectedContent] = useState<Set<string>>(
    () => new Set(['consumption']),
  );
  const [scope, setScope] = useState('portfolio');
  const [period, setPeriod] = useState('month');
  const [granularity, setGranularity] = useState('monthly');
  const [format, setFormat] = useState('excel');
  const [currency, setCurrency] = useState('CLP');
  // Custom date range (max 5 years back)
  const fiveYearsAgo = new Date(new Date().getFullYear() - 5, 0, 1).toISOString().slice(0, 10);
  const [customStart, setCustomStart] = useState(fiveYearsAgo);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMallIds, setSelectedMallIds] = useState<Set<string>>(new Set());
  const [mallSearch, setMallSearch] = useState('');

  const reportsQuery = useReportsQuery();
  const generateReport = useGenerateReport();
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const reports = reportsQuery.data ?? [];
  const buildingCount = buildingsQuery.data?.length ?? 0;
  const meterCount = metersQuery.data?.length ?? 0;
  const alertCount = alertsQuery.data?.length ?? 0;

  // Queue (recent exports, newest first)
  const queue = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [reports],
  );

  // Preview summary — derive estimates from real entity counts
  const selectedTypes = CONTENT_TYPES.filter((t) => selectedContent.has(t.key));
  const rowEstimates: Record<string, number> = {
    consumption: buildingCount * (granularity === 'weekly' ? 12 : 12), // per building per period
    billing: buildingCount * 3, // invoices per building
    quality: meterCount,
    coverage: buildingCount,
    alerts_compliance: Math.max(alertCount, 10),
  };
  const totalRows = selectedTypes.reduce((sum, t) => sum + (rowEstimates[t.key] ?? t.estimatedRows), 0);
  const totalSizeKb = Math.round(totalRows * 2.5); // ~2.5 KB per row estimate

  const toggleContent = (key: string) => {
    setSelectedContent((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const now = new Date();
    let periodStart: string;
    let periodEnd: string;

    if (period === 'custom') {
      periodStart = customStart;
      periodEnd = customEnd;
    } else {
      const yr = now.getFullYear();
      const mo = now.getMonth();
      const ranges: Record<string, [string, string]> = {
        month: [`${yr}-${String(mo + 1).padStart(2, '0')}-01`, now.toISOString().slice(0, 10)],
        quarter: [new Date(yr, Math.floor(mo / 3) * 3, 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)],
        ytd: [`${yr}-01-01`, now.toISOString().slice(0, 10)],
        '12m': [new Date(yr - 1, mo, 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)],
      };
      [periodStart, periodEnd] = ranges[period] ?? ranges.month;
    }

    selectedTypes.forEach((ct) => {
      generateReport.mutate({
        reportType: ct.key as Report['reportType'],
        format: format as ReportFormat,
        periodStart,
        periodEnd,
        // ponytail: backend may ignore these — but we send them for when it supports them
        ...({ granularity, currency } as Record<string, string>),
      });
    });
  };

  const scopeLabel = SCOPE_OPTIONS.find((o) => o.key === scope)?.label ?? scope;
  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period;
  const formatLabel = FORMAT_OPTIONS.find((o) => o.key === format)?.label ?? format;
  const granLabel = GRANULARITY_OPTIONS.find((o) => o.key === granularity)?.label ?? granularity;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="3.6 Exportar Reportes"
        description="Exportación de datos agregados del portafolio con configuración de contenido, alcance y formato"
      />

      {/* Row 1: 2 columns */}
      <div className="relative min-h-0 flex-1 basis-1/2">
        <div className="absolute inset-0 flex gap-3">
          {/* Left: Configurador de exportación */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="panel px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Configurador de exportación</p>
              <p className="text-[9px] text-subtle">selección de contenido, alcance y formato</p>
              <div className="mt-3 space-y-3">
                <ConfigField label="Tipo de contenido (multi-selección)">
                  <div className="space-y-1.5">
                    {CONTENT_TYPES.map((ct) => (
                      <label key={ct.key} className="flex items-center gap-2 text-[11px] text-foreground">
                        <input type="checkbox" checked={selectedContent.has(ct.key)} onChange={() => toggleContent(ct.key)} className="rounded border-border" />
                        {ct.label}
                      </label>
                    ))}
                  </div>
                </ConfigField>
                <ConfigField label="Alcance geográfico">
                  <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    {SCOPE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                  {scope === 'building' && (
                    <MallMultiSelect buildings={buildingsQuery.data ?? []} selected={selectedMallIds} onToggle={(id) => setSelectedMallIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })} onClear={() => setSelectedMallIds(new Set())} search={mallSearch} onSearch={setMallSearch} />
                  )}
                </ConfigField>
                <ConfigField label="Período (hasta 5 años)">
                  <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                  {period === 'custom' && (
                    <div className="mt-1 flex gap-2">
                      <input type="date" value={customStart} min={fiveYearsAgo} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
                      <input type="date" value={customEnd} min={customStart} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setCustomEnd(e.target.value)} className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
                    </div>
                  )}
                </ConfigField>
                <ConfigField label="Granularidad temporal (Mensual / Semanal)">
                  <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    {GRANULARITY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </ConfigField>
                <ConfigField label="Formato de salida (PDF / Excel / CSV)">
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    {FORMAT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </ConfigField>
                <ConfigField label="Moneda de costos">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    {CURRENCY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </ConfigField>
              </div>
              <p className="mt-2 text-right text-[9px] text-subtle">[DAT-07, DAT-12]</p>
            </div>
          </div>

          {/* Right: Resumen + Buttons + Limitación */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {/* Resumen de la exportación */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Resumen de la exportación</p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted">
                <p>• Contenido: {selectedTypes.map((t) => t.label).join(', ') || '—'}</p>
                <p>• Alcance: {scopeLabel} · Período: {periodLabel}</p>
                <p>• Granularidad: {granLabel} · Formato: {formatLabel}</p>
              </div>
              <p className="mt-1 text-right text-[9px] text-subtle">[DAT-12]</p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 gap-2">
              <Button onClick={handleExport} loading={generateReport.isPending} disabled={selectedContent.size === 0} className="flex-1">
                Exportar
              </Button>
              <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">
                Programar exportación
              </button>
            </div>

            {/* Limitación del perfil gerencial */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Limitación del perfil gerencial</p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                <li>• Solo datos agregados por mall y período</li>
                <li>• Sin datos crudos de medidores individuales</li>
                <li>• Sin información identificable de locatarios</li>
                <li>• Para granularidad / trazabilidad / evidencia firmada → perfil Auditor</li>
              </ul>
              <p className="mt-1 text-right text-[9px] text-subtle">[DAT-07]</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Historial de exportaciones */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Historial de exportaciones</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">Fecha</th>
                <th className="px-2 py-1.5">Usuario</th>
                <th className="px-2 py-1.5">Contenido</th>
                <th className="px-2 py-1.5">Período</th>
                <th className="px-2 py-1.5">Formato</th>
                <th className="px-2 py-1.5">Descarga</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {queue.map((report, i) => (
                  <tr key={report.id} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-2 py-1.5 text-foreground">{new Date(report.createdAt).toLocaleDateString('es-CL')}</td>
                    <td className="px-2 py-1.5 text-muted">{(report as unknown as Record<string, unknown>).userEmail as string ?? '—'}</td>
                    <td className="px-2 py-1.5 capitalize text-muted">{report.reportType}</td>
                    <td className="px-2 py-1.5 text-muted">{report.periodStart.slice(0, 7)} — {report.periodEnd.slice(0, 7)}</td>
                    <td className="px-2 py-1.5 uppercase text-muted">{report.format}</td>
                    <td className="px-2 py-1.5">
                      {report.fileUrl ? (
                        <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Descargar</a>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-700">Generando</span>
                      )}
                    </td>
                  </tr>
                ))}
                {queue.length === 0 && (
                  <tr><td colSpan={6} className="px-2 py-6 text-center text-muted">No hay exportaciones recientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-12, DAT-08]</p>
      </div>
    </div>
  );
}

/* ── Mall multi-select dropdown ── */

function MallMultiSelect({ buildings, selected, onToggle, onClear, search, onSearch }: Readonly<{
  buildings: import('../../../types/building').Building[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  search: string;
  onSearch: (v: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { ref.current && !ref.current.contains(e.target as Node) && setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = search
    ? buildings.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : buildings;

  const label = selected.size === 0 ? 'Todos los malls' : `${selected.size} mall${selected.size > 1 ? 's' : ''}`;

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground"
      >
        {label}
        <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border p-2">
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar mall..."
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
              autoFocus
            />
          </div>
          <ul className="max-h-40 overflow-y-auto py-1">
            {selected.size > 0 && (
              <li>
                <button type="button" onClick={onClear} className="w-full px-3 py-1.5 text-left text-[11px] text-brand hover:bg-surface">
                  Limpiar selección
                </button>
              </li>
            )}
            {filtered.map((b) => (
              <li key={b.id}>
                <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-surface">
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => onToggle(b.id)} className="size-3 rounded border-border" />
                  {b.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Config field (label + input) ── */

function ConfigField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-muted">{label}</p>
      {children}
    </div>
  );
}
