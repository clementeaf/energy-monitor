import { useState } from 'react';

/* ── Placeholder data ── */

const RETENTION_POLICIES = [
  { politica: 'Lecturas energéticas', tipo: 'Medición', pais: 'CL', retencion: '5 años', accion: 'archivar', estado: 'activa' },
  { politica: 'Datos de usuario', tipo: 'PII', pais: 'CL / CO', retencion: '2 años inactividad', accion: 'anonimizar', estado: 'activa' },
  { politica: 'Audit logs', tipo: 'Seguridad', pais: 'CL', retencion: '2 años', accion: 'eliminar', estado: 'activa' },
  { politica: 'Tokens de acceso', tipo: 'Auth', pais: 'Global', retencion: '30 días', accion: 'eliminar', estado: 'activa' },
  { politica: 'Facturas', tipo: 'Facturación', pais: 'CL', retencion: '7 años', accion: 'archivar', estado: 'activa' },
  { politica: 'CNR records', tipo: 'Regulatorio', pais: 'CL', retencion: '10 años', accion: 'archivar', estado: 'activa' },
];

const EXECUTION_QUEUE = [
  { tipo: 'Tokens de acceso', registros: 14820, accion: 'eliminar', fechaLimite: '2026-07-17', responsable: 'cron-daily' },
  { tipo: 'Datos de usuario inactivos', registros: 3, accion: 'anonimizar', fechaLimite: '2026-07-20', responsable: 'c.falcone@hoktus.ai' },
  { tipo: 'Audit logs > 2 años', registros: 0, accion: 'eliminar', fechaLimite: '2026-08-01', responsable: 'cron-daily' },
];

const EXEC_HISTORY = [
  { politica: 'Tokens de acceso', fecha: '2026-07-16 03:00', registros: 12440, accion: 'eliminar', aprobo: 'cron-daily' },
  { politica: 'Datos de usuario inactivos', fecha: '2026-06-01 03:05', registros: 2, accion: 'anonimizar', aprobo: 'c.falcone@hoktus.ai' },
  { politica: 'Tokens de acceso', fecha: '2026-07-15 03:00', registros: 11380, accion: 'eliminar', aprobo: 'cron-daily' },
  { politica: 'Audit logs', fecha: '2026-05-01 03:10', registros: 84200, accion: 'eliminar', aprobo: 'c.falcone@hoktus.ai' },
];

/* Heatmap config */
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
  'obligatorio': 'bg-blue-600 text-white',
  'opcional': 'bg-blue-200 text-blue-800',
  'no-req': 'bg-gray-100 text-gray-400',
  'no-permitido': 'bg-red-100 text-red-600',
};

const ACCION_BADGE: Record<string, string> = {
  'archivar': 'bg-blue-100 text-blue-700',
  'anonimizar': 'bg-purple-100 text-purple-700',
  'eliminar': 'bg-red-100 text-red-700',
};

/* ── Page ── */

export function RetencionPrivacidadPage() {
  const [expandedPolicy, setExpandedPolicy] = useState<number | null>(null);
  const [form, setForm] = useState({
    tipo: '',
    pais: '',
    retencionActiva: '',
    retencionArchivo: '',
    accion: 'anonimizar',
    baseLegal: '',
    finalidad: '',
    justificacion: '',
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.9 Retención y Privacidad</h1>
        <p className="text-[12px] text-muted">Políticas de retención de datos, minimización por proceso y ejecución de borrado auditado</p>
      </div>

      {/* Row 1 */}
      <div className="flex gap-4">
        {/* Catálogo */}
        <div className="panel p-4" style={{ flex: '0 0 50%' }}>
          <h3 className="text-[13px] font-semibold text-foreground">Catálogo de políticas de retención</h3>
          <p className="mb-3 text-[11px] text-muted">acción al vencimiento: anonimizar / eliminar / archivar · fila expandible</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Política</th>
                <th className="sticky top-0 bg-white px-3 py-2">Tipo</th>
                <th className="sticky top-0 bg-white px-3 py-2">País</th>
                <th className="sticky top-0 bg-white px-3 py-2">Retención</th>
                <th className="sticky top-0 bg-white px-3 py-2">Acción</th>
                <th className="sticky top-0 bg-white px-3 py-2">Estado</th>
                <th className="sticky top-0 bg-white px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RETENTION_POLICIES.map((p, i) => (
                <>
                  <tr
                    key={i}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setExpandedPolicy(expandedPolicy === i ? null : i)}
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{p.politica}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{p.tipo}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{p.pais}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{p.retencion}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ACCION_BADGE[p.accion]}`}>{p.accion}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{p.estado}</span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-brand">{expandedPolicy === i ? '▲' : '▼'}</td>
                  </tr>
                  {expandedPolicy === i && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={7} className="bg-surface px-4 py-3 text-[12px] text-muted">
                        <p><span className="font-medium text-foreground">Base legal:</span> Ley 21.719, Art. 8 — necesidad para cumplimiento contractual</p>
                        <p className="mt-1"><span className="font-medium text-foreground">Finalidad:</span> Gestión de consumo energético y facturación</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[PRI-08, PRI-05]</span>
        </div>

        {/* Formulario nueva política */}
        <div className="panel p-4" style={{ flex: '0 0 50%' }}>
          <h3 className="text-[13px] font-semibold text-foreground">Formulario de nueva política</h3>
          <p className="mb-3 text-[11px] text-muted">minimización de datos por proceso, país y finalidad</p>
          <form className="space-y-2.5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">Tipo de dato</label>
                <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. PII" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">País de aplicación</label>
                <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  <option value="CL">Chile</option>
                  <option value="CO">Colombia</option>
                  <option value="PE">Perú</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">Retención activa [años]</label>
                <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. 2" value={form.retencionActiva} onChange={(e) => setForm({ ...form, retencionActiva: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">Retención en archivo</label>
                <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. 5 años" value={form.retencionArchivo} onChange={(e) => setForm({ ...form, retencionArchivo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Acción al vencimiento</label>
              <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={form.accion} onChange={(e) => setForm({ ...form, accion: e.target.value })}>
                <option value="anonimizar">Anonimizar</option>
                <option value="eliminar">Eliminar</option>
                <option value="archivar">Archivar</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Base legal</label>
              <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. Ley 21.719 Art. 8" value={form.baseLegal} onChange={(e) => setForm({ ...form, baseLegal: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Finalidad de uso</label>
              <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. Gestión de facturación" value={form.finalidad} onChange={(e) => setForm({ ...form, finalidad: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Justificación</label>
              <textarea className="w-full rounded border border-border bg-white px-2 py-1.5 text-[12px] text-foreground" rows={2} placeholder="Necesidad proporcional al tratamiento…" value={form.justificacion} onChange={(e) => setForm({ ...form, justificacion: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">Guardar política</button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">Cancelar</button>
            </div>
          </form>
          <span className="block text-right text-[10px] text-muted mt-2">[PRI-08, PRI-05]</span>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex gap-4">
        {/* Cola de ejecución */}
        <div className="panel p-4 flex-1">
          <h3 className="text-[13px] font-semibold text-foreground">Cola de ejecución de políticas</h3>
          <p className="mb-3 text-[11px] text-muted">GATE: la eliminación masiva requiere aprobación del rol PASA antes de ejecutar</p>
          <table className="w-full text-[13px] mb-4">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Tipo de dato</th>
                <th className="sticky top-0 bg-white px-3 py-2">Registros</th>
                <th className="sticky top-0 bg-white px-3 py-2">Acción pendiente</th>
                <th className="sticky top-0 bg-white px-3 py-2">Fecha límite</th>
                <th className="sticky top-0 bg-white px-3 py-2">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EXECUTION_QUEUE.map((q, i) => (
                <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">{q.tipo}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground">{q.registros.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ACCION_BADGE[q.accion]}`}>{q.accion}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{q.fechaLimite}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">{q.responsable}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button type="button" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">Ejecutar borrado</button>
            <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">Enviar a aprobación PASA</button>
          </div>
          <span className="block text-right text-[10px] text-muted mt-2">[PRI-08, CYB-12, DAT-14]</span>
        </div>
      </div>

      {/* Row 3 */}
      <div className="flex gap-4">
        {/* Heatmap */}
        <div className="panel p-4" style={{ flex: '0 0 50%' }}>
          <h3 className="text-[13px] font-semibold text-foreground">Configurador de campos por proceso y país</h3>
          <p className="mb-3 text-[11px] text-muted">obligatorio / opcional / no requerido / no permitido · cambios auditados (DAT-14)</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(HEATMAP_COLOR).map(([k, v]) => (
              <span key={k} className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${v}`}>{k}</span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                  <th className="sticky top-0 bg-white px-2 py-1.5">Proceso</th>
                  {FIELDS.map((f) => <th key={f} className="sticky top-0 bg-white px-2 py-1.5 text-center">{f}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROCESSES.map((proc, i) => (
                  <tr key={proc} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-2 py-1.5 font-medium text-foreground">{proc}</td>
                    {FIELDS.map((field) => {
                      const val = HEATMAP[proc]?.[field] ?? 'no-req';
                      return (
                        <td key={field} className="px-2 py-1.5 text-center">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${HEATMAP_COLOR[val]}`}>
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
          <span className="block text-right text-[10px] text-muted mt-2">[PRI-05, DAT-14]</span>
        </div>

        {/* Historial de ejecuciones */}
        <div className="panel p-4" style={{ flex: '0 0 50%' }}>
          <h3 className="text-[13px] font-semibold text-foreground">Historial de ejecuciones de políticas</h3>
          <p className="mb-3 text-[11px] text-muted">inmutable · hash de verificación · usuario que aprobó</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Política</th>
                <th className="sticky top-0 bg-white px-3 py-2">Fecha</th>
                <th className="sticky top-0 bg-white px-3 py-2">Registros</th>
                <th className="sticky top-0 bg-white px-3 py-2">Acción</th>
                <th className="sticky top-0 bg-white px-3 py-2">Aprobó</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EXEC_HISTORY.map((h, i) => (
                <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">{h.politica}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{h.fecha}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground">{h.registros.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ACCION_BADGE[h.accion]}`}>{h.accion}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{h.aprobo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[PRI-08, CYB-10, DAT-14]</span>
        </div>
      </div>
    </div>
  );
}
