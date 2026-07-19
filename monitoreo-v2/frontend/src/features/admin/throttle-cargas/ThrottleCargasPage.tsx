import { useState } from 'react';

/* ── Placeholder data ── */

const TENANT_QUOTAS = [
  { tenant: 'PASA', reqHora: 5000, reqDia: 50000, consumoActual: 3820, pct: 76, estado: 'alerta' },
  { tenant: 'Siemens', reqHora: 2000, reqDia: 20000, consumoActual: 640, pct: 32, estado: 'ok' },
  { tenant: 'Globe Power', reqHora: 1000, reqDia: 10000, consumoActual: 210, pct: 21, estado: 'ok' },
  { tenant: 'Demo Corp', reqHora: 500, reqDia: 5000, consumoActual: 12, pct: 2, estado: 'ok' },
];

const THROTTLE_LOG = [
  { tenant: 'PASA', endpoint: '/api/readings', bloqueadas: 142, ip: '10.0.1.45' },
  { tenant: 'PASA', endpoint: '/api/aggregated', bloqueadas: 38, ip: '10.0.1.45' },
  { tenant: 'Globe Power', endpoint: '/api/buildings', bloqueadas: 7, ip: '203.0.113.12' },
];

const EXTRACTIONS = [
  { integracion: 'PASA ETL', modo: 'incremental', cursor: '2026-07-17 08:55:00', ultExtraccion: '2026-07-17 09:00:12', estado: 'ok' },
  { integracion: 'Siemens IoT', modo: 'incremental', cursor: '2026-07-17 08:45:00', ultExtraccion: '2026-07-17 09:00:05', estado: 'ok' },
  { integracion: 'Drive Pipeline', modo: 'full-load', cursor: '—', ultExtraccion: '2026-07-17 03:01:44', estado: 'ok' },
  { integracion: 'BACnet Bridge', modo: 'incremental', cursor: '2026-07-17 04:10:00', ultExtraccion: '2026-07-17 08:10:22', estado: 'stalled' },
];

const EXTRACT_HISTORY = [
  { inicio: '2026-07-17 09:00', fin: '2026-07-17 09:00:12', modo: 'incremental', registros: 1840, mb: '0.4', resultado: 'éxito' },
  { inicio: '2026-07-17 08:00', fin: '2026-07-17 08:00:08', modo: 'incremental', registros: 2100, mb: '0.5', resultado: 'éxito' },
  { inicio: '2026-07-17 03:01', fin: '2026-07-17 03:42:11', modo: 'full-load', registros: 2680000, mb: '214', resultado: 'éxito' },
  { inicio: '2026-07-16 09:00', fin: '2026-07-16 09:00:15', modo: 'incremental', registros: 1620, mb: '0.4', resultado: 'éxito' },
  { inicio: '2026-07-16 08:00', fin: '09:04:22', modo: 'incremental', registros: 0, mb: '0', resultado: 'error' },
];

/* SVG consumption chart */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PASA_DATA = [820, 910, 750, 680, 720, 890, 1200, 2100, 3200, 3820, 3500, 3100, 2800, 3400, 3600, 3820, 3200, 2900, 2600, 2300, 2000, 1800, 1400, 1100];
const W = 380;
const H = 100;
const PAD = { top: 10, right: 10, bottom: 18, left: 36 };
const cW = W - PAD.left - PAD.right;
const cH = H - PAD.top - PAD.bottom;
const maxVal = 5000;

function toX(i: number) { return PAD.left + (i / 23) * cW; }
function toY(v: number) { return PAD.top + cH - (v / maxVal) * cH; }

const polyPASA = PASA_DATA.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
const threshY = toY(5000);

/* ── Page ── */

export function ThrottleCargasPage() {
  const [quotaForm, setQuotaForm] = useState({ tenant: '', reqHora: '', reqDia: '', whitelist: '' });
  const [extractForm, setExtractForm] = useState({ integracion: '', modo: 'incremental', cursor: 'timestamp', overlap: '5' });

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.8 Throttle y Cargas</h1>
        <p className="text-[12px] text-muted">Control de consumo de API, throttling, quotas por tenant y gestión de extracciones</p>
      </div>

      {/* Row 1 */}
      <div className="flex gap-3">
        {/* Quotas */}
        <div className="panel flex w-1/2 min-w-0 flex-col">
          <div className="shrink-0 px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-foreground">Quotas de API por tenant</h3>
            <p className="text-[11px] text-muted">alerta si un tenant supera el 80% de su cuota</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-4">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-2 py-1.5">Tenant</th>
                <th className="sticky top-0 bg-white px-2 py-1.5">Req/h</th>
                <th className="sticky top-0 bg-white px-2 py-1.5">Req/d</th>
                <th className="sticky top-0 bg-white px-2 py-1.5">Actual</th>
                <th className="sticky top-0 bg-white px-2 py-1.5">% uso</th>
                <th className="sticky top-0 bg-white px-2 py-1.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TENANT_QUOTAS.map((t, i) => (
                <tr key={t.tenant} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-2 py-1.5 font-medium text-foreground">{t.tenant}</td>
                  <td className="px-2 py-1.5 font-mono text-muted">{t.reqHora.toLocaleString()}</td>
                  <td className="px-2 py-1.5 font-mono text-muted">{t.reqDia.toLocaleString()}</td>
                  <td className="px-2 py-1.5 font-mono text-foreground">{t.consumoActual.toLocaleString()}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200">
                        <div className={`h-full rounded-full ${t.pct >= 80 ? 'bg-amber-500' : 'bg-brand'}`} style={{ width: `${t.pct}%` }} />
                      </div>
                      <span className={`font-mono ${t.pct >= 80 ? 'text-amber-600' : 'text-muted'}`}>{t.pct}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${t.estado === 'alerta' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {t.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <span className="block shrink-0 border-t border-border px-4 py-1.5 text-right text-[10px] text-muted">[DAT-15]</span>
        </div>

        {/* Consumo chart */}
        <div className="panel flex w-1/2 min-w-0 flex-col p-4">
          <div className="shrink-0">
            <h3 className="text-[13px] font-semibold text-foreground">Consumo de API por tenant</h3>
            <p className="mb-2 text-[11px] text-muted">requests/hora 24h · línea horizontal en el límite configurado</p>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className="inline-block h-2 w-4 rounded bg-brand" /> PASA
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className="inline-block h-0.5 w-4 rounded bg-red-400 border-dashed" /> umbral 5 000 req/h
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-h-0 flex-1" preserveAspectRatio="none">
            {[0, 2000, 4000].map((v) => (
              <line key={v} x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} stroke="#e5e7eb" strokeWidth={0.5} />
            ))}
            <line x1={PAD.left} x2={W - PAD.right} y1={threshY} y2={threshY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />
            <text x={W - PAD.right - 2} y={threshY - 3} textAnchor="end" fontSize={8} fill="#ef4444">límite</text>
            <polyline points={polyPASA} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
            {[0, 2000, 4000].map((v) => (
              <text key={v} x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">{v === 0 ? '0' : `${v / 1000}k`}</text>
            ))}
            {HOURS.filter((h) => h % 6 === 0).map((h) => (
              <text key={h} x={toX(h)} y={H - 2} textAnchor="middle" fontSize={8} fill="#9ca3af">{h}h</text>
            ))}
          </svg>
          <span className="block shrink-0 pt-1 text-right text-[10px] text-muted">[DAT-15, DAT-09]</span>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex gap-3">
        {/* Log throttling */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Log de eventos de throttling</h3>
          <p className="mb-3 text-[11px] text-muted">detecta falsos positivos que afecten ETL legítimos de PASA</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Tenant</th>
                <th className="sticky top-0 bg-white px-3 py-2">Endpoint</th>
                <th className="sticky top-0 bg-white px-3 py-2">Bloqueadas</th>
                <th className="sticky top-0 bg-white px-3 py-2">IP origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {THROTTLE_LOG.map((t, i) => (
                <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">{t.tenant}</td>
                  <td className="max-w-[120px] truncate px-3 py-2 font-mono text-[10px] text-muted" title={t.endpoint}>{t.endpoint}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-red-600">{t.bloqueadas}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{t.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-15, DAT-14]</span>
        </div>

        {/* Configurador de quotas */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Configurador de quotas</h3>
          <p className="mb-3 text-[11px] text-muted">whitelist de IPs exentas · cambios auditados (usuario/timestamp)</p>
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Tenant</label>
              <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={quotaForm.tenant} onChange={(e) => setQuotaForm({ ...quotaForm, tenant: e.target.value })}>
                <option value="">Seleccionar…</option>
                {TENANT_QUOTAS.map((t) => <option key={t.tenant} value={t.tenant}>{t.tenant}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-muted">Límite req/hora</label>
                <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. 5000" value={quotaForm.reqHora} onChange={(e) => setQuotaForm({ ...quotaForm, reqHora: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-muted">Límite req/día</label>
                <input className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="ej. 50000" value={quotaForm.reqDia} onChange={(e) => setQuotaForm({ ...quotaForm, reqDia: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Whitelist de IPs exentas (ETL PASA)</label>
              <textarea className="w-full rounded border border-border bg-white px-2 py-1.5 text-[12px] text-foreground font-mono" rows={2} placeholder="10.0.1.45&#10;10.0.1.46" value={quotaForm.whitelist} onChange={(e) => setQuotaForm({ ...quotaForm, whitelist: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">Guardar quota</button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">Cancelar</button>
            </div>
          </form>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-15, CYB-03]</span>
        </div>

      </div>

      {/* Row 3 */}
      <div className="flex gap-3">
        {/* Estado extracciones incrementales */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Estado de extracciones incrementales</h3>
          <p className="mb-3 text-[11px] text-muted">indicador si el cursor lleva &gt; 4h sin avanzar (DAT-24)</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Integración</th>
                <th className="sticky top-0 bg-white px-3 py-2">Modo</th>
                <th className="sticky top-0 bg-white px-3 py-2">Cursor</th>
                <th className="sticky top-0 bg-white px-3 py-2">Últ. extracción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EXTRACTIONS.map((e, i) => (
                <tr key={e.integracion} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${e.estado === 'stalled' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {e.integracion}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{e.modo}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted">{e.cursor}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">{e.ultExtraccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-21, DAT-24]</span>
        </div>

        {/* Configurador modo extracción */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Configurador de modo de extracción</h3>
          <p className="mb-3 text-[11px] text-muted">incremental / full-load · ventana de overlap para registros tardíos</p>
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Integración</label>
              <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={extractForm.integracion} onChange={(e) => setExtractForm({ ...extractForm, integracion: e.target.value })}>
                <option value="">Seleccionar…</option>
                {EXTRACTIONS.map((e) => <option key={e.integracion} value={e.integracion}>{e.integracion}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Modo</label>
              <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={extractForm.modo} onChange={(e) => setExtractForm({ ...extractForm, modo: e.target.value })}>
                <option value="incremental">Incremental</option>
                <option value="full-load">Full-load</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Columna de cursor</label>
              <select className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" value={extractForm.cursor} onChange={(e) => setExtractForm({ ...extractForm, cursor: e.target.value })}>
                <option value="timestamp">timestamp</option>
                <option value="id">ID</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Ventana de overlap</label>
              <div className="flex items-center gap-2">
                <input className="w-20 rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground" placeholder="5" value={extractForm.overlap} onChange={(e) => setExtractForm({ ...extractForm, overlap: e.target.value })} />
                <span className="text-[12px] text-muted">min (ej. últimos 5 min)</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">Guardar</button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">Cancelar</button>
            </div>
          </form>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-21]</span>
        </div>

      </div>

      {/* Row 4 */}
      <div className="panel p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Historial de extracciones</h3>
          <p className="mb-3 text-[11px] text-muted">últimas 100 por integración · audita eficiencia incremental vs. full-load</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Inicio</th>
                <th className="sticky top-0 bg-white px-3 py-2">Fin</th>
                <th className="sticky top-0 bg-white px-3 py-2">Modo</th>
                <th className="sticky top-0 bg-white px-3 py-2">Registros</th>
                <th className="sticky top-0 bg-white px-3 py-2">MB</th>
                <th className="sticky top-0 bg-white px-3 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EXTRACT_HISTORY.map((h, i) => (
                <tr key={i} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{h.inicio}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{h.fin}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">{h.modo}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground">{Number(h.registros).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{h.mb}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${h.resultado === 'éxito' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {h.resultado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-21, DAT-19]</span>
      </div>
    </div>
  );
}
