import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import { MfaSection } from '../admin/settings/MfaSection';
import { PageHeader } from '../../components/ui/PageHeader';

/**
 * User profile page — Ley 21.719 ARCO+ rights:
 * - Access: view own personal data
 * - Portability: download data as JSON
 * - Cancellation: request account deletion
 * - MFA setup: accessible to all users (required for privileged roles)
 */
export function ProfilePage() {
  const { user, buildings, tenant, setSession } = useAuthStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const mfaStatus = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: () => authEndpoints.mfaStatus().then((r) => r.data),
  });

  const updateNameMutation = useMutation({
    mutationFn: (displayName: string) => authEndpoints.updateMe({ displayName }).then((r) => r.data),
    onSuccess: () => {
      if (user && tenant) {
        setSession({ ...user, displayName: nameValue }, tenant, buildings);
      }
      setEditingName(false);
    },
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: () => authEndpoints.meExport().then((r) => r.data),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const deletionMutation = useMutation({
    mutationFn: (reason: string) => authEndpoints.meDeletionRequest(reason || undefined).then((r) => r.data),
    onSuccess: (data) => {
      setDeleteOpen(false);
      setDeleteReason('');
      if ('alreadyRequested' in data) {
        setDeleteResult('Ya tienes una solicitud de eliminación pendiente.');
      } else {
        setDeleteResult('Solicitud de eliminación enviada. Un administrador la revisará en un plazo máximo de 15 días hábiles.');
      }
    },
  });

  if (!user) return null;

  const info = [
    { label: 'Correo electrónico', value: user.email },
    { label: 'Nombre', value: user.displayName ?? '—' },
    { label: 'Rol', value: user.role.name },
    { label: 'Proveedor de autenticación', value: user.authProvider === 'microsoft' ? 'Microsoft' : 'Google' },
    { label: 'Último acceso', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('es-CL') : '—' },
    { label: 'MFA', value: mfaStatus.data?.mfaEnabled ? 'Habilitado' : user.requireMfaSetup ? 'No configurado (requerido por tu rol)' : 'No configurado' },
    { label: 'Edificios asignados', value: buildings.length > 0 ? buildings.map((b) => b.name).join(', ') : 'Todos' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Mi perfil"
        eyebrow="Cuenta"
       
      />

      {/* Personal data */}
      <div className="panel">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-medium text-foreground">Datos Personales</h2>
        </div>
        <dl className="divide-y divide-border">
          {info.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-3">
              <dt className="text-sm font-medium text-muted">{label}</dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
          {/* Inline edit for name (ARCO+ rectification) */}
          <div className="flex items-center justify-between px-6 py-3">
            <dt className="text-sm font-medium text-muted">Rectificación</dt>
            <dd>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="w-48 rounded-md border border-border px-2 py-1 text-sm"
                    placeholder="Nuevo nombre"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => updateNameMutation.mutate(nameValue)}
                    disabled={updateNameMutation.isPending || nameValue.length < 2}
                    className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setNameValue(user.displayName ?? ''); setEditingName(true); }}
                  className="text-sm font-medium text-foreground hover:opacity-80"
                >
                  Editar nombre
                </button>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* MFA setup — accessible to all users, required for privileged roles */}
      <MfaSection />

      {/* ARCO+ actions */}
      <div className="panel p-6">
        <h2 className="mb-4 font-medium text-foreground">Derechos ARCO+</h2>
        <div className="space-y-3">
          {/* Portability — download data */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Portabilidad de datos</p>
              <p className="text-xs text-muted">Descarga todos tus datos personales en formato JSON</p>
            </div>
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {exportMutation.isPending ? 'Descargando...' : 'Descargar mis datos'}
            </button>
          </div>

          {/* Rectification — email change request */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Rectificación de email</p>
              <p className="text-xs text-muted">Solicita el cambio de tu correo electrónico (requiere aprobación admin)</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newEmail = prompt('Ingresa tu nuevo correo electrónico:');
                if (newEmail && newEmail.includes('@')) {
                  authEndpoints.rectificationRequest('email', newEmail, 'Cambio solicitado por el titular');
                  alert('Solicitud enviada. Un administrador la revisará en 15 días hábiles.');
                }
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
            >
              Solicitar cambio
            </button>
          </div>

          {/* Opposition */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Oposición al tratamiento</p>
              <p className="text-xs text-muted">Oponerte al procesamiento de tus datos. Esto bloqueará tu acceso a la plataforma.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Confirmas que deseas oponerte al tratamiento de tus datos? Tu acceso será bloqueado.')) {
                  authEndpoints.oppose('Derecho de oposición ejercido por el titular').then(() => {
                    alert('Oposición registrada. Contacta a privacidad@globepower.cl para más información.');
                    window.location.href = '/login';
                  });
                }
              }}
              className="rounded-md border border-warning/50 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10"
            >
              Oponerme
            </button>
          </div>

          {/* Blocking */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Bloqueo temporal</p>
              <p className="text-xs text-muted">Suspender temporalmente el procesamiento de tus datos mientras se resuelve una disputa</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const reason = prompt('Motivo del bloqueo (opcional):');
                authEndpoints.block(reason ?? undefined).then(() => {
                  alert('Procesamiento bloqueado temporalmente. Contacta a tu administrador para desbloquear.');
                  window.location.href = '/login';
                });
              }}
              className="rounded-md border border-warning/50 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10"
            >
              Bloquear
            </button>
          </div>

          {/* Automated decisions opt-out */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Decisiones automatizadas</p>
              <p className="text-xs text-muted">Excluirte de notificaciones y escalamientos automatizados de alertas</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newVal = !user.optOutAutomatedDecisions;
                authEndpoints.automatedDecisions(newVal).then(() => {
                  if (tenant) {
                    setSession({ ...user, optOutAutomatedDecisions: newVal }, tenant, buildings);
                  }
                });
              }}
              className={`rounded-md border px-4 py-2 text-sm font-medium ${
                user.optOutAutomatedDecisions
                  ? 'border-green-300 text-success hover:bg-success/10'
                  : 'border-border text-foreground hover:bg-surface'
              }`}
            >
              {user.optOutAutomatedDecisions ? 'Reactivar' : 'Excluirme'}
            </button>
          </div>

          {/* Cancellation — request deletion */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Cancelación de cuenta</p>
              <p className="text-xs text-muted">Solicita la eliminación de tu cuenta y datos personales</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-md border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Solicitar eliminación
            </button>
          </div>
        </div>

        {deleteResult && (
          <div className="mt-4 rounded-md bg-info/10 p-3 text-sm text-info">
            {deleteResult}
          </div>
        )}
      </div>

      {/* Privacy info + consent revocation */}
      <div className="panel p-6">
        <h2 className="mb-2 font-medium text-foreground">Política de Privacidad</h2>
        <p className="text-sm text-muted">
          Tu aceptación de la política de privacidad fue registrada. Para consultas sobre el tratamiento de datos
          personales, contacta a <strong>privacidad@globepower.cl</strong>.
        </p>
        <p className="mt-2 text-sm text-muted">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:opacity-80">
            Ver política de privacidad completa
          </a>
        </p>
        <p className="mt-2 text-xs text-subtle">
          Plazo de respuesta: 15 días hábiles conforme a la Ley 21.719.
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Revocar consentimiento</p>
            <p className="text-xs text-muted">Retira tu consentimiento al tratamiento de datos. Tu sesión será terminada.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Revocar tu consentimiento? Tu sesión será cerrada y no podrás usar la plataforma hasta aceptar nuevamente.')) {
                authEndpoints.revokePrivacy().then(() => {
                  localStorage.removeItem('has_session');
                  window.location.href = '/login';
                });
              }
            }}
            className="rounded-md border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Revocar
          </button>
        </div>
      </div>

      {/* Deletion confirmation dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-foreground/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Solicitar Eliminación de Cuenta</h3>
            <p className="mt-2 text-sm text-muted">
              Esta acción enviará una solicitud de eliminación a tu administrador.
              Una vez aprobada, tus datos personales serán anonimizados de forma irreversible.
            </p>
            <p className="mt-2 text-xs text-subtle">
              Los registros de auditoría se conservarán de forma anonimizada por requisitos de seguridad (ISO 27001).
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Motivo (opcional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Indica por qué deseas eliminar tu cuenta..."
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteReason(''); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deletionMutation.mutate(deleteReason)}
                disabled={deletionMutation.isPending}
                className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-background hover:bg-danger/90 disabled:opacity-50"
              >
                {deletionMutation.isPending ? 'Enviando...' : 'Solicitar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
