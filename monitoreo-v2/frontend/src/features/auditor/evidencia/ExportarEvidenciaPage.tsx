import { useState, useMemo } from 'react';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import type { ReportFormat } from '../../../types/report';

/* ── Content types ── */

interface ContentDef { key: string; label: string; defaultChecked: boolean }

const CONTENT_TYPES: ContentDef[] = [
  { key: 'consumption', label: 'Datos de consumo', defaultChecked: true },
  { key: 'reconciliation', label: 'Cuadratura', defaultChecked: true },
  { key: 'audit', label: 'Pista de auditoría', defaultChecked: true },
  { key: 'quality', label: 'Scorecard de calidad', defaultChecked: false },
  { key: 'lineage', label: 'Linaje de lecturas', defaultChecked: false },
];

/* ── Helpers ── */

function computePeriodRange(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/* ── Page ── */

export function ExportarEvidenciaPage() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(CONTENT_TYPES.filter((c) => c.defaultChecked).map((c) => c.key)),
  );
  const [mallFilter, setMallFilter] = useState('all');
  const [periodMonths, setPeriodMonths] = useState('1');
  const [outputFormat, setOutputFormat] = useState('zip-signed');

  const periodRange = useMemo(() => computePeriodRange(Number(periodMonths)), [periodMonths]);

  const buildingsQuery = useBuildingsQuery();
  const reportsQuery = useReportsQuery({ reportType: 'evidence' });
  const generateReport = useGenerateReport();

  const buildings = buildingsQuery.data ?? [];

  // History from reports backend
  const history = useMemo(
    () => [...(reportsQuery.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20),
    [reportsQuery.data],
  );

  const toggleContent = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    const buildingId = mallFilter === 'all' ? undefined : mallFilter;
    generateReport.mutate({
      reportType: 'evidence',
      format: 'csv' as ReportFormat,
      periodStart: periodRange.from,
      periodEnd: periodRange.to,
      buildingId,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Page heading */}
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">6.6 Exportar Evidencia</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Generación de paquetes de evidencia firmados — exportación auditable con sello de integridad
        </p>
      </div>

      {/* Row 1 — configurator (left) + signature + preview (right) */}
      <div className="flex gap-4" style={{ minHeight: '360px' }}>
        {/* Left: Configurador */}
        <div className="relative flex-1">
          <div className="panel p-4 absolute inset-0 flex flex-col">
            <div className="mb-1">
              <h2 className="text-[13px] font-semibold text-foreground">Configurador de paquete de evidencia</h2>
              <p className="text-[11px] text-muted">Selección de contenido, alcance y formato</p>
            </div>

            <div className="mt-3 flex-1 space-y-4 overflow-y-auto">
              {/* Contenido a incluir */}
              <div>
                <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Contenido a incluir</h3>
                <p className="mb-2 text-[10px] text-muted">
                  (datos de consumo / cuadratura / pista de auditoría / scorecard de calidad / linaje) — multi-selección
                </p>
                <div className="space-y-1.5">
                  {CONTENT_TYPES.map((ct) => (
                    <label key={ct.key} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(ct.key)}
                        onChange={() => toggleContent(ct.key)}
                        className="rounded border-border"
                      />
                      {ct.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Mall(es) */}
              <div>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Mall(es)</h3>
                <DropdownSelect
                  className="w-full"
                  options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]}
                  value={mallFilter}
                  onChange={setMallFilter}
                />
              </div>

              {/* Período */}
              <div>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Período</h3>
                <DropdownSelect
                  className="w-full"
                  options={[
                    { value: '1', label: 'Último mes' },
                    { value: '3', label: 'Último trimestre' },
                    { value: '12', label: 'Último año' },
                  ]}
                  value={periodMonths}
                  onChange={setPeriodMonths}
                />
              </div>

              {/* Formato de salida */}
              <div>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Formato de salida (PDF + CSV empaquetados en ZIP firmado)
                </h3>
                <DropdownSelect
                  className="w-full"
                  options={[
                    { value: 'zip-signed', label: 'ZIP firmado (PDF + CSV)' },
                    { value: 'pdf-only', label: 'Solo PDF' },
                    { value: 'csv-only', label: 'Solo CSV' },
                  ]}
                  value={outputFormat}
                  onChange={setOutputFormat}
                />
              </div>
            </div>

            <p className="mt-3 text-right text-[9px] text-muted">[DAT-07, DAT-12]</p>
          </div>
        </div>

        {/* Right: signature + preview stacked */}
        <div className="relative flex-1 flex flex-col gap-4">
          {/* Firma digital */}
          <div className="panel p-4 flex flex-col flex-1">
            <div className="mb-2">
              <h2 className="text-[13px] font-semibold text-foreground">Firma digital del paquete</h2>
              <p className="text-[11px] text-muted">Sello de integridad aplicado al ZIP</p>
            </div>
            <ul className="flex-1 space-y-1.5 text-[12px] text-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                Sello de tiempo del servidor (timestamp de emisión)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                Hash SHA-256 del contenido del paquete
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                Firma de la plataforma
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                Verificable con herramienta pública de verificación de hash
              </li>
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <Button
                disabled={selected.size === 0}
                loading={generateReport.isPending}
                className="bg-brand text-white"
                onClick={handleGenerate}
              >
                Generar paquete firmado
              </Button>
              <Button variant="outline">
                Verificar hash
              </Button>
            </div>
            <p className="mt-2 text-right text-[9px] text-muted">[DAT-12, CYB-10, DAT-07]</p>
          </div>

          {/* Vista previa */}
          <div className="panel p-4 flex flex-col flex-1">
            <div className="mb-2">
              <h2 className="text-[13px] font-semibold text-foreground">Vista previa del paquete</h2>
              <p className="text-[11px] text-muted">Antes de generar</p>
            </div>
            <ul className="flex-1 space-y-1.5 text-[12px] text-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                Portada + índice de contenidos seleccionados
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted">•</span>
                <span className="font-mono text-[11px]">Estructura del ZIP: /pdf /csv /manifest-firma.txt</span>
              </li>
            </ul>
            <p className="mt-2 text-right text-[9px] text-muted">[DAT-12]</p>
          </div>
        </div>
      </div>

      {/* Row 2 — historial full-width */}
      <div className="panel p-4">
        <div className="mb-3">
          <h2 className="text-[13px] font-semibold text-foreground">Historial de evidencias exportadas</h2>
          <p className="text-[11px] text-muted">Link de descarga válido 90 días</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Contenido</th>
                <th className="px-3 py-2">Período cubierto</th>
                <th className="px-3 py-2">Hash SHA-256</th>
                <th className="px-3 py-2">Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((report, i) => (
                <tr
                  key={report.id}
                  className="transition-colors hover:bg-surface animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-3 py-2 text-muted">{new Date(report.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-3 py-2 text-muted text-[12px]">—</td>
                  <td className="px-3 py-2 text-muted text-[11px] uppercase">{report.format}</td>
                  <td className="px-3 py-2 text-muted">{report.periodStart} — {report.periodEnd}</td>
                  <td className="px-3 py-2">
                    {report.fileUrl
                      ? <span className="font-mono text-[10px] text-muted">SHA-256</span>
                      : <span className="text-[10px] text-muted">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {report.fileUrl ? (
                      (() => {
                        const createdMs = new Date(report.createdAt).getTime();
                        const expiresMs = createdMs + 90 * 86_400_000;
                        const daysLeft = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86_400_000));
                        return daysLeft > 0
                          ? <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline">Descargar ({daysLeft}d)</a>
                          : <span className="text-[10px] text-red-500">Expirado</span>;
                      })()
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700`}>
                        Generando
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">Sin evidencias exportadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-right text-[9px] text-muted">[DAT-12, DAT-14]</p>
      </div>
    </div>
  );
}
