import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
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

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Exportar Reportes"
        eyebrow="Exportar"
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: Configurator */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto overflow-x-hidden">
          <ConfigSection title="Tipo de contenido">
            <div className="space-y-1.5">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct.key} className="flex items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedContent.has(ct.key)}
                    onChange={() => toggleContent(ct.key)}
                    className="rounded border-border"
                  />
                  {ct.label}
                </label>
              ))}
            </div>
          </ConfigSection>

          <ConfigSection title="Alcance">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
            >
              {SCOPE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {scope === 'building' && (
              <MallMultiSelect
                buildings={buildingsQuery.data ?? []}
                selected={selectedMallIds}
                onToggle={(id) => setSelectedMallIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                onClear={() => setSelectedMallIds(new Set())}
                search={mallSearch}
                onSearch={setMallSearch}
              />
            )}
          </ConfigSection>

          <ConfigSection title="Período">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
            >
              {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {period === 'custom' && (
              <div className="mt-2 flex flex-col gap-1.5">
                <input type="date" value={customStart} min={fiveYearsAgo} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
                <input type="date" value={customEnd} min={customStart} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
              </div>
            )}
          </ConfigSection>

          <ConfigSection title="Granularidad">
            <PillToggle
              options={GRANULARITY_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={granularity}
              onChange={setGranularity}
              size="sm"
            />
            <p className="mt-1.5 text-[9px] text-muted">Datos diarios o inferiores no disponibles en perfil gerencial.</p>
          </ConfigSection>

          <ConfigSection title="Formato">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
            >
              {FORMAT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </ConfigSection>

          <ConfigSection title="Moneda">
            <PillToggle
              options={CURRENCY_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={currency}
              onChange={setCurrency}
              size="sm"
            />
          </ConfigSection>

          <Button
            onClick={handleExport}
            loading={generateReport.isPending}
            disabled={selectedContent.size === 0}
            className="mt-2 w-full"
          >
            Exportar datos
          </Button>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-amber-800">Limitaciones del perfil</p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
              Los exports incluyen únicamente datos agregados por mall y período.
              No incluyen datos crudos de medidores individuales ni información identificable de locatarios.
              Para datos de mayor granularidad se requiere el perfil auditor.
            </p>
          </div>
        </div>

        {/* Right: Preview + Queue */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Preview */}
          <div className="panel shrink-0 p-4">
            <h3 className="mb-3 text-[13px] font-medium text-foreground">Vista previa del contenido</h3>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2 text-right">Filas estimadas</th>
                  <th className="pb-2 text-right">Tamaño aprox.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedTypes.map((ct) => {
                  const rows = rowEstimates[ct.key] ?? ct.estimatedRows;
                  return (
                    <tr key={ct.key}>
                      <td className="py-1.5 text-foreground">{ct.label}</td>
                      <td className="py-1.5 text-right text-muted">{rows}</td>
                      <td className="py-1.5 text-right text-muted">{Math.round(rows * 2.5)} KB</td>
                    </tr>
                  );
                })}
                {selectedTypes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted">
                      Selecciona al menos un tipo de contenido.
                    </td>
                  </tr>
                )}
              </tbody>
              {selectedTypes.length > 0 && (
                <tfoot className="border-t border-border">
                  <tr className="font-medium text-foreground">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">{totalRows}</td>
                    <td className="pt-2 text-right">{totalSizeKb} KB</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Queue */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">
              Cola de exportaciones
            </h3>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Configuración</th>
                    <th className="px-3 py-2">Formato</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.map((report) => {
                    const status = report.fileUrl ? 'ready' : 'generating';
                    const statusDef = QUEUE_STATUS[status] ?? QUEUE_STATUS.generating;
                    return (
                      <tr key={report.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-2 text-foreground">
                          {new Date(report.createdAt).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-3 py-2 capitalize text-foreground">{report.reportType}</td>
                        <td className="px-3 py-2 text-[11px] text-muted">
                          {report.periodStart.slice(0, 7)} — {report.periodEnd.slice(0, 7)}
                        </td>
                        <td className="px-3 py-2 uppercase text-muted">{report.format}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusDef.style}`}>
                            {statusDef.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {report.fileUrl && (() => {
                            const createdMs = new Date(report.createdAt).getTime();
                            const expiresMs = createdMs + 30 * 86_400_000;
                            const daysLeft = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86_400_000));
                            const expired = daysLeft === 0;
                            return (
                              <div className="flex items-center gap-1.5">
                                {expired ? (
                                  <span className="text-[10px] text-red-500">Expirado</span>
                                ) : (
                                  <>
                                    <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand hover:underline">Descargar</a>
                                    <span className="text-[9px] text-muted">({daysLeft}d)</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                  {queue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No hay exportaciones recientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

/* ── Config section wrapper ── */

function ConfigSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="panel px-3 py-2.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{title}</p>
      {children}
    </div>
  );
}
