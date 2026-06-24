import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';

/* ── Intervention types ── */

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
  const [meterId, setMeterId] = useState('');
  const [type, setType] = useState('inspeccion');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('solucionado');
  const [requiresCnr, setRequiresCnr] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = meterId.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ponytail: POST to intervention API when backend module ships
    setSubmitted(true);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Registro de Intervención" eyebrow="Intervención" />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Form */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <form onSubmit={handleSubmit} className="panel max-w-xl space-y-4 p-4">
            <FormField label="Medidor / activo">
              <input
                value={meterId}
                onChange={(e) => setMeterId(e.target.value)}
                placeholder="Serial o nombre del medidor"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
              />
            </FormField>

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
