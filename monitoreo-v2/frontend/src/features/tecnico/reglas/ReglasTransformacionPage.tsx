import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';

const MEDIDOR_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'SN-4471', label: 'SN-4471' },
  { value: 'SN-3120', label: 'SN-3120' },
  { value: 'SN-2088', label: 'SN-2088' },
  { value: 'SN-5510', label: 'SN-5510' },
];

const TIPO_REGLA_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'escala', label: 'Escala' },
  { value: 'offset', label: 'Offset' },
  { value: 'interpolacion', label: 'Interpolación' },
  { value: 'validacion', label: 'Validación' },
];

const ESTADO_REGLA_OPTIONS = [
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
  { value: 'all', label: 'Todas' },
];

// Fallback change history shown until backend API exists.
const FALLBACK_HISTORY = [
  { ts: '2026-07-17 09:12:44', user: 'j.perez@pasa.cl', rule: 'SN-4471 · Factor escala', field: 'factor', prev: '1.000', next: '0.001' },
  { ts: '2026-07-15 14:35:09', user: 'c.molina@pasa.cl', rule: 'SN-5510 · Fórmula custom', field: 'formula', prev: 'raw × 1.00', next: 'raw × 1.02' },
  { ts: '2026-07-14 08:20:33', user: 'j.perez@pasa.cl', rule: 'SN-3120 · Conversión unidad', field: 'activa', prev: 'false', next: 'true' },
  { ts: '2026-07-10 16:45:58', user: 'admin@globepower.cl', rule: 'SN-2088 · Offset', field: 'offset', prev: '+0.0', next: '+0.5' },
];

export function ReglasTransformacionPage() {
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [testValue, setTestValue] = useState('48200');
  const [medidorFilter, setMedidorFilter] = useState('all');
  const [tipoReglaFilter, setTipoReglaFilter] = useState('all');
  const [estadoReglaFilter, setEstadoReglaFilter] = useState('active');

  // ponytail: placeholder rules until backend API exists
  const rules = [
    { id: 1, meter: 'SN-4471', type: 'Factor escala', input: 'Wh', output: 'kWh', active: true },
    { id: 2, meter: 'SN-3120', type: 'Conversión unidad', input: 'W', output: 'kW', active: true },
    { id: 3, meter: 'SN-2088', type: 'Offset', input: '+0.5', output: 'corregido', active: false },
    { id: 4, meter: 'SN-5510', type: 'Fórmula custom', input: 'raw × 1.02', output: 'calibrado', active: true },
  ];

  const sel = selectedRule != null ? rules.find((r) => r.id === selectedRule) : null;
  const transformedValue = useMemo(() => {
    const raw = parseFloat(testValue);
    if (isNaN(raw)) return '—';
    if (!sel || sel.id === 1) return `${(raw / 1000).toFixed(2)} kWh`;   // Wh → kWh
    if (sel.id === 2) return `${(raw / 1000).toFixed(3)} kW`;             // W → kW
    if (sel.id === 3) return `${(raw + 0.5).toFixed(1)} (corregido)`;    // offset +0.5
    if (sel.id === 4) return `${(raw * 1.02).toFixed(1)} (calibrado)`;   // raw × 1.02
    return `${(raw / 1000).toFixed(2)} kWh`;
  }, [testValue, sel]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader title="5.7 Reglas de Transformación" description="Configuración de reglas de conversión por medidor — simulador en tiempo real (desktop)" />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          Medidor
          <DropdownSelect options={MEDIDOR_FILTER_OPTIONS} value={medidorFilter} onChange={setMedidorFilter} />
        </span>
        <span className="flex items-center gap-1">
          Tipo de regla
          <DropdownSelect options={TIPO_REGLA_OPTIONS} value={tipoReglaFilter} onChange={setTipoReglaFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado
          <DropdownSelect options={ESTADO_REGLA_OPTIONS} value={estadoReglaFilter} onChange={setEstadoReglaFilter} />
        </span>
      </div>

      {/* Row 1: Rules table (left) + Edit form + Simulator + Impact (right) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Reglas activas por medidor */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Reglas activas por medidor</p>
          <p className="shrink-0 text-[11px] text-muted">entrada esperada → salida resultante</p>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Medidor</th>
                  <th className="px-2 py-1.5">Tipo de regla</th>
                  <th className="px-2 py-1.5">Entrada</th>
                  <th className="px-2 py-1.5">Salida</th>
                  <th className="px-2 py-1.5 text-center">Estado</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {rules.map((rule, i) => (
                    <tr
                      key={rule.id}
                      className={`animate-fade-in cursor-pointer transition-colors hover:bg-surface ${selectedRule === rule.id ? 'bg-surface' : ''}`}
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => setSelectedRule(selectedRule === rule.id ? null : rule.id)}
                    >
                      <td className="px-2 py-1.5 font-medium text-foreground">{rule.meter}</td>
                      <td className="px-2 py-1.5 text-muted">{rule.type}</td>
                      <td className="px-2 py-1.5 text-muted">{rule.input}</td>
                      <td className="px-2 py-1.5 text-muted">{rule.output}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rule.active ? 'activa' : 'inactiva'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Edit form + Simulator + Impact */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {/* Alta / edición de regla */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Alta / edición de regla</p>
            <div className="mt-2 space-y-2 text-[11px]">
              <div><p className="text-[11px] text-muted">Medidor al que aplica</p><input readOnly value={sel?.meter ?? ''} placeholder="Seleccionar..." className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Tipo (factor / unidad / offset / fórmula)</p><input readOnly value={sel?.type ?? ''} placeholder="Seleccionar..." className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Fórmula personalizada (expresión validada)</p><input readOnly value={sel?.type === 'Fórmula custom' ? 'raw × 1.02' : ''} placeholder="ej: value / 1000" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
            </div>
          </div>

          {/* Simulador de valor de prueba */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Simulador de valor de prueba</p>
            <p className="text-[11px] text-muted">en tiempo real, antes de guardar</p>
            <div className="mt-2 space-y-1 text-[11px] text-foreground">
              <p>• Valor raw: <input value={testValue} onChange={(e) => setTestValue(e.target.value)} className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-center outline-none" /> Wh</p>
              <p>• → Valor transformado: <span className="font-semibold">{transformedValue}</span></p>
              <p className="text-muted">• Se recalcula al editar la regla</p>
            </div>
          </div>

          {/* Indicador de impacto */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Indicador de impacto</p>
            <p className="text-[11px] text-muted">al editar sobre datos históricos</p>
            <div className="mt-2 space-y-0.5 text-[11px] text-foreground">
              <p>• 12 dashboards · 5 exports · 3 alertas afectadas</p>
              <p>• Requiere confirmación explícita antes de guardar</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={!sel} className="flex-1">Guardar regla</Button>
            <button type="button" disabled={!sel} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Simular</button>
            <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Row 2: Historial de cambios de reglas */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Historial de cambios de reglas (inmutable)</p>
        <p className="shrink-0 text-[11px] text-muted">regla · campo · valor anterior → nuevo · usuario · timestamp</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">Timestamp</th>
                <th className="px-2 py-1.5">Usuario</th>
                <th className="px-2 py-1.5">Regla</th>
                <th className="px-2 py-1.5">Campo</th>
                <th className="px-2 py-1.5">Valor anterior</th>
                <th className="px-2 py-1.5">Valor nuevo</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {FALLBACK_HISTORY.map((entry, i) => (
                  <tr key={i} className="animate-fade-in text-muted" style={{ animationDelay: `${i * 25}ms` }}>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-foreground">{entry.ts}</td>
                    <td className="px-2 py-1.5">{entry.user}</td>
                    <td className="px-2 py-1.5">{entry.rule}</td>
                    <td className="px-2 py-1.5">{entry.field}</td>
                    <td className="px-2 py-1.5 text-red-400 line-through">{entry.prev}</td>
                    <td className="px-2 py-1.5 text-emerald-600 font-medium">{entry.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
