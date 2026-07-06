import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import type { Report, ReportFormat, PlatformReportType } from '../../../types/report';

/* ── Config options (pure data) ── */

interface SelectOption { key: string; label: string }

const SCOPE_OPTIONS: SelectOption[] = [
  { key: 'portfolio', label: 'Portafolio completo' },
  { key: 'country', label: 'Por país' },
  { key: 'building', label: 'Centro específico' },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { key: 'month', label: 'Mes' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Año' },
];

const COMPARISON_OPTIONS: SelectOption[] = [
  { key: 'previous', label: 'vs. período anterior' },
  { key: 'yoy', label: 'vs. mismo período año anterior' },
  { key: 'none', label: 'Sin comparación' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { key: 'pdf', label: 'PDF' },
  { key: 'ppt', label: 'PPT' },
  { key: 'excel', label: 'Excel' },
  { key: 'csv', label: 'CSV' },
];

const METRIC_OPTIONS: SelectOption[] = [
  { key: 'consumption', label: 'Consumo' },
  { key: 'billing', label: 'Costo' },
  { key: 'quality', label: 'Intensidad' },
];

const LANGUAGE_OPTIONS: SelectOption[] = [
  { key: 'es', label: 'Español' },
  { key: 'en', label: 'Inglés' },
];

interface SectionDef { key: string; label: string; defaultChecked: boolean }

const REPORT_SECTIONS: SectionDef[] = [
  { key: 'kpis', label: 'KPIs ejecutivos', defaultChecked: true },
  { key: 'trends', label: 'Tendencia de consumo', defaultChecked: true },
  { key: 'ranking', label: 'Ranking de malls', defaultChecked: true },
  { key: 'costs', label: 'Análisis de costos', defaultChecked: true },
  { key: 'quality', label: 'Calidad del dato', defaultChecked: true },
  { key: 'alerts', label: 'Resumen de alarmas', defaultChecked: true },
  { key: 'coverage', label: 'Mapa de cobertura', defaultChecked: false },
];

/* ── Report status badges ── */

const STATUS_STYLE: Record<string, string> = {
  generating: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  generating: 'Generando',
  ready: 'Listo',
  error: 'Error',
};

/* ── Period helpers ── */

function periodRange(periodKey: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const RANGES: Record<string, () => { start: string; end: string }> = {
    month: () => ({
      start: new Date(year, month, 1).toISOString().slice(0, 10),
      end: new Date(year, month + 1, 0).toISOString().slice(0, 10),
    }),
    quarter: () => {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1).toISOString().slice(0, 10),
        end: new Date(year, qStart + 3, 0).toISOString().slice(0, 10),
      };
    },
    year: () => ({
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    }),
  };

  return (RANGES[periodKey] ?? RANGES.month)();
}

/* ── Page ── */

export function ReportesEjecutivosPage() {
  const [scope, setScope] = useState('portfolio');
  const [period, setPeriod] = useState('month');
  const [comparison, setComparison] = useState('previous');
  const [format, setFormat] = useState<string>('pdf');
  const [metric, setMetric] = useState('consumption');
  const [language, setLanguage] = useState('es');
  const [sections, setSections] = useState<Set<string>>(
    () => new Set(REPORT_SECTIONS.filter((s) => s.defaultChecked).map((s) => s.key)),
  );
  const [historySearch, setHistorySearch] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const buildings = buildingsQuery.data ?? [];
  const reportsQuery = useReportsQuery();
  const generateReport = useGenerateReport();

  const reports = reportsQuery.data ?? [];

  // Sorted + filtered history (newest first)
  const sortedReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!historySearch) return sorted;
    const q = historySearch.toLowerCase();
    return sorted.filter((r) =>
      r.reportType.toLowerCase().includes(q)
      || r.periodStart.includes(q)
      || r.createdAt.includes(q),
    );
  }, [reports, historySearch]);

  const toggleSection = (key: string) => {
    setSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    const range = periodRange(period);
    generateReport.mutate({
      reportType: metric as PlatformReportType,
      format: format as ReportFormat,
      periodStart: range.start,
      periodEnd: range.end,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Reportes Ejecutivos"
        eyebrow="Reportes"
        actions={
          <button
            type="button"
            onClick={() => { /* scroll to history */ }}
            className="text-[12px] text-brand hover:underline"
          >
            Revisar historial
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: Configurator */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          <ConfigSection title="Alcance geográfico">
            <PillToggle
              options={SCOPE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={scope}
              onChange={setScope}
              size="sm"
            />
            {scope === 'building' && (
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
              >
                <option value="">Seleccionar centro...</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </ConfigSection>

          <ConfigSection title="Período">
            <PillToggle
              options={PERIOD_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={period}
              onChange={setPeriod}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Comparación">
            <PillToggle
              options={COMPARISON_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={comparison}
              onChange={setComparison}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Secciones a incluir">
            <div className="space-y-1.5">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={sections.has(s.key)}
                    onChange={() => toggleSection(s.key)}
                    className="rounded border-border"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </ConfigSection>

          <ConfigSection title="Métrica principal">
            <PillToggle
              options={METRIC_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={metric}
              onChange={setMetric}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Formato de salida">
            <PillToggle
              options={FORMAT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={format}
              onChange={setFormat}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Idioma">
            <PillToggle
              options={LANGUAGE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={language}
              onChange={setLanguage}
              size="sm"
            />
          </ConfigSection>

          <Button
            onClick={handleGenerate}
            loading={generateReport.isPending}
            className="mt-2 w-full"
          >
            Generar reporte
          </Button>
        </div>

        {/* Right: Preview + History */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Preview */}
          <div className="panel flex min-h-0 shrink-0 flex-col overflow-hidden p-4" style={{ maxHeight: '65%' }}>
            <h3 className="mb-3 shrink-0 text-[13px] font-medium text-foreground">Vista previa</h3>
            {sections.size === 0 ? (
              <p className="py-6 text-center text-[12px] text-muted">
                Selecciona al menos una sección.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-3">
                  {REPORT_SECTIONS.filter((s) => sections.has(s.key)).map((s) => (
                    <PreviewCard key={s.key} section={s.key} label={s.label} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h3 className="flex-1 text-[13px] font-medium text-foreground">Historial de reportes generados</h3>
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por tipo o fecha..."
                className="w-44 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Alcance</th>
                    <th className="px-3 py-2">Período</th>
                    <th className="px-3 py-2">Formato</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedReports.map((report) => (
                    <ReportRow key={report.id} report={report} />
                  ))}
                  {sortedReports.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        No hay reportes generados aún.
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

/* ── Preview card with mock data ── */

// ponytail: mock preview visuals per section type
const PREVIEW_MOCK: Record<string, { value: string; detail: string }> = {
  kpis: { value: '12.4 MW', detail: 'Demanda agregada · 875 medidores · 7 malls' },
  trends: { value: '↑ 3.2%', detail: 'Consumo mensual vs período anterior' },
  ranking: { value: 'Top 5', detail: 'Mall del Mar #1 · Mallplaza #2' },
  costs: { value: '1,245 UF', detail: 'Costo total período · 82 UF/MWh' },
  quality: { value: '94.2%', detail: 'Cobertura de datos · 52 con gaps' },
  alerts: { value: '23 activas', detail: '5 críticas · 8 high · 10 medium' },
  coverage: { value: '7 malls', detail: 'Markers por estado operativo' },
};

// Mini bar chart (sparkline bars)
function MiniBarChart() {
  const bars = [35, 50, 42, 65, 58, 72, 60, 48, 55, 70, 62, 45];
  const max = Math.max(...bars);
  return (
    <div className="flex h-full items-end gap-[2px]">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 rounded-t bg-brand/30" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

// Mini line chart (SVG)
function MiniLineChart({ color = '#3b82f6' }: { color?: string }) {
  const pts = [20, 35, 28, 45, 40, 55, 48, 60, 52, 68, 58, 65];
  const max = Math.max(...pts);
  const w = 200;
  const h = 60;
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * w} ${h - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={color} fillOpacity={0.08} />
    </svg>
  );
}

// Mini horizontal bar ranking
function MiniRanking() {
  const items = [
    { name: 'Mall del Mar', pct: 100 },
    { name: 'Mallplaza', pct: 85 },
    { name: 'Open Temuco', pct: 62 },
    { name: 'SC52', pct: 45 },
    { name: 'SC53', pct: 38 },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-16 truncate text-[8px] text-muted">{item.name}</span>
          <div className="h-2 flex-1 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand/40" style={{ width: `${item.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini donut (SVG)
function MiniDonut({ pct, color = '#22c55e' }: { pct: number; color?: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="flex h-full items-center justify-center">
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill="none" stroke="#e5e7eb" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)" />
        <text x={28} y={30} textAnchor="middle" fontSize={10} fontWeight={600} fill="currentColor">{pct}%</text>
      </svg>
    </div>
  );
}

// Mini alert list
function MiniAlertList() {
  const items = [
    { sev: 'bg-red-400', text: 'Voltaje fuera de rango' },
    { sev: 'bg-orange-400', text: 'Lectura stale >4h' },
    { sev: 'bg-amber-400', text: 'PF bajo umbral' },
    { sev: 'bg-red-400', text: 'Medidor offline' },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={`inline-block size-1.5 shrink-0 rounded-full ${item.sev}`} />
          <span className="truncate text-[8px] text-muted">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// Mini map placeholder
function MiniMap() {
  const dots = [
    { x: 25, y: 35, c: '#22c55e' }, { x: 45, y: 25, c: '#f59e0b' }, { x: 60, y: 50, c: '#22c55e' },
    { x: 30, y: 60, c: '#ef4444' }, { x: 70, y: 40, c: '#22c55e' }, { x: 50, y: 70, c: '#f59e0b' },
    { x: 40, y: 45, c: '#22c55e' },
  ];
  return (
    <svg viewBox="0 0 100 80" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect x={5} y={5} width={90} height={70} rx={4} fill="#f3f4f6" stroke="#e5e7eb" strokeWidth={0.5} />
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={3} fill={d.c} opacity={0.7} />)}
    </svg>
  );
}

const SECTION_VISUAL: Record<string, () => React.ReactNode> = {
  kpis: () => <MiniBarChart />,
  trends: () => <MiniLineChart />,
  ranking: () => <MiniRanking />,
  costs: () => <MiniLineChart color="#f59e0b" />,
  quality: () => <MiniDonut pct={94} />,
  alerts: () => <MiniAlertList />,
  coverage: () => <MiniMap />,
};

function PreviewCard({ section, label }: Readonly<{ section: string; label: string }>) {
  const mock = PREVIEW_MOCK[section];
  const Visual = SECTION_VISUAL[section];
  return (
    <div className="flex aspect-[4/3] flex-col rounded-lg border border-border bg-white p-3">
      <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      {mock && <p className="shrink-0 text-base font-bold text-foreground">{mock.value}</p>}
      <div className="my-1.5 min-h-0 flex-1">
        {Visual ? Visual() : null}
      </div>
      {mock && <p className="shrink-0 text-[9px] text-muted">{mock.detail}</p>}
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

/* ── Report row ── */

function ReportRow({ report }: Readonly<{ report: Report }>) {
  const status = report.fileUrl ? 'ready' : 'generating';
  const badgeClass = STATUS_STYLE[status] ?? '';
  const badgeLabel = STATUS_LABEL[status] ?? status;

  return (
    <tr className="transition-colors hover:bg-surface">
      <td className="px-4 py-2 text-foreground">
        {new Date(report.createdAt).toLocaleDateString('es-CL')}
      </td>
      <td className="px-3 py-2 capitalize text-foreground">{report.reportType}</td>
      <td className="px-3 py-2 text-muted">{(report as unknown as Record<string, unknown>).scope as string ?? 'Portafolio'}</td>
      <td className="px-3 py-2 text-muted">
        {report.periodStart.slice(0, 7)} — {report.periodEnd.slice(0, 7)}
      </td>
      <td className="px-3 py-2 uppercase text-muted">{report.format}</td>
      <td className="px-3 py-2 text-muted">{(report as unknown as Record<string, unknown>).userEmail as string ?? '—'}</td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </td>
      <td className="px-3 py-2">
        {report.fileUrl && (
          <a
            href={report.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline"
          >
            Descargar
          </a>
        )}
      </td>
    </tr>
  );
}
