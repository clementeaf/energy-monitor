import { useState, useMemo } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { useUsersQuery } from '../../../hooks/queries/useUsersQuery';
import { useBreachReportsQuery } from '../../../hooks/queries/useBreachReportsQuery';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';
import { type PamStatus, type SecurityTab, PRIVILEGED_SLUGS, SECURITY_TABS } from './seguridad-utils';
import { SecurityDrawerContent, drawerTitle } from './SecurityDrawerContent';
import { PosturaCards, PamCards, IncidentesCards, ComplianceCards } from './SecurityCards';

/* ── Page ── */

export function SeguridadPamPage() {
  const usersQuery = useUsersQuery();
  const breachQuery = useBreachReportsQuery();
  const auditQuery = useAuditLogsQuery({ limit: 20 });

  const users = usersQuery.data ?? [];
  const breachReports = breachQuery.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];

  // Active tab
  const [activeTab, setActiveTab] = useState<SecurityTab>('postura');

  // PAM: users with privileged roles (super_admin, corp_admin)
  const pamAccounts = useMemo(
    () => users.filter((u) => u.role?.slug && PRIVILEGED_SLUGS.has(u.role.slug)),
    [users],
  );

  // PAM review dates (derived from user creation + 90-day cycle)
  const pamWithReview = useMemo(() => pamAccounts.map((acc) => {
    const created = new Date(acc.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / 86_400_000);
    const reviewCycleDays = 90;
    const cyclesPassed = Math.floor(daysSinceCreation / reviewCycleDays);
    const lastReview = new Date(created.getTime() + cyclesPassed * reviewCycleDays * 86_400_000);
    const nextReview = new Date(lastReview.getTime() + reviewCycleDays * 86_400_000);
    const daysUntilReview = Math.ceil((nextReview.getTime() - now.getTime()) / 86_400_000);
    const pamStatus: PamStatus = !acc.isActive ? 'inactivo' : daysUntilReview <= 0 ? 'en revisión' : daysUntilReview <= -30 ? 'suspendido' : 'activo';
    return { ...acc, displayName: acc.displayName ?? undefined, lastReview, nextReview, daysUntilReview, pamStatus };
  }), [pamAccounts]);

  // PAM usage history (from audit logs by privileged users)
  const pamUserIds = new Set(pamAccounts.map((u) => u.id));
  const pamUsageHistory = useMemo(
    () => auditLogs
      .filter((l) => l.userId && pamUserIds.has(l.userId))
      .slice(0, 10)
      .map((l) => ({
        id: l.id,
        user: l.userEmail ?? l.userId?.slice(0, 8) ?? '—',
        resource: l.resourceType,
        action: l.action,
        date: new Date(l.createdAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })),
    [auditLogs, pamUserIds],
  );

  // Security incidents (derived from breach reports + open alerts)
  const incidents = useMemo(() => breachReports.map((b) => ({
    id: b.id,
    description: b.description,
    type: 'brecha' as const,
    severity: b.status === 'resolved' ? 'medium' : 'critical',
    status: b.status === 'resolved' ? 'resuelto' : 'abierto',
    date: new Date(b.createdAt).toLocaleDateString('es-CL'),
    responsible: '—',
  })), [breachReports]);

  // Breach notification state
  const [breachFormOpen, setBreachFormOpen] = useState(false);
  const [breachDesc, setBreachDesc] = useState('');
  const [breachSent, setBreachSent] = useState(false);

  // Crypto deletion state
  const [cryptoDeleteOpen, setCryptoDeleteOpen] = useState(false);
  const [cryptoConfirm, setCryptoConfirm] = useState('');
  const [cryptoExecuted, setCryptoExecuted] = useState(false);

  // JIT access state
  const [jitRequestOpen, setJitRequestOpen] = useState(false);
  const [jitResource, setJitResource] = useState('');
  const [jitDuration, setJitDuration] = useState('30');
  const [jitJustification, setJitJustification] = useState('');
  const [jitSubmitted, setJitSubmitted] = useState(false);

  // Detail drawer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drawer, setDrawer] = useState<{ type: string; data: any } | null>(null);
  const closeDrawer = () => setDrawer(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDrawer = (type: string, data: any) => setDrawer({ type, data });

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">7.3 Seguridad y PAM</h1>
        <p className="text-xs text-muted">Postura de seguridad de la plataforma — vulnerabilidades, accesos privilegiados, cumplimiento y respuesta a incidentes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {SECURITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'postura' && <PosturaCards />}
      {activeTab === 'pam' && (
        <PamCards
          pamWithReview={pamWithReview}
          onOpenDrawer={openDrawer}
          jitRequestOpen={jitRequestOpen}
          setJitRequestOpen={setJitRequestOpen}
          jitResource={jitResource}
          setJitResource={setJitResource}
          jitDuration={jitDuration}
          setJitDuration={setJitDuration}
          jitJustification={jitJustification}
          setJitJustification={setJitJustification}
          jitSubmitted={jitSubmitted}
          setJitSubmitted={setJitSubmitted}
        />
      )}
      {activeTab === 'incidentes' && (
        <IncidentesCards
          incidents={incidents}
          onOpenDrawer={openDrawer}
          breachFormOpen={breachFormOpen}
          setBreachFormOpen={setBreachFormOpen}
          breachDesc={breachDesc}
          setBreachDesc={setBreachDesc}
          breachSent={breachSent}
          setBreachSent={setBreachSent}
        />
      )}
      {activeTab === 'compliance' && (
        <ComplianceCards
          cryptoDeleteOpen={cryptoDeleteOpen}
          setCryptoDeleteOpen={setCryptoDeleteOpen}
          cryptoConfirm={cryptoConfirm}
          setCryptoConfirm={setCryptoConfirm}
          cryptoExecuted={cryptoExecuted}
          setCryptoExecuted={setCryptoExecuted}
        />
      )}

      {/* Detail Drawer */}
      <Drawer open={drawer !== null} onClose={closeDrawer} title={drawerTitle(drawer?.type)} side="right" size="md">
        {drawer && <SecurityDrawerContent type={drawer.type} data={drawer.data} auditLogs={auditLogs} pamUsageHistory={pamUsageHistory} />}
      </Drawer>
    </div>
  );
}
