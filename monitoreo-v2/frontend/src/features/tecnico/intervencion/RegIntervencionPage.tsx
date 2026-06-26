import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';

/* ── Types ── */

interface SelectOption { key: string; label: string }

const INTERVENTION_TYPES: SelectOption[] = [
  { key: 'inspeccion', label: 'Inspección' },
  { key: 'reemplazo', label: 'Reemplazo' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'reparacion', label: 'Reparación' },
  { key: 'instalacion', label: 'Instalación' },
  { key: 'otra', label: 'Otra' },
];

const RESULT_OPTIONS: SelectOption[] = [
  { key: 'solucionado', label: 'Solucionado' },
  { key: 'pendiente_piezas', label: 'Pendiente piezas' },
  { key: 'escalacion', label: 'Requiere escalación' },
];

/* ── LocalStorage persistence ── */
// ponytail: localStorage until backend intervention module ships

const STORAGE_KEY = 'interventions';

interface InterventionRecord {
  id: string;
  meterId: string;
  meterName: string;
  type: string;
  description: string;
  result: string;
  requiresCnr: boolean;
  timestamp: string;
}

function loadHistory(): InterventionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveIntervention(record: InterventionRecord): InterventionRecord[] {
  const history = loadHistory();
  history.unshift(record);
  const trimmed = history.slice(0, 30);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* noop in test env */ }
  return trimmed;
}

/* ── Page ── */

export function RegIntervencionPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [type, setType] = useState('inspeccion');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('solucionado');
  const [requiresCnr, setRequiresCnr] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const meters = metersQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);
  const canSubmit = selectedMeterId.length > 0 && description.trim().length > 0;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedMeter) return;

    const record: InterventionRecord = {
      id: `INT-${Date.now().toString(36).toUpperCase()}`,
      meterId: selectedMeterId,
      meterName: selectedMeter.name,
      type,
      description: description.trim(),
      result,
      requiresCnr,
      timestamp: new Date().toISOString(),
    };

    const updated = saveIntervention(record);
    setHistory(updated);
    setSubmitted(true);
    setDescription('');
    setSelectedMeterId('');
    setRequiresCnr(false);

    setTimeout(() => setSubmitted(false), 3000);
  }, [canSubmit, selectedMeter, selectedMeterId, type, description, result, requiresCnr]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Registro de Intervención" eyebrow="Intervención" />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Form */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <form onSubmit={handleSubmit} className="panel max-w-xl space-y-4 p-4">
            <FormField label="Medidor / activo">
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
                <span className="font-medium">Medidor:</span> {selectedMeter.name} · <span className="font-medium">Código:</span> {selectedMeter.code} · <span className="font-medium">Tipo:</span> {selectedMeter.meterType}
              </div>
            )}

            <FormField label="Tipo de intervención">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              >
                {INTERVENTION_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Descripción detallada">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Descripción del trabajo realizado..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              />
            </FormField>

            <FormField label="Resultado">
              <select
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              >
                {RESULT_OPTIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </FormField>

            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input
                type="checkbox"
                checked={requiresCnr}
                onChange={(e) => setRequiresCnr(e.target.checked)}
                className="rounded border-border"
              />
              Requiere CNR
            </label>

            {submitted && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                Intervención registrada correctamente.
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full">
              Registrar intervención
            </Button>
          </form>
        </div>

        {/* History panel */}
        <div className="hidden w-80 shrink-0 flex-col overflow-hidden lg:flex">
          <div className="panel flex min-h-0 flex-1 flex-col p-4">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
              Historial ({history.length})
            </h3>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {history.length === 0 && (
                <p className="text-[12px] text-muted">Sin intervenciones registradas.</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{h.id}</span>
                    <span className="text-[10px] text-muted">{new Date(h.timestamp).toLocaleDateString('es-CL')}</span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-foreground">{h.meterName}</p>
                  <p className="text-[11px] text-muted">{h.type} · {h.result}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted">{h.description}</p>
                  {h.requiresCnr && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">CNR</span>
                  )}
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
