import { useState } from 'react';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useToastStore } from '../../store/useToastStore';
import { formatPeriodo } from './format';
import { useEmsFleet } from './useEmsFleet';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const FACTOR_EMISION = 0.38;
const EFICIENCIA_BASE = 82.4;
const EFICIENCIA_POR_MEDIDA = 2.1;

interface Recomendacion {
  id: string;
  titulo: string;
  detalle: string;
  ahorroMillones: number;
  co2Toneladas: number;
  stripeClass: string;
}

const RECOMENDACIONES: Recomendacion[] = [
  { id: 'rec1', titulo: 'Desplazar carga fuera de punta en Quilicura', detalle: 'Mover 12% del consumo de 18–21 h reduce 8,4 tCO₂e y $2,1M de costo.', ahorroMillones: 2.1, co2Toneladas: 8.4, stripeClass: 'border-l-accent' },
  { id: 'rec2', titulo: 'Recambio de iluminación en Hotel Renaissance', detalle: 'Estimado 6,2% menos consumo con retorno en 14 meses.', ahorroMillones: 1.3, co2Toneladas: 4.1, stripeClass: 'border-l-info' },
  { id: 'rec3', titulo: 'Corregir factor de potencia en Alto Peñalolén', detalle: 'Evita recargos y mejora 1,3 pts el margen del centro.', ahorroMillones: 0.8, co2Toneladas: 1.6, stripeClass: 'border-l-warning' },
];

export function resumirMedidas(recomendaciones: Recomendacion[], aplicadas: Set<string>) {
  const aplicadasList = recomendaciones.filter((r) => aplicadas.has(r.id));
  const pendientes = recomendaciones.filter((r) => !aplicadas.has(r.id));
  const sumar = (list: Recomendacion[], pick: (r: Recomendacion) => number) => list.reduce((sum, r) => sum + pick(r), 0);
  return {
    aplicadas: aplicadasList.length,
    pendientes: pendientes.length,
    ahorroPendiente: sumar(pendientes, (r) => r.ahorroMillones),
    ahorroComprometido: sumar(aplicadasList, (r) => r.ahorroMillones),
    co2Reducido: sumar(aplicadasList, (r) => r.co2Toneladas),
    eficiencia: EFICIENCIA_BASE + aplicadasList.length * EFICIENCIA_POR_MEDIDA,
  };
}

export function SostenibilidadPage() {
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set());
  const showToast = useToastStore((s) => s.showToast);
  const resumen = resumirMedidas(RECOMENDACIONES, aplicadas);
  const fleet = useEmsFleet();
  const periodo = formatPeriodo(fleet.periodo);
  const huellaPorCentro = fleet.centros
    .map((c) => ({ id: c.id, name: c.name, huella: (c.consumoMesKwh / 1000) * FACTOR_EMISION }))
    .sort((a, b) => b.huella - a.huella);
  const huellaTotal = huellaPorCentro.reduce((s, c) => s + c.huella, 0);

  const aplicar = (recomendacion: Recomendacion) => {
    setAplicadas((prev) => new Set(prev).add(recomendacion.id));
    showToast(`Medida aplicada · ahorro comprometido $${fmt(recomendacion.ahorroMillones, 1)}M`);
  };
  const deshacer = (id: string) => {
    setAplicadas((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const maxHuella = Math.max(...huellaPorCentro.map((c) => c.huella), 1);

  return (
    <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
      <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Sostenibilidad</h1>
          <p className="text-xs text-muted">Huella de carbono, eficiencia y recomendaciones de ahorro</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Huella del periodo" value={fmt(Math.max(huellaTotal - resumen.co2Reducido, 0), 0)} unit="tCO₂" delta={resumen.aplicadas > 0 ? `↓ −${fmt(resumen.co2Reducido, 1)} t por medidas` : periodo} />
          <KpiCard label="Factor de emisión" value={fmt(FACTOR_EMISION, 2)} unit="kg/kWh" sub="Matriz SEN 2026" />
          <KpiCard label="Ahorro potencial" value={`$${fmt(resumen.ahorroPendiente, 1)}M`} sub={`${resumen.pendientes} medidas pendientes`} />
          <KpiCard label="Ahorro comprometido" value={`$${fmt(resumen.ahorroComprometido, 1)}M`} sub={`${resumen.aplicadas} de ${RECOMENDACIONES.length} aplicadas`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-card-fg">Huella de CO₂ por centro</h2>
                <p className="text-xs text-card-muted">Toneladas equivalentes · {periodo}</p>
              </div>
              <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">Sostenibilidad</span>
            </div>
            <div className="mt-4 space-y-3">
              {huellaPorCentro.map((c) => {
                const pct = (c.huella / maxHuella) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-40 truncate text-xs text-card-fg">{c.name}</span>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-raised">
                        <div className="h-3 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">{fmt(c.huella, 1)} t</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-2 flex flex-col items-center justify-center">
            <h2 className="self-start text-sm font-semibold text-card-fg">Eficiencia de la cartera</h2>
            <p className="self-start mb-4 text-xs text-card-muted">Consumo real contra línea base</p>
            <DonutChart value={resumen.eficiencia} />
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-fg">Recomendaciones priorizadas por impacto</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${resumen.pendientes === 0 ? 'bg-success-bg text-success' : 'border border-border text-muted'}`}>
              {resumen.aplicadas} de {RECOMENDACIONES.length} aplicadas
            </span>
          </div>
          <div className="space-y-3">
            {RECOMENDACIONES.map((r) => {
              const yaAplicada = aplicadas.has(r.id);
              return (
                <div key={r.id} className={`flex items-center justify-between rounded-lg border border-l-4 border-card-border px-4 py-3 ${r.stripeClass} ${yaAplicada ? 'opacity-60' : ''}`}>
                  <div>
                    <p className={`text-sm font-medium text-foreground ${yaAplicada ? 'line-through' : ''}`}>{r.titulo}</p>
                    <p className="text-xs text-muted">{r.detalle}</p>
                  </div>
                  {yaAplicada ? (
                    <button type="button" onClick={() => deshacer(r.id)} className="px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground">
                      Deshacer
                    </button>
                  ) : (
                    <button type="button" onClick={() => aplicar(r)} className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90">
                      ✓ Aplicar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </QueryStateView>
  );
}

function DonutChart({ value }: Readonly<{ value: number }>) {
  const size = 180;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-raised)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-accent)" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-card-fg tabular-nums">{value.toLocaleString('es-CL', { minimumFractionDigits: 1 })}%</span>
        <span className="text-xs text-card-muted">eficiencia</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, sub, delta }: Readonly<{
  label: string; value: string; unit?: string; sub?: string; delta?: string;
}>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      {delta && <p className="mt-1 text-[11px] text-muted">{delta}</p>}
      {sub && !delta && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
