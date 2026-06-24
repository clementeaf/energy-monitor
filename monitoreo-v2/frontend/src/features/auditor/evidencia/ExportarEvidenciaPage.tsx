import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';

/* ── Content types ── */

interface ContentDef { key: string; label: string; defaultChecked: boolean }

const CONTENT_TYPES: ContentDef[] = [
  { key: 'consumption', label: 'Datos de consumo', defaultChecked: true },
  { key: 'reconciliation', label: 'Cuadratura', defaultChecked: true },
  { key: 'audit', label: 'Pista de auditoría', defaultChecked: true },
  { key: 'quality', label: 'Scorecard de calidad', defaultChecked: false },
  { key: 'lineage', label: 'Linaje de lecturas', defaultChecked: false },
];

// ponytail: static history — replace with API when evidence export backend ships
const EVIDENCE_HISTORY = [
  { id: 'ev1', date: '2026-06-20', user: 'auditor@pasa.cl', content: 'Consumo + Cuadratura', period: '2026-05', downloadUrl: '#' },
  { id: 'ev2', date: '2026-05-15', user: 'auditor@pasa.cl', content: 'Pista de auditoría', period: '2026-04', downloadUrl: '#' },
];

/* ── Page ── */

export function ExportarEvidenciaPage() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(CONTENT_TYPES.filter((c) => c.defaultChecked).map((c) => c.key)),
  );

  const toggleContent = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Exportar Evidencia" eyebrow="Auditoría" />

      <div className="flex gap-4">
        {/* Configurator */}
        <div className="panel w-80 shrink-0 space-y-4 p-4">
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Contenido a incluir</h3>
            <div className="space-y-1.5">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct.key} className="flex items-center gap-2 text-[12px] text-foreground">
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

          <p className="text-[10px] text-muted">
            El paquete incluye sello de tiempo, hash SHA-256 y firma de la plataforma.
            Formato: PDF + CSV en ZIP firmado.
          </p>

          <Button disabled={selected.size === 0} className="w-full">
            Generar paquete de evidencia
          </Button>
        </div>

        {/* History */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Historial de evidencias exportadas</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Contenido</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EVIDENCE_HISTORY.map((ev) => (
                <tr key={ev.id} className="transition-colors hover:bg-surface">
                  <td className="px-3 py-2 text-muted">{ev.date}</td>
                  <td className="px-3 py-2 text-foreground">{ev.user}</td>
                  <td className="px-3 py-2 text-muted">{ev.content}</td>
                  <td className="px-3 py-2 text-muted">{ev.period}</td>
                  <td className="px-3 py-2">
                    <a href={ev.downloadUrl} className="text-[11px] text-brand hover:underline">Descargar</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
