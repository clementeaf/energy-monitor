import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { type PamStatus, PAM_BADGE, INCIDENT_STATUS_BADGE } from './seguridad-utils';

/* ── Shared types ── */

interface PamAccount {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string; slug: string };
  lastReview: Date;
  nextReview: Date;
  daysUntilReview: number;
  pamStatus: PamStatus;
}

interface Incident {
  id: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  date: string;
  responsible: string;
}

/* ══════════════════════════════════════════════
   TAB: Postura
   Cards: Vulnerabilidades, TLS, Cifrado, WAF, Hardening
   ══════════════════════════════════════════════ */

export function PosturaCards() {
  return (
    <div className="flex flex-wrap gap-3">
      <VulnerabilidadesCard />
      <TlsCard />
      <CifradoCard />
      <WafCard />
      <HardeningCard />
    </div>
  );
}

function VulnerabilidadesCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Resumen de vulnerabilidades</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Parche crítico &lt; 30 días</p>
      <ul className="space-y-0.5 text-xs">
        <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-danger" />Críticas: <span className="font-semibold text-danger">2</span></li>
        <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-warning/60" />Altas: <span className="font-semibold text-warning">5</span></li>
        <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-warning/60" />Medias: <span className="font-semibold text-warning">11</span></li>
        <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-info/60" />Bajas: <span className="font-semibold text-info">23</span></li>
      </ul>
      <p className="mt-2 text-xs text-warning">Parches pendientes: 3 (vence en 12 días)</p>
      <p className="text-xs text-muted">Último scan: 09-07</p>
    </div>
  );
}

function TlsCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Certificados TLS</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta a 30 y 7 días</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-1 font-medium">Servicio</th>
            <th className="pb-1 font-medium">Días</th>
            <th className="pb-1 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[
            { service: 'API Gateway', days: 245, status: 'ok' },
            { service: 'CloudFront CDN', days: 312, status: 'ok' },
            { service: 'RDS PostgreSQL', days: 180, status: 'ok' },
          ].map((c) => (
            <tr key={c.service}>
              <td className="py-1 text-foreground">{c.service}</td>
              <td className={`py-1 ${c.days <= 30 ? 'font-medium text-danger' : c.days <= 90 ? 'text-warning' : 'text-muted'}`}>{c.days}d</td>
              <td className="py-1"><span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs text-success">vigente</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CifradoCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Cifrado en reposo (AES-256)</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta si un componente pierde cifrado</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Base de datos: AES-256 activo</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Backups: AES-256 activo</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Almacenamiento de archivos: activo</li>
      </ul>
    </div>
  );
}

function WafCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">WAF / DDoS / IDS-IPS</h3>
      </div>
      <p className="mb-2 text-xs text-muted">IDS/IPS monitoreado 24×7</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> WAF activo — AWS WAF energy-monitor-waf</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> DDoS — AWS Shield Standard</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> IDS/IPS — GuardDuty activo</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Rate limit — 2000 req/5min/IP</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Reglas managed: 4 grupos activos</li>
      </ul>
    </div>
  );
}

function HardeningCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Hardening — CIS Benchmarks</h3>
      </div>
      <p className="mb-2 text-xs text-muted">% cumplimiento por componente</p>
      <ul className="space-y-1 text-xs">
        {[
          { name: 'ECS Fargate', pct: 94 },
          { name: 'RDS PostgreSQL', pct: 91 },
          { name: 'S3 / CloudFront', pct: 97 },
          { name: 'IAM', pct: 88 },
          { name: 'VPC / Network', pct: 95 },
        ].map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-foreground">{item.name}</span>
            <div className="h-1.5 flex-1 rounded-full bg-surface">
              <div className={`h-full rounded-full ${item.pct >= 90 ? 'bg-success/100' : item.pct >= 75 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${item.pct}%` }} />
            </div>
            <span className={`w-8 text-right text-xs font-medium ${item.pct >= 90 ? 'text-success' : 'text-warning'}`}>{item.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TAB: PAM
   Cards: Cuentas privilegiadas, JIT Vault
   ══════════════════════════════════════════════ */

interface PamCardsProps {
  pamWithReview: PamAccount[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpenDrawer: (type: string, data: any) => void;
  // JIT state
  jitRequestOpen: boolean;
  setJitRequestOpen: (v: boolean) => void;
  jitResource: string;
  setJitResource: (v: string) => void;
  jitDuration: string;
  setJitDuration: (v: string) => void;
  jitJustification: string;
  setJitJustification: (v: string) => void;
  jitSubmitted: boolean;
  setJitSubmitted: (v: boolean) => void;
}

export function PamCards({
  pamWithReview, onOpenDrawer,
  jitRequestOpen, setJitRequestOpen,
  jitResource, setJitResource,
  jitDuration, setJitDuration,
  jitJustification, setJitJustification,
  jitSubmitted, setJitSubmitted,
}: PamCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* PAM accounts */}
      <div className="panel flex-1 min-w-[280px] p-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-foreground">PAM — cuentas privilegiadas</h3>
        </div>
        <p className="mb-2 text-xs text-muted">Revisión mensual obligatoria con justificación</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-1 font-medium">Usuario / rol</th>
              <th className="pb-1 font-medium">Próxima rev.</th>
              <th className="pb-1 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pamWithReview.slice(0, 4).map((acc) => (
              <tr key={acc.id} className="cursor-pointer hover:bg-surface" onClick={() => onOpenDrawer('pam', acc)}>
                <td className="py-1 text-foreground">{acc.displayName ?? acc.email}</td>
                <td className={`py-1 text-xs ${acc.daysUntilReview <= 7 ? 'font-medium text-danger' : 'text-muted'}`}>{acc.nextReview.toLocaleDateString('es-CL')}</td>
                <td className="py-1"><span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${PAM_BADGE[acc.pamStatus]}`}>{acc.pamStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JIT Vault */}
      <div className="panel flex-1 min-w-[280px] p-3" data-testid="jit-vault">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-foreground">Bóveda de credenciales JIT</h3>
        </div>
        <p className="mb-2 text-xs text-muted">Acceso just-in-time</p>
        <ul className="mb-3 space-y-1 text-xs">
          <li className="flex items-center gap-1.5 text-success"><span>✓</span> Aprobación requerida antes de acceso</li>
          <li className="flex items-center gap-1.5 text-success"><span>✓</span> Sesión grabada y auditada</li>
          <li className="flex items-center gap-1.5 text-success"><span>✓</span> TTL máximo: 2 horas</li>
          <li className="flex items-center gap-1.5 text-muted"><span>–</span> Solicitudes activas: 0</li>
        </ul>
        {jitRequestOpen ? (
          <div className="space-y-1.5">
            {jitSubmitted ? (
              <p className="text-xs text-success">Solicitud enviada. Pendiente de aprobación.</p>
            ) : (
              <>
                <DropdownSelect className="w-full" placeholder="Recurso..." value={jitResource} onChange={setJitResource} options={[{ value: 'rds-prod', label: 'RDS Producción' }, { value: 'ecs-exec', label: 'ECS Exec' }, { value: 's3-admin', label: 'S3 Admin' }]} />
                <DropdownSelect className="w-full" value={jitDuration} onChange={setJitDuration} options={[{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '60', label: '1 hora' }, { value: '120', label: '2 horas' }]} />
                <textarea value={jitJustification} onChange={(e) => setJitJustification(e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none" placeholder="Justificación..." />
                <div className="flex gap-1.5">
                  <button type="button" disabled={!jitResource || !jitJustification.trim()} onClick={() => setJitSubmitted(true)} className="flex-1 rounded bg-brand px-2 py-1 text-xs font-medium text-brand-fg disabled:opacity-50">Enviar</button>
                  <button type="button" onClick={() => setJitRequestOpen(false)} className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-surface">Cancelar</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => { setJitRequestOpen(true); setJitSubmitted(false); }} className="rounded bg-brand px-2.5 py-1 text-xs font-medium text-brand-fg hover:bg-brand-hover">
            Solicitar acceso
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TAB: Incidentes
   Cards: EDR, Incidentes de seguridad, BCP/DRP
   ══════════════════════════════════════════════ */

interface IncidentesCardsProps {
  incidents: Incident[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpenDrawer: (type: string, data: any) => void;
  // Breach form state
  breachFormOpen: boolean;
  setBreachFormOpen: (v: boolean) => void;
  breachDesc: string;
  setBreachDesc: (v: string) => void;
  breachSent: boolean;
  setBreachSent: (v: boolean) => void;
}

export function IncidentesCards({
  incidents, onOpenDrawer,
  breachFormOpen, setBreachFormOpen,
  breachDesc, setBreachDesc,
  breachSent, setBreachSent,
}: IncidentesCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <EdrCard />

      {/* Incidentes de seguridad */}
      <div className="panel flex-1 min-w-[280px] p-3" data-testid="security-incidents">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-foreground">Incidentes de seguridad</h3>
        </div>
        <p className="mb-2 text-xs text-muted">Informe de brecha en &lt; 24h</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-1 font-medium">Fecha</th>
              <th className="pb-1 font-medium">Tipo</th>
              <th className="pb-1 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {incidents.slice(0, 4).map((inc) => (
              <tr key={inc.id} className="cursor-pointer hover:bg-surface" onClick={() => onOpenDrawer('incident', inc)}>
                <td className="py-1 text-muted">{inc.date}</td>
                <td className="py-1 text-foreground">{inc.type}</td>
                <td className="py-1"><span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${INCIDENT_STATUS_BADGE[inc.status] ?? 'bg-surface text-foreground'}`}>{inc.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          {breachSent ? (
            <p className="text-xs text-success">Notificación enviada a PASA.</p>
          ) : breachFormOpen ? (
            <div className="space-y-1.5">
              <textarea value={breachDesc} onChange={(e) => setBreachDesc(e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none" placeholder="Descripción de la brecha..." />
              <div className="flex gap-1.5">
                <button type="button" disabled={!breachDesc.trim()} onClick={() => setBreachSent(true)} className="flex-1 rounded bg-danger px-2 py-1 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50">Notificar a PASA</button>
                <button type="button" onClick={() => setBreachFormOpen(false)} className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-surface">Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setBreachFormOpen(true); setBreachSent(false); setBreachDesc(''); }} className="rounded bg-danger px-2.5 py-1 text-xs font-medium text-background hover:bg-danger/90">
              Notificar a PASA
            </button>
          )}
        </div>
      </div>

      <BcpCard />
    </div>
  );
}

function EdrCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">EDR / antivirus</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta si &gt; 24h sin actualizar firmas</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> AWS Inspector activo</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Última actualización: hace 2h</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Escaneo continuo de contenedores</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Alertas activas: 0</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Último reporte: 09-07</li>
      </ul>
    </div>
  );
}

function BcpCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Estado del BCP / DRP</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta si prueba &gt; 6 meses</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> BCP documentado y aprobado</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Última prueba BCP: 2026-03-15</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> DRP documentado</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> RTO objetivo: &lt; 4h</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> RPO objetivo: &lt; 1h</li>
        <li className="flex items-center gap-1.5 text-warning"><span>!</span> Próxima prueba: 2026-09-15</li>
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TAB: Compliance
   Cards: SBOM, DAST, Pentest, Crypto Deletion, Backups
   ══════════════════════════════════════════════ */

interface ComplianceCardsProps {
  cryptoDeleteOpen: boolean;
  setCryptoDeleteOpen: (v: boolean) => void;
  cryptoConfirm: string;
  setCryptoConfirm: (v: string) => void;
  cryptoExecuted: boolean;
  setCryptoExecuted: (v: boolean) => void;
}

export function ComplianceCards({
  cryptoDeleteOpen, setCryptoDeleteOpen,
  cryptoConfirm, setCryptoConfirm,
  cryptoExecuted, setCryptoExecuted,
}: ComplianceCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <SbomCard />
      <DastCard />
      <PentestCard />
      <CryptoDeletionCard
        cryptoDeleteOpen={cryptoDeleteOpen}
        setCryptoDeleteOpen={setCryptoDeleteOpen}
        cryptoConfirm={cryptoConfirm}
        setCryptoConfirm={setCryptoConfirm}
        cryptoExecuted={cryptoExecuted}
        setCryptoExecuted={setCryptoExecuted}
      />
      <BackupsCard />
    </div>
  );
}

function SbomCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Inventario HW/SW (SBOM)</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta EOL en próximos 90 días</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-1 font-medium">Componente</th>
            <th className="pb-1 font-medium">EOL</th>
            <th className="pb-1 font-medium">Soporte</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[
            { name: 'Node.js 20', eol: '2026-04', support: 'LTS' },
            { name: 'PostgreSQL 16', eol: '2028-11', support: 'activo' },
            { name: 'NestJS 11', eol: '—', support: 'activo' },
            { name: 'React 19', eol: '—', support: 'activo' },
          ].map((c) => (
            <tr key={c.name}>
              <td className="py-1 text-foreground">{c.name}</td>
              <td className="py-1 text-muted">{c.eol}</td>
              <td className="py-1"><span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs text-success">{c.support}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DastCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Escaneo DAST</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Último ciclo de escaneo dinámico</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Último escaneo: 2026-07-01</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Hallazgos críticos: 0</li>
        <li className="flex items-center gap-1.5 text-warning"><span>!</span> Hallazgos medios: 2 (en remediación)</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Herramienta: OWASP ZAP</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Frecuencia: mensual</li>
      </ul>
    </div>
  );
}

function PentestCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Informe Pentest anual</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Alerta si último Pentest &gt; 12 meses</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Último pentest: 2026-07-07</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> 91 PASS / 0 FAIL / 22 WARN</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> 113 tests en 14 fases</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Próximo: 2027-07</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Framework: scripts/pentest/</li>
      </ul>
    </div>
  );
}

function CryptoDeletionCard({ cryptoDeleteOpen, setCryptoDeleteOpen, cryptoConfirm, setCryptoConfirm, cryptoExecuted, setCryptoExecuted }: ComplianceCardsProps) {
  return (
    <div className="panel flex-1 min-w-[280px] p-3" data-testid="crypto-deletion">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Borrado criptográfico</h3>
      </div>
      <p className="mb-2 text-xs text-muted">CTA DESTRUCTIVA — destrucción certificada al término de contrato</p>
      <ul className="mb-3 space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Último borrado: —</li>
        <li className="flex items-center gap-1.5 text-muted"><span>–</span> Certificados emitidos: 0</li>
      </ul>
      {cryptoExecuted ? (
        <p className="text-xs text-success">Borrado ejecutado. Registro en pista de auditoría.</p>
      ) : cryptoDeleteOpen ? (
        <div className="space-y-1.5">
          <p className="text-xs text-danger">Irreversible. Escriba "CONFIRMAR" para proceder.</p>
          <input type="text" value={cryptoConfirm} onChange={(e) => setCryptoConfirm(e.target.value)} className="w-full rounded border border-danger/50 bg-background px-2 py-1 text-xs outline-none" placeholder="CONFIRMAR" />
          <div className="flex gap-1.5">
            <button type="button" disabled={cryptoConfirm !== 'CONFIRMAR'} onClick={() => setCryptoExecuted(true)} className="flex-1 rounded bg-danger px-2 py-1 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50">Ejecutar borrado</button>
            <button type="button" onClick={() => { setCryptoDeleteOpen(false); setCryptoConfirm(''); }} className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-surface">Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setCryptoDeleteOpen(true); setCryptoExecuted(false); setCryptoConfirm(''); }} className="rounded border border-danger/50 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10">
          Iniciar borrado criptográfico
        </button>
      )}
    </div>
  );
}

function BackupsCard() {
  return (
    <div className="panel flex-1 min-w-[280px] p-3">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Integridad de backups</h3>
      </div>
      <p className="mb-2 text-xs text-muted">Prueba semestral</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> RDS automated backups: diario</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Retención: 7 días</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Cifrado: AES-256</li>
        <li className="flex items-center gap-1.5 text-success"><span>✓</span> Última restauración de prueba: 2026-06-01</li>
        <li className="flex items-center gap-1.5 text-warning"><span>!</span> Próxima prueba: 2026-12-01</li>
      </ul>
    </div>
  );
}
