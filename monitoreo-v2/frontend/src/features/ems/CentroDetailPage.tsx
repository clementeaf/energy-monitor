import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { LoadCurveChart } from './LoadCurveChart';
import { formatDateTime, formatNumber } from './format';
import { StatusBadge } from './StatusBadge';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { onRowKeyDown } from './table';
import { useEmsFleet, useLoadCurves, type LoadRange } from './useEmsFleet';

type Tab = 'resumen' | 'consumo' | 'remarcadores';

const RANGE_LABELS: Record<LoadRange, string> = { hoy: 'Hoy', '7dias': '7 días', '30dias': '30 días' };
const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised';

export function CentroDetailPage() {
  const { centroId = '' } = useParams<{ centroId: string }>();
  const navigate = useNavigate();
  const fleet = useEmsFleet();
  const [tab, setTab] = useState<Tab>('resumen');
  const [range, setRange] = useState<LoadRange>('hoy');
  const curve = useLoadCurves('hoy');
  const rangeCurve = useLoadCurves(range);
  const agregarRegla = useAppStore((s) => s.agregarRegla);
  const showToast = useToastStore((s) => s.showToast);
  const centro = fleet.centros.find((c) => c.id === centroId);
  const meters = fleet.remarcadores.filter((r) => r.centroId === centroId);

  const crearAlerta = (nombre: string) => {
    agregarRegla({ nombre: `Umbral de consumo · ${nombre}`, tipo: 'Umbral', aplicaA: nombre, notifica: 'Correo + app', activa: true });
    navigate('/alertas');
    showToast(`Regla creada para ${nombre}`);
  };
  const tabs: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'consumo', label: 'Consumo' },
    { key: 'remarcadores', label: `Remarcadores (${meters.length})` },
  ];

  return (
    <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
      {centro ? (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={() => navigate('/centros')} className="flex items-center gap-1 text-xs text-muted hover:text-foreground">
                ← Volver a Centros
              </button>
              <h1 className="mt-1 text-lg font-bold text-foreground">{centro.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <StatusBadge estado={centro.estado} />
                <Tag>{centro.code}</Tag>
                {centro.address && <Tag>{centro.address}</Tag>}
                {centro.superficie && <Tag>{formatNumber(centro.superficie)} m²</Tag>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => showToast('Exportando la ficha del centro…')} className={SECONDARY_BUTTON}>↓ Exportar</button>
              <button type="button" onClick={() => navigate('/margenes')} className={SECONDARY_BUTTON}>Ver en Márgenes</button>
              <button type="button" onClick={() => crearAlerta(centro.name)} className="rounded-lg bg-card-fg px-3 py-2 text-xs font-medium text-card hover:opacity-90">Crear alerta</button>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Consumo del mes" value={formatNumber(centro.consumoMesKwh / 1000, 1)} unit="MWh" sub="Mes en curso" />
            <KpiCard label="Costo de compra" value="—" sub="Sin tarifas cargadas" />
            <KpiCard label="Precio de venta" value="—" sub="Sin tarifas cargadas" />
            <KpiCard label="Margen del periodo" value="—" sub="Sin tarifas cargadas" />
          </div>

          <div role="tablist" className="flex shrink-0 gap-1 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium ${tab === t.key ? 'border-accent text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
          <div className="grid shrink-0 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-semibold text-card-fg">Curva de carga · hoy</h2>
              <p className="text-xs text-card-muted">{centro.name} · demanda total por hora</p>
              <QueryStateView phase={curve.phase} error={null} variant="widget">
                <LoadCurveChart series={[{ label: 'Potencia (kW)', color: 'var(--color-accent)', points: curve.curves.get(centro.id) ?? [] }]} filled />
              </QueryStateView>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-2">
              <h2 className="text-sm font-semibold text-card-fg">Ficha del centro</h2>
              <div className="mt-2 space-y-2">
                <FichaRow label="Código" value={centro.code} />
                <FichaRow label="Dirección" value={centro.address ?? '—'} />
                <FichaRow label="Superficie" value={centro.superficie ? `${formatNumber(centro.superficie)} m²` : '—'} />
                <FichaRow label="Intensidad" value={centro.intensidadKwhM2 === null ? '—' : `${formatNumber(centro.intensidadKwhM2, 1)} kWh/m²`} />
                <FichaRow label="Remarcadores" value={String(meters.length)} />
                <FichaRow label="Conectados" value={String(meters.filter((m) => m.estado === 'conectado').length)} />
              </div>
            </div>
          </div>

          )}

          {tab === 'consumo' && (
            <div className="shrink-0 rounded-xl border border-card-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-card-fg">Consumo de {centro.name}</h2>
                  <p className="text-xs text-card-muted">Serie del período seleccionado</p>
                </div>
                <div role="tablist" aria-label="Período" className="flex rounded-lg border border-border">
                  {(Object.keys(RANGE_LABELS) as LoadRange[]).map((key) => (
                    <button key={key} type="button" role="tab" aria-selected={range === key} onClick={() => setRange(key)} className={`px-3 py-1.5 text-xs font-medium ${range === key ? 'bg-card-fg text-card' : 'text-muted hover:bg-surface'}`}>
                      {RANGE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
              <QueryStateView phase={rangeCurve.phase} error={null} variant="widget">
                <LoadCurveChart series={[{ label: 'Potencia (kW)', color: 'var(--color-info)', points: rangeCurve.curves.get(centro.id) ?? [] }]} filled />
              </QueryStateView>
            </div>
          )}

          {tab === 'remarcadores' && (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-card-border bg-card">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-card-border">
                    <Th>ID</Th>
                    <Th>Nombre</Th>
                    <Th>Potencia</Th>
                    <Th>Última lectura</Th>
                    <Th>Estado</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {meters.map((m) => (
                    <tr key={m.id} tabIndex={0} className="cursor-pointer hover:bg-surface" onClick={() => navigate(`/remarcadores/${m.id}`)} onKeyDown={onRowKeyDown(() => navigate(`/remarcadores/${m.id}`))}>
                      <td className="px-5 py-3 font-mono text-sm font-medium text-foreground">{m.code}</td>
                      <td className="px-5 py-3 text-sm text-muted">{m.name}</td>
                      <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{m.potenciaKw === null ? '—' : `${formatNumber(m.potenciaKw, 1)} kW`}</td>
                      <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{formatDateTime(m.ultimaLectura)}</td>
                      <td className="px-5 py-3"><StatusBadge estado={m.estado} /></td>
                      <td className="px-5 py-3 text-muted">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">Centro no encontrado.</div>
      )}
    </QueryStateView>
  );
}

function Tag({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">{children}</span>;
}

function KpiCard({ label, value, unit, sub }: Readonly<{ label: string; value: string; unit?: string; sub?: string }>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}{unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function FichaRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between border-b border-card-border pb-2 last:border-0">
      <span className="text-xs text-card-muted">{label}</span>
      <span className="font-mono text-xs font-medium text-card-fg">{value}</span>
    </div>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
