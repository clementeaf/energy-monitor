import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useCreateCnr } from '../../../hooks/queries/useCnrQuery';
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
  const createCnr = useCreateCnr();
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
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <PageHeader title="Ingreso CNR manual" />

      {/* Medidor y contexto */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Medidor y contexto</p>
        <select value={selectedMeterId} onChange={(e) => setSelectedMeterId(e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none">
          <option value="">Seleccionar medidor</option>
          {meters.map((m) => <option key={m.id} value={m.id}>{m.code} — {buildingMap.get(m.buildingId) ?? ''}</option>)}
        </select>
        {selectedMeter && <p className="mt-1 text-xs text-foreground">{selectedMeter.code} · {buildingMap.get(selectedMeter.buildingId) ?? ''}</p>}
        <p className="text-xs text-muted">• Ingreso CNR según norma de Consumos No Registrados</p>
      </div>

      {/* Datos del CNR */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Datos del CNR</p>
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <div><p className="text-xs text-muted">Período afectado (fecha/hora inicio – fin)</p><div className="flex gap-2"><input type="datetime-local" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none" /><input type="datetime-local" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none" /></div></div>
          <div><p className="text-xs text-muted">Valor real [kWh]</p><input type="number" step="0.01" value={valueKwh} onChange={(e) => setValueKwh(e.target.value)} placeholder="Lectura manual" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none" /></div>
          <div><p className="text-xs text-muted">Motivo del CNR</p><select value={motive} onChange={(e) => setMotive(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none">{CNR_MOTIVES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
        </form>
      </div>

      {/* Justificación y evidencia */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Justificación y evidencia</p>
        <div className="mt-2 space-y-2">
          <div><p className="text-xs text-muted">Justificación (texto libre)</p><textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} placeholder="Justificación detallada..." className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none" /></div>
          <div><p className="text-xs text-muted">Adjunto de evidencia</p><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="w-full text-xs text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-xs file:text-foreground" /></div>
        </div>
      </div>

      {/* Marcado del valor */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Marcado del valor</p>
        <div className="mt-1 space-y-0.5 text-xs text-foreground">
          <p>• Se marca 'dato manual — CNR' en todos los dashboards</p>
          <p>• Firma digital obligatoria</p>
        </div>
      </div>

      {/* Restricciones post-firma */}
      <div className="rounded-lg border border-blue-200 bg-info/10 px-3 py-2.5 text-xs text-info">
        <p className="font-semibold">Restricciones post-firma</p>
        <p className="mt-1">irreversible:</p>
        <p>• No se puede retroeditar</p>
        <p>• Solo Operacional puede marcar 'en revisión'</p>
        <p>• Auditoría: usuario, timestamp, valor anterior</p>
      </div>

      {submitted && <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">CNR registrado. Valor marcado como "dato manual — CNR".</div>}

      <div className="flex shrink-0 gap-2">
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} loading={createCnr.isPending} className="flex-1">Firmar CNR</Button>
        <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface">Cancelar</button>
      </div>
    </div>
  );
}
