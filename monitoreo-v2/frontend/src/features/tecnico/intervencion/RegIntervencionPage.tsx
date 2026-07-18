import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useCreateIntervention } from '../../../hooks/queries/useInterventionsQuery';
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
  const createIntervention = useCreateIntervention();
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
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <PageHeader title="5.4 Registro de intervención" description="Vista mobile-first — bitácora de intervención con firma digital e inmutabilidad" />

      {/* Orden asociada */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Orden asociada</p>
        {selectedMeter ? (
          <div className="mt-1 text-[11px] text-foreground">
            <p className="font-semibold">OT — Medidor {selectedMeter.code}</p>
            <p>• Cierre de intervención en terreno</p>
          </div>
        ) : <p className="mt-1 text-[11px] text-muted">Selecciona un medidor</p>}
        <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-19]</p>
      </div>

      {/* Bitácora de intervención */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Bitácora de intervención</p>
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
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

            <label className="flex items-center gap-2 text-[11px] text-foreground">
              <input type="checkbox" checked={requiresCnr} onChange={(e) => setRequiresCnr(e.target.checked)} className="rounded border-border" />
              Requiere CNR → pre-llena formulario de CNR
            </label>
        </form>
        <p className="mt-1 text-right text-[9px] text-subtle">[DAT-19, DAT-23]</p>
      </div>

      {/* Adjuntos y firma */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Adjuntos y firma</p>
        <div className="mt-2 space-y-1 text-[11px] text-foreground">
          <p>• Fotos máx. 5 (JPG/PNG) + documentos (PDF)</p>
          <p>• □ Requiere CNR → pre-llena formulario de CNR</p>
          <p>• Firma digital del técnico</p>
        </div>
        <p className="mt-1 text-right text-[9px] text-subtle">[DAT-19, DAT-23]</p>
      </div>

      {/* Inmutabilidad del registro */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] text-blue-800">
        <p className="font-semibold">Inmutabilidad del registro</p>
        <p className="mt-1">al firmar y guardar:</p>
        <p>• Timestamp del servidor + usuario + hash de integridad</p>
        <p>• No editable una vez firmado</p>
        <p className="mt-0.5 text-right text-[9px]">[DAT-19, CYB-10, DAT-14]</p>
      </div>

      {submitted && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          Intervención registrada correctamente.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex shrink-0 gap-2">
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} loading={createIntervention.isPending} className="flex-1">Firmar y guardar</Button>
        <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Cancelar</button>
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
