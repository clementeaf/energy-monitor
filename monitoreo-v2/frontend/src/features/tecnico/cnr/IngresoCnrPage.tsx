import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';

/* ── CNR motives ── */

const CNR_MOTIVES = [
  { key: 'falla_com', label: 'Falla de comunicación' },
  { key: 'mantencion', label: 'Mantenimiento programado' },
  { key: 'reemplazo', label: 'Reemplazo de medidor' },
  { key: 'otro', label: 'Otro' },
];

/* ── Page ── */

export function IngresoCnrPage() {
  const [meterId, setMeterId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [valueKwh, setValueKwh] = useState('');
  const [motive, setMotive] = useState('falla_com');
  const [justification, setJustification] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = meterId.trim().length > 0
    && periodStart.length > 0
    && periodEnd.length > 0
    && valueKwh.length > 0
    && justification.trim().length >= 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ponytail: POST to CNR API when backend module ships
    setSubmitted(true);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Ingreso CNR Manual" eyebrow="CNR" />

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="panel max-w-xl space-y-4 p-4">
          <FormField label="Medidor">
            <input
              value={meterId}
              onChange={(e) => setMeterId(e.target.value)}
              placeholder="Serial del medidor"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
            />
          </FormField>

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
