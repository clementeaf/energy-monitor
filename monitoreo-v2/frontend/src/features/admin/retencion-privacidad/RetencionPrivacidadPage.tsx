import { useState } from 'react';

/* ── Placeholder data ── */

const RETENTION_POLICIES = [
  { politica: 'Lecturas energéticas', tipo: 'Medición', pais: 'CL', retencion: '5 años', accion: 'archivar', estado: 'activa' },
  { politica: 'Datos de usuario', tipo: 'PII', pais: 'CL / CO', retencion: '2 años inact.', accion: 'anonimizar', estado: 'activa' },
  { politica: 'Audit logs', tipo: 'Seguridad', pais: 'CL', retencion: '2 años', accion: 'eliminar', estado: 'activa' },
  { politica: 'Tokens de acceso', tipo: 'Auth', pais: 'Global', retencion: '30 días', accion: 'eliminar', estado: 'activa' },
  { politica: 'Facturas', tipo: 'Facturación', pais: 'CL', retencion: '7 años', accion: 'archivar', estado: 'activa' },
  { politica: 'CNR records', tipo: 'Regulatorio', pais: 'CL', retencion: '10 años', accion: 'archivar', estado: 'activa' },
];

const EXECUTION_QUEUE = [
  { tipo: 'Tokens de acceso', registros: 14820, accion: 'eliminar', fechaLimite: '2026-07-17', responsable: 'cron-daily' },
  { tipo: 'Datos usuario inactivos', registros: 3, accion: 'anonimizar', fechaLimite: '2026-07-20', responsable: 'c.falcone' },
  { tipo: 'Audit logs > 2 años', registros: 0, accion: 'eliminar', fechaLimite: '2026-08-01', responsable: 'cron-daily' },
];

const EXEC_HISTORY = [
  { politica: 'Tokens acceso', fecha: '2026-07-16 03:00', registros: 12440, accion: 'eliminar', aprobo: 'cron-daily' },
  { politica: 'Datos usuario', fecha: '2026-06-01 03:05', registros: 2, accion: 'anonimizar', aprobo: 'c.falcone' },
  { politica: 'Tokens acceso', fecha: '2026-07-15 03:00', registros: 11380, accion: 'eliminar', aprobo: 'cron-daily' },
  { politica: 'Audit logs', fecha: '2026-05-01 03:10', registros: 84200, accion: 'eliminar', aprobo: 'c.falcone' },
];

const PROCESSES = ['Medición', 'Facturación', 'Alertas', 'Auditoría', 'IoT', 'Exportación'];
const FIELDS = ['email', 'nombre', 'teléfono', 'RUT', 'edificio', 'lectura'];
const HEATMAP: Record<string, Record<string, string>> = {
  'Medición':     { email: 'no-req', nombre: 'no-req', teléfono: 'no-req', RUT: 'no-req', edificio: 'obligatorio', lectura: 'obligatorio' },
  'Facturación':  { email: 'obligatorio', nombre: 'obligatorio', teléfono: 'opcional', RUT: 'obligatorio', edificio: 'obligatorio', lectura: 'obligatorio' },
  'Alertas':      { email: 'obligatorio', nombre: 'opcional', teléfono: 'opcional', RUT: 'no-req', edificio: 'obligatorio', lectura: 'obligatorio' },
  'Auditoría':    { email: 'obligatorio', nombre: 'obligatorio', teléfono: 'no-req', RUT: 'opcional', edificio: 'no-req', lectura: 'no-req' },
  'IoT':          { email: 'no-req', nombre: 'no-req', teléfono: 'no-req', RUT: 'no-req', edificio: 'obligatorio', lectura: 'obligatorio' },
  'Exportación':  { email: 'obligatorio', nombre: 'obligatorio', teléfono: 'opcional', RUT: 'obligatorio', edificio: 'obligatorio', lectura: 'obligatorio' },
};

const HEATMAP_COLOR: Record<string, string> = {
  'obligatorio': 'bg-info text-background',
  'opcional': 'bg-info/20 text-info',
  'no-req': 'bg-surface text-subtle',
  'no-permitido': 'bg-danger/10 text-danger',
};

const ACCION_BADGE: Record<string, string> = {
  'archivar': 'bg-info/10 text-info',
  'anonimizar': 'bg-purple-100 text-purple-700',
  'eliminar': 'bg-danger/10 text-danger',
};

/* ── Page ── */

export function RetencionPrivacidadPage() {
  const [expandedPolicy, setExpandedPolicy] = useState<number | null>(null);
  const [form, setForm] = useState({
    tipo: '', pais: '', retencionActiva: '', retencionArchivo: '',
    accion: 'anonimizar', baseLegal: '', finalidad: '', justificacion: '',
  });

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold text-foreground">7.9 Retención y Privacidad</h1>
        <p className="text-xs text-muted">Políticas de retención de datos, minimización por proceso y ejecución de borrado auditado</p>
      </div>

      {/* Row 1 */}
      <div className="flex gap-3">
        {/* Catálogo */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-sm font-semibold text-foreground">Catálogo de políticas de retención</h3>
          <p className="mb-2 text-xs text-muted">acción al vencimiento · fila expandible</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Política</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">País</th>
                  <th className="px-2 py-1.5">Retención</th>
                  <th className="px-2 py-1.5">Acción</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RETENTION_POLICIES.map((p, i) => (
                  <tr
                    key={i}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setExpandedPolicy(expandedPolicy === i ? null : i)}
                  >
                    <td className="px-2 py-1.5 font-medium text-foreground">{p.politica}</td>
                    <td className="px-2 py-1.5 text-muted">{p.tipo}</td>
                    <td className="px-2 py-1.5 text-muted">{p.pais}</td>
                    <td className="px-2 py-1.5 text-muted">{p.retencion}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${ACCION_BADGE[p.accion]}`}>{p.accion}</span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-foreground">{expandedPolicy === i ? '▲' : '▼'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulario nueva política */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-sm font-semibold text-foreground">Formulario de nueva política</h3>
          <p className="mb-2 text-xs text-muted">minimización de datos por proceso, país y finalidad</p>
          <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-muted">Tipo de dato</label>
                <input className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" placeholder="ej. PII" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-muted">País</label>
                <select className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })}>
                  <option value="">—</option>
                  <option value="CL">Chile</option>
                  <option value="CO">Colombia</option>
                  <option value="PE">Perú</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-muted">Retención activa [años]</label>
                <input className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" placeholder="2" value={form.retencionActiva} onChange={(e) => setForm({ ...form, retencionActiva: e.target.value })} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-muted">Retención archivo</label>
                <input className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" placeholder="5 años" value={form.retencionArchivo} onChange={(e) => setForm({ ...form, retencionArchivo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-muted">Acción al vencimiento</label>
              <select className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" value={form.accion} onChange={(e) => setForm({ ...form, accion: e.target.value })}>
                <option value="anonimizar">Anonimizar</option>
                <option value="eliminar">Eliminar</option>
                <option value="archivar">Archivar</option>
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-muted">Base legal</label>
              <input className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" placeholder="Ley 21.719 Art. 8" value={form.baseLegal} onChange={(e) => setForm({ ...form, baseLegal: e.target.value })} />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-muted">Finalidad</label>
              <input className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" placeholder="Gestión facturación" value={form.finalidad} onChange={(e) => setForm({ ...form, finalidad: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-background hover:bg-brand/90">Guardar política</button>
              <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      {/* Row 2 — Cola de ejecución full-width */}
      <div className="panel p-3">
        <h3 className="text-sm font-semibold text-foreground">Cola de ejecución de políticas</h3>
        <p className="mb-2 text-xs text-muted">GATE: eliminación masiva requiere aprobación PASA</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">Tipo de dato</th>
                <th className="px-2 py-1.5">Registros</th>
                <th className="px-2 py-1.5">Acción</th>
                <th className="px-2 py-1.5">Fecha límite</th>
                <th className="px-2 py-1.5">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EXECUTION_QUEUE.map((q, i) => (
                <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-2 py-1.5 font-medium text-foreground">{q.tipo}</td>
                  <td className="px-2 py-1.5 font-mono text-foreground">{q.registros.toLocaleString()}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${ACCION_BADGE[q.accion]}`}>{q.accion}</span>
                  </td>
                  <td className="px-2 py-1.5 text-muted">{q.fechaLimite}</td>
                  <td className="px-2 py-1.5 text-muted">{q.responsable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <button type="button" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-background hover:bg-brand/90">Ejecutar borrado</button>
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface">Enviar a aprobación PASA</button>
        </div>
      </div>

      {/* Row 3 */}
      <div className="flex gap-3">
        {/* Heatmap */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-sm font-semibold text-foreground">Configurador de campos por proceso</h3>
          <p className="mb-2 text-xs text-muted">obligatorio / opcional / no requerido / no permitido · auditado</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {Object.entries(HEATMAP_COLOR).map(([k, v]) => (
              <span key={k} className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${v}`}>{k}</span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-1.5 py-1 text-left">Proceso</th>
                  {FIELDS.map((f) => <th key={f} className="px-1.5 py-1 text-center">{f}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROCESSES.map((proc, i) => (
                  <tr key={proc} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-1.5 py-1 font-medium text-foreground">{proc}</td>
                    {FIELDS.map((field) => {
                      const val = HEATMAP[proc]?.[field] ?? 'no-req';
                      return (
                        <td key={field} className="px-1.5 py-1 text-center">
                          <span className={`inline-block rounded px-1 py-0.5 text-[8px] font-medium ${HEATMAP_COLOR[val]}`}>
                            {val === 'obligatorio' ? '●' : val === 'opcional' ? '◐' : val === 'no-permitido' ? '✕' : '○'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de ejecuciones */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-sm font-semibold text-foreground">Historial de ejecuciones</h3>
          <p className="mb-2 text-xs text-muted">inmutable · hash de verificación · usuario que aprobó</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Política</th>
                  <th className="px-2 py-1.5">Fecha</th>
                  <th className="px-2 py-1.5">Registros</th>
                  <th className="px-2 py-1.5">Acción</th>
                  <th className="px-2 py-1.5">Aprobó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EXEC_HISTORY.map((h, i) => (
                  <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-2 py-1.5 font-medium text-foreground">{h.politica}</td>
                    <td className="px-2 py-1.5 font-mono text-xs text-muted">{h.fecha}</td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{h.registros.toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${ACCION_BADGE[h.accion]}`}>{h.accion}</span>
                    </td>
                    <td className="px-2 py-1.5 text-muted">{h.aprobo}</td>
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
