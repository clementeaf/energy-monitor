import { QueryStateView } from '../../components/ui/QueryStateView';
import { formatPeriodo } from './format';
import { useEmsFleet } from './useEmsFleet';
import { usePageTitle } from '../../store/usePageTitleStore';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const FACTOR_EMISION = 0.38;

interface RecomendacionEjemplo {
  id: string;
  titulo: string;
  detalle: string;
  stripeClass: string;
}

const RECOMENDACIONES_EJEMPLO: RecomendacionEjemplo[] = [
  { id: 'rec1', titulo: 'Desplazar carga fuera del horario punta', detalle: 'Mover consumo de 18–22 h a horarios más baratos reduce costo y emisiones.', stripeClass: 'border-l-accent' },
  { id: 'rec2', titulo: 'Recambio de iluminación', detalle: 'Iluminación LED en áreas comunes baja el consumo base del centro.', stripeClass: 'border-l-info' },
  { id: 'rec3', titulo: 'Corregir factor de potencia', detalle: 'Un banco de condensadores evita recargos por energía reactiva.', stripeClass: 'border-l-warning' },
];

export function SostenibilidadPage() {
  const fleet = useEmsFleet();
  const periodo = formatPeriodo(fleet.periodo);
  const huellaPorCentro = fleet.centros
    .map((c) => ({ id: c.id, name: c.name, huella: (c.consumoMesKwh / 1000) * FACTOR_EMISION }))
    .sort((a, b) => b.huella - a.huella);
  const huellaTotal = huellaPorCentro.reduce((s, c) => s + c.huella, 0);
  const consumoMwh = fleet.centros.reduce((s, c) => s + c.consumoMesKwh, 0) / 1000;
  const mayor = huellaPorCentro[0];
  const maxHuella = Math.max(...huellaPorCentro.map((c) => c.huella), 1);

  usePageTitle('Sostenibilidad', 'Add-ons / Sostenibilidad');

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Huella del periodo" value={fmt(huellaTotal, 0)} unit="tCO₂" sub={periodo} />
            <KpiCard label="Consumo del periodo" value={fmt(consumoMwh, 1)} unit="MWh" sub={periodo} />
            <KpiCard label="Factor de emisión" value={fmt(FACTOR_EMISION, 2)} unit="kg/kWh" sub="Valor de referencia usado en el cálculo" />
            <KpiCard label="Mayor huella" value={mayor ? fmt(mayor.huella, 1) : '—'} unit={mayor ? 't' : undefined} sub={mayor?.name ?? '—'} />
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-card-fg">Huella de CO₂ por centro</h2>
                <p className="text-xs text-card-muted">Toneladas equivalentes · consumo del mes × factor de emisión · {periodo}</p>
              </div>
              <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">Sostenibilidad</span>
            </div>
            <div className="mt-4 space-y-3">
              {huellaPorCentro.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-40 truncate text-xs text-card-fg">{c.name}</span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-raised">
                      <div className="h-3 rounded-full bg-accent transition-all" style={{ width: `${(c.huella / maxHuella) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">{fmt(c.huella, 1)} t</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-card-fg">Recomendaciones</h2>
              <span className="rounded-full bg-neutral-bg px-2.5 py-0.5 text-xs font-medium text-neutral-ink">Ejemplo</span>
            </div>
            <p className="mb-4 text-xs text-muted">Ejemplos de medidas habituales; todavía no se calculan con los datos de tus centros.</p>
            <div className="space-y-3">
              {RECOMENDACIONES_EJEMPLO.map((r) => (
                <div key={r.id} className={`rounded-lg border border-l-4 border-card-border px-4 py-3 ${r.stripeClass}`}>
                  <p className="text-sm font-medium text-foreground">{r.titulo}</p>
                  <p className="text-xs text-muted">{r.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </QueryStateView>
    </div>
  );
}

function KpiCard({ label, value, unit, sub }: Readonly<{
  label: string; value: string; unit?: string; sub?: string;
}>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-1 truncate text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
