import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useCnrQuery, useCreateCnr } from '../../../hooks/queries/useCnrQuery';
import type { CnrMotivo } from '../../../types/cnr';

/* ── CNR motives ── */

const CNR_MOTIVES: { key: CnrMotivo; label: string }[] = [
  { key: 'comm_failure', label: 'Falla de comunicación' },
  { key: 'maintenance', label: 'Mantenimiento programado' },
  { key: 'replacement', label: 'Reemplazo de medidor' },
  { key: 'other', label: 'Otro' },
];

/* ── Page ── */

export function IngresoCnrPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [valueKwh, setValueKwh] = useState('');
  const [motive, setMotive] = useState('falla_com');
  const [justification, setJustification] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const cnrQuery = useCnrQuery();
  const createCnr = useCreateCnr();
  const history = cnrQuery.data ?? [];
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

    createCnr.mutate({
      meterId: selectedMeterId,
      buildingId: selectedMeter.buildingId,
      periodStart: new Date(periodStart).toISOString(),
      periodEnd: new Date(periodEnd).toISOString(),
      valueKwh: parseFloat(valueKwh),
      motivo: motive as CnrMotivo,
      justification: justification.trim(),
    }, {
      onSuccess: () => {
        setSubmitted(true);
        setSelectedMeterId('');
        setPeriodStart('');
        setPeriodEnd('');
        setValueKwh('');
        setJustification('');
        setTimeout(() => setSubmitted(false), 3000);
      },
    });
  }, [canSubmit, selectedMeter, selectedMeterId, periodStart, periodEnd, valueKwh, motive, justification, createCnr]);

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

            <FormField label="Evidencia (foto o documento)">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="w-full text-[12px] text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-[11px] file:text-foreground"
                onChange={() => { /* ponytail: handle upload when backend available */ }}
              />
            </FormField>

            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input type="checkbox" checked={false} disabled className="rounded border-border" />
              Firma digital del técnico
              <span className="text-[10px] text-muted">(requiere backend)</span>
            </label>

            <p className="text-[10px] text-muted">
              Una vez firmado, el registro no podrá ser retroeditado — solo "en revisión" por perfil operacional.
              Pista auditoría: usuario, timestamp y valor anterior quedan registrados.
            </p>

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
              {history.slice(0, 30).map((h) => (
                <div key={h.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{h.id.slice(0, 8)}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${h.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : h.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{h.status}</span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-foreground">{h.meter_id.slice(0, 8)}</p>
                  <p className="text-[11px] text-muted">{h.motivo} · {h.value_kwh != null ? `${h.value_kwh} kWh` : '—'}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{new Date(h.created_at).toLocaleDateString('es-CL')}</p>
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
