import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useInterventionsQuery, useCreateIntervention } from '../../../hooks/queries/useInterventionsQuery';
import type { InterventionType, InterventionResult } from '../../../types/intervention';

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

/* ── Page ── */

export function RegIntervencionPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [type, setType] = useState('inspeccion');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('solucionado');
  const [requiresCnr, setRequiresCnr] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const interventionsQuery = useInterventionsQuery();
  const createIntervention = useCreateIntervention();
  const history = interventionsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);
  const canSubmit = selectedMeterId.length > 0 && description.trim().length > 0;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedMeter) return;

    createIntervention.mutate({
      meterId: selectedMeterId,
      buildingId: selectedMeter.buildingId,
      interventionType: type as InterventionType,
      description: description.trim(),
      result: result as InterventionResult,
      requiresCnr,
    }, {
      onSuccess: () => {
        setSubmitted(true);
        setDescription('');
        setSelectedMeterId('');
        setRequiresCnr(false);
        setTimeout(() => setSubmitted(false), 3000);
      },
    });
  }, [canSubmit, selectedMeter, selectedMeterId, type, description, result, requiresCnr, createIntervention]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Registro de Intervención" eyebrow="Intervención" />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Form */}
        <div className="flex w-full max-w-xl shrink-0 flex-col overflow-y-auto">
          <form onSubmit={handleSubmit} className="panel space-y-4 p-4">
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

            <FormField label="Adjuntos (fotos JPG/PNG, documentos PDF)">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                className="w-full text-[12px] text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-[11px] file:text-foreground"
                onChange={() => { /* ponytail: handle file upload when backend available */ }}
              />
              <p className="mt-1 text-[10px] text-muted">Máx 5 archivos.</p>
            </FormField>

            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input type="checkbox" checked={false} disabled className="rounded border-border" />
              Firma digital del técnico
              <span className="text-[10px] text-muted">(requiere backend)</span>
            </label>

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
        <div className="hidden w-full max-w-sm shrink-0 flex-col overflow-hidden lg:flex">
          <div className="panel flex min-h-0 flex-1 flex-col p-4">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
              Historial ({history.length})
            </h3>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {history.length === 0 && (
                <p className="text-[12px] text-muted">Sin intervenciones registradas.</p>
              )}
              {history.slice(0, 30).map((h) => (
                <div key={h.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{h.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-muted">{new Date(h.created_at).toLocaleDateString('es-CL')}</span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-foreground">{h.meter_id.slice(0, 8)}</p>
                  <p className="text-[11px] text-muted">{h.intervention_type} · {h.result}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted">{h.description}</p>
                  {h.requires_cnr && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">CNR</span>
                  )}
                  {h.integrity_hash && (
                    <span className="mt-1 block font-mono text-[9px] text-muted">hash: {h.integrity_hash}</span>
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
