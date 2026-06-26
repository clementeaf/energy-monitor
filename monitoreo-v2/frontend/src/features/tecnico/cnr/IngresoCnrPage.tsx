import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';

/* ── CNR motives ── */

const CNR_MOTIVES = [
  { key: 'falla_com', label: 'Falla de comunicación' },
  { key: 'mantencion', label: 'Mantenimiento programado' },
  { key: 'reemplazo', label: 'Reemplazo de medidor' },
  { key: 'otro', label: 'Otro' },
];

/* ── LocalStorage persistence ── */
// ponytail: localStorage until backend CNR module ships

const STORAGE_KEY = 'cnr_entries';

interface CnrEntry {
  id: string;
  meterId: string;
  meterName: string;
  periodStart: string;
  periodEnd: string;
  valueKwh: number;
  motive: string;
  justification: string;
  timestamp: string;
}

function loadHistory(): CnrEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveCnrEntry(entry: CnrEntry): CnrEntry[] {
  const history = loadHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 30);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* noop in test env */ }
  return trimmed;
}

/* ── Page ── */

export function IngresoCnrPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [valueKwh, setValueKwh] = useState('');
  const [motive, setMotive] = useState('falla_com');
  const [justification, setJustification] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const meters = metersQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);

  const canSubmit = selectedMeterId.length > 0
    && periodStart.length > 0
    && periodEnd.length > 0
    && valueKwh.length > 0
    && justification.trim().length >= 20;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedMeter) return;

    const entry: CnrEntry = {
      id: `CNR-${Date.now().toString(36).toUpperCase()}`,
      meterId: selectedMeterId,
      meterName: selectedMeter.name,
      periodStart,
      periodEnd,
      valueKwh: parseFloat(valueKwh),
      motive: CNR_MOTIVES.find((m) => m.key === motive)?.label ?? motive,
      justification: justification.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = saveCnrEntry(entry);
    setHistory(updated);
    setSubmitted(true);
    setSelectedMeterId('');
    setPeriodStart('');
    setPeriodEnd('');
    setValueKwh('');
    setJustification('');

    setTimeout(() => setSubmitted(false), 3000);
  }, [canSubmit, selectedMeter, selectedMeterId, periodStart, periodEnd, valueKwh, motive, justification]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Ingreso CNR Manual" eyebrow="CNR" />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Form */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <form onSubmit={handleSubmit} className="panel max-w-xl space-y-4 p-4">
            <FormField label="Medidor">
              <select
                value={selectedMeterId}
                onChange={(e) => setSelectedMeterId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              >
                <option value="">Seleccionar medidor</option>
                {meters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) — {buildingMap.get(m.buildingId) ?? ''}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedMeter && (
              <div className="rounded-md bg-surface px-3 py-2 text-[12px] text-muted">
                <span className="font-medium">Medidor:</span> {selectedMeter.name} · <span className="font-medium">Código:</span> {selectedMeter.code}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Inicio período">
                <input
                  type="datetime-local"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
                />
              </FormField>
              <FormField label="Fin período">
                <input
                  type="datetime-local"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
                />
              </FormField>
            </div>

            <FormField label="Valor real [kWh]">
              <input
                type="number"
                step="0.01"
                value={valueKwh}
                onChange={(e) => setValueKwh(e.target.value)}
                placeholder="Lectura manual o respaldo"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              />
            </FormField>

            <FormField label="Motivo del CNR">
              <select
                value={motive}
                onChange={(e) => setMotive(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              >
                {CNR_MOTIVES.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Justificación (mín. 20 caracteres)">
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Justificación detallada del cambio..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              />
              <p className="mt-1 text-[10px] text-muted">{justification.length}/20 caracteres mínimo</p>
            </FormField>

            {submitted && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                CNR registrado. Valor marcado como "dato manual — CNR".
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full">
              Registrar CNR
            </Button>
          </form>
        </div>

        {/* History panel */}
        <div className="hidden w-80 shrink-0 flex-col overflow-hidden lg:flex">
          <div className="panel flex min-h-0 flex-1 flex-col p-4">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
              Historial CNR ({history.length})
            </h3>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {history.length === 0 && (
                <p className="text-[12px] text-muted">Sin CNR registrados.</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{h.id}</span>
                    <span className="text-[10px] text-muted">{new Date(h.timestamp).toLocaleDateString('es-CL')}</span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-foreground">{h.meterName}</p>
                  <p className="text-[11px] text-muted">{h.motive} · {h.valueKwh} kWh</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted">{h.justification}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}
