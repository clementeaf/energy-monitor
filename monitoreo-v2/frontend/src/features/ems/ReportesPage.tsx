import { useState } from 'react';

interface ReporteProgramado {
  id: string;
  nombre: string;
  alcance: string;
  frecuencia: string;
  formato: 'PDF' | 'Excel';
  activo: boolean;
}

const PROGRAMADOS: ReporteProgramado[] = [
  { id: 'rp1', nombre: 'Consumo y margen mensual', alcance: 'Todos los centros', frecuencia: 'Mensual · día 1', formato: 'PDF', activo: true },
  { id: 'rp2', nombre: 'Detalle por cliente', alcance: 'Retail Costanera SpA', frecuencia: 'Mensual · día 3', formato: 'Excel', activo: true },
  { id: 'rp3', nombre: 'Salud de la flota', alcance: 'Remarcadores', frecuencia: 'Semanal · lunes', formato: 'PDF', activo: true },
  { id: 'rp4', nombre: 'Picos de demanda', alcance: 'Planta Quilicura', frecuencia: 'Diario · 08:00', formato: 'Excel', activo: false },
];

const FORMATO_CLS: Record<string, string> = {
  PDF: 'bg-danger-bg text-danger',
  Excel: 'bg-success-bg text-success',
};

export function ReportesPage() {
  const [reportes, setReportes] = useState(PROGRAMADOS);

  const toggleReporte = (id: string) => {
    setReportes((prev) => prev.map((r) => r.id === id ? { ...r, activo: !r.activo } : r));
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Reportes</h1>
          <p className="text-xs text-muted">Exporta datos y programa envíos automáticos</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
          + Nuevo reporte
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ↓ Exportar consumo (Excel)
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ↓ Exportar márgenes (PDF)
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-card-fg">Reportes programados</h2>
            <p className="text-xs text-card-muted">Se generan y envían automáticamente</p>
          </div>
          <button type="button" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            ⊙ Módulo Reportes
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-card-border">
                <Th>Reporte</Th>
                <Th>Alcance</Th>
                <Th>Frecuencia</Th>
                <Th>Formato</Th>
                <Th>Programación</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {reportes.map((r) => (
                <tr key={r.id} className="hover:bg-surface">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{r.nombre}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.alcance}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.frecuencia}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${FORMATO_CLS[r.formato]}`}>{r.formato}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleReporte(r.id)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${r.activo ? 'bg-accent' : 'bg-raised'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.activo ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                      <span className="text-xs text-muted">{r.activo ? 'Programado' : 'Pausado'}</span>
                      <button type="button" className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-raised">
                        Generar ahora
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card px-4 py-12 text-center">
        <div className="mb-2 text-2xl text-muted">⏱</div>
        <p className="text-sm font-medium text-card-fg">Sin reportes generados hoy</p>
        <p className="mt-1 text-xs text-muted">
          El próximo envío automático es el 1 de octubre a las 07:00.
          <br />
          También puedes generar cualquiera manualmente.
        </p>
      </div>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
