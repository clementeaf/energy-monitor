import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';

export function ReglasTransformacionPage() {
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [testValue, setTestValue] = useState('48200');

  // ponytail: placeholder rules until backend API exists
  const rules = [
    { id: 1, meter: 'SN-4471', type: 'Factor escala', input: 'Wh', output: 'kWh', active: true },
    { id: 2, meter: 'SN-3120', type: 'Conversión unidad', input: 'W', output: 'kW', active: true },
    { id: 3, meter: 'SN-2088', type: 'Offset', input: '+0.5', output: 'corregido', active: false },
    { id: 4, meter: 'SN-5510', type: 'Fórmula custom', input: 'raw × 1.02', output: 'calibrado', active: true },
  ];

  const sel = selectedRule != null ? rules.find((r) => r.id === selectedRule) : null;
  const transformedValue = testValue ? (parseFloat(testValue) / 1000).toFixed(1) : '—';

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader title="5.7 Reglas de Transformación" description="Configuración de reglas de conversión por medidor — simulador en tiempo real (desktop)" />

      {/* Row 1: Rules table (left) + Edit form + Simulator + Impact (right) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Reglas activas por medidor */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Reglas activas por medidor</p>
          <p className="shrink-0 text-[9px] text-subtle">entrada esperada → salida resultante</p>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
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
          <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[INT-05, DAT-22, DAT-23]</p>
        </div>

        {/* Right: Edit form + Simulator + Impact */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {/* Alta / edición de regla */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Alta / edición de regla</p>
            <div className="mt-2 space-y-2 text-[11px]">
              <div><p className="text-[9px] text-subtle">Medidor al que aplica</p><input readOnly value={sel?.meter ?? ''} placeholder="Seleccionar..." className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[9px] text-subtle">Tipo (factor / unidad / offset / fórmula)</p><input readOnly value={sel?.type ?? ''} placeholder="Seleccionar..." className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[9px] text-subtle">Fórmula personalizada (expresión validada)</p><input readOnly value={sel?.type === 'Fórmula custom' ? 'raw × 1.02' : ''} placeholder="ej: value / 1000" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
            </div>
            <p className="mt-1 text-right text-[9px] text-subtle">[INT-05, DAT-22]</p>
          </div>

          {/* Simulador de valor de prueba */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Simulador de valor de prueba</p>
            <p className="text-[9px] text-subtle">en tiempo real, antes de guardar</p>
            <div className="mt-2 space-y-1 text-[11px] text-foreground">
              <p>• Valor raw: <input value={testValue} onChange={(e) => setTestValue(e.target.value)} className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-center outline-none" /> Wh</p>
              <p>• → Valor transformado: <span className="font-semibold">{transformedValue} kWh</span></p>
              <p className="text-muted">• Se recalcula al editar la regla</p>
            </div>
            <p className="mt-1 text-right text-[9px] text-subtle">[INT-05, DAT-22]</p>
          </div>

          {/* Indicador de impacto */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Indicador de impacto</p>
            <p className="text-[9px] text-subtle">al editar sobre datos históricos</p>
            <div className="mt-2 space-y-0.5 text-[11px] text-foreground">
              <p>• 12 dashboards · 5 exports · 3 alertas afectadas</p>
              <p>• Requiere confirmación explícita antes de guardar</p>
            </div>
            <p className="mt-1 text-right text-[9px] text-subtle">[INT-05, DAT-22, DAT-19]</p>
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
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Historial de cambios de reglas (inmutable)</p>
        <p className="shrink-0 text-[9px] text-subtle">regla · campo · valor anterior → nuevo · usuario · timestamp</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
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
                <tr><td colSpan={6} className="px-2 py-6 text-center text-muted">Sin cambios registrados.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-23, DAT-14, CYB-10]</p>
      </div>
    </div>
  );
}
