import { useState } from 'react';
import { CENTROS } from './mock-data';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const FACTOR_EMISION = 0.38;
const HUELLA_POR_CENTRO = CENTROS.map((c) => ({
  ...c,
  huella: +(c.consumoMes * FACTOR_EMISION).toFixed(1),
})).sort((a, b) => b.huella - a.huella);

const HUELLA_TOTAL = HUELLA_POR_CENTRO.reduce((s, c) => s + c.huella, 0);
const CONSUMO_TOTAL = CENTROS.reduce((s, c) => s + c.consumoMes, 0);
const EFICIENCIA = 82.4;

interface Recomendacion {
  id: string;
  titulo: string;
  detalle: string;
}

const RECOMENDACIONES: Recomendacion[] = [
  { id: 'rec1', titulo: 'Desplazar carga fuera de punta en Planta Quilicura', detalle: 'Mover 12% del consumo de 18–21 h reduce 8,4 tCO₂e y $2,1M de costo.' },
  { id: 'rec2', titulo: 'Recambio de iluminación en Bodega San Bernardo', detalle: 'Estimado 6,2% menos consumo con retorno en 14 meses.' },
  { id: 'rec3', titulo: 'Corregir factor de potencia en Centro Costanera', detalle: 'Evita recargos y mejora 1,3 pts el margen del centro.' },
];

export function SostenibilidadPage() {
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set());

  const aplicar = (id: string) => {
    setAplicadas((prev) => new Set(prev).add(id));
  };

  const maxHuella = Math.max(...HUELLA_POR_CENTRO.map((c) => c.huella));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Sostenibilidad</h1>
        <p className="text-xs text-muted">Huella de carbono, eficiencia y recomendaciones de ahorro</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Huella del periodo" value={fmt(HUELLA_TOTAL, 0)} unit={`tCO₂`} delta={`↑ 2,6% vs agosto`} />
        <KpiCard label="Factor de emisión" value={fmt(FACTOR_EMISION, 2)} unit="kg/kWh" sub="Matriz SEN 2026" />
        <KpiCard label="Ahorro potencial" value="$4,2M" sub={`${RECOMENDACIONES.length - aplicadas.size} medidas pendientes`} />
        <KpiCard label="Ahorro comprometido" value={aplicadas.size > 0 ? '$2,1M' : '$0,0M'} sub={`${aplicadas.size} de ${RECOMENDACIONES.length} aplicadas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-card-fg">Huella de CO₂ por centro</h2>
              <p className="text-xs text-card-muted">Toneladas equivalentes del mes</p>
            </div>
            <button type="button" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              ⊙ Sostenibilidad
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {HUELLA_POR_CENTRO.map((c) => {
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
          <DonutChart value={EFICIENCIA} />
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-card-fg">Recomendaciones priorizadas por impacto</h2>
          <span className="text-xs text-muted">{aplicadas.size} de {RECOMENDACIONES.length} aplicadas</span>
        </div>
        <div className="space-y-3">
          {RECOMENDACIONES.map((r) => {
            const yaAplicada = aplicadas.has(r.id);
            return (
              <div key={r.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${yaAplicada ? 'border-success/30 bg-success-bg' : 'border-card-border'}`}>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.titulo}</p>
                  <p className="text-xs text-muted">{r.detalle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => aplicar(r.id)}
                  disabled={yaAplicada}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${yaAplicada ? 'border-success/30 text-success cursor-default' : 'border-border bg-surface text-foreground hover:bg-raised'}`}
                >
                  ✓ {yaAplicada ? 'Aplicada' : 'Aplicar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
