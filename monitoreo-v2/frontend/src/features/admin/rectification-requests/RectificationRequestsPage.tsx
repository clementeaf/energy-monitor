import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rectificationRequestsEndpoints } from '../../../services/endpoints';
import type { RectificationRequestItem } from '../../../services/endpoints';
import { PageHeader } from '../../../components/ui/PageHeader';

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
  approved: { text: 'Aprobada', cls: 'bg-green-100 text-green-800' },
  rejected: { text: 'Rechazada', cls: 'bg-raised text-muted' },
  executed: { text: 'Ejecutada', cls: 'bg-blue-100 text-blue-800' },
};

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo electrónico',
  displayName: 'Nombre',
};

export function RectificationRequestsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RectificationRequestItem | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmExecute, setConfirmExecute] = useState<RectificationRequestItem | null>(null);

  const query = useQuery({
    queryKey: ['rectification-requests'],
    queryFn: () => rectificationRequestsEndpoints.list().then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      rectificationRequestsEndpoints.resolve(id, status, notes || undefined).then((r) => r.data),
    onSuccess: () => {
      setSelected(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['rectification-requests'] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => rectificationRequestsEndpoints.execute(id).then((r) => r.data),
    onSuccess: () => {
      setConfirmExecute(null);
      queryClient.invalidateQueries({ queryKey: ['rectification-requests'] });
    },
  });

  const items = query.data ?? [];
  const pending = items.filter((i) => i.status === 'pending');
  const resolved = items.filter((i) => i.status !== 'pending');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Solicitudes de rectificación"
        eyebrow="Administración"
        description="Gestión de solicitudes ARCO+ de rectificación de datos (Ley 21.719). Plazo máximo: 15 días hábiles."
      />

      {query.isPending && <p className="text-sm text-subtle">Cargando...</p>}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 font-medium text-amber-900">
            Pendientes ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-background p-4 shadow-sm">
                <div>
                  <p className="font-medium text-foreground">{item.userEmail}</p>
                  {item.userDisplayName && (
                    <p className="text-sm text-muted">{item.userDisplayName}</p>
                  )}
                  <p className="mt-1 text-sm text-foreground">
                    <span className="font-medium">Campo:</span> {FIELD_LABELS[item.fieldName] ?? item.fieldName}
                  </p>
                  <p className="text-sm text-muted">
                    <span className="font-medium">Valor actual:</span> {item.currentValue ?? '—'}
                  </p>
                  <p className="text-sm text-muted">
                    <span className="font-medium">Valor solicitado:</span> {item.requestedValue}
                  </p>
                  {item.reason && (
                    <p className="mt-1 text-sm text-muted">Motivo: {item.reason}</p>
                  )}
                  <p className="mt-1 text-xs text-subtle">
                    Solicitado: {new Date(item.requestedAt).toLocaleString('es-CL')}
                    {' · Plazo: '}
                    {new Date(item.responseDeadline).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(item); setNotes(''); }}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
                >
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && !query.isPending && (
        <div className="panel p-6 text-center text-sm text-muted">
          No hay solicitudes pendientes
        </div>
      )}

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <div className="panel">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-medium text-foreground">Historial</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Campo</th>
                <th className="px-6 py-3">Valor solicitado</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Notas</th>
                <th className="px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resolved.map((item) => {
                const badge = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
                return (
                  <tr key={item.id}>
                    <td className="px-6 py-3">{item.userEmail}</td>
                    <td className="px-6 py-3 text-muted">{FIELD_LABELS[item.fieldName] ?? item.fieldName}</td>
                    <td className="px-6 py-3 text-muted">{item.requestedValue}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {new Date(item.requestedAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-3 text-muted">{item.notes ?? '—'}</td>
                    <td className="px-6 py-3">
                      {item.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => setConfirmExecute(item)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Ejecutar cambio
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve modal */}
      {selected && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Gestionar Rectificación</h3>
            <div className="mt-2 space-y-1 text-sm text-muted">
              <p><strong>{selected.userEmail}</strong></p>
              <p>Campo: {FIELD_LABELS[selected.fieldName] ?? selected.fieldName}</p>
              <p>Actual: {selected.currentValue ?? '—'}</p>
              <p>Solicitado: <strong>{selected.requestedValue}</strong></p>
              {selected.reason && <p>Motivo: {selected.reason}</p>}
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-foreground">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Motivo de la decisión..."
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => resolveMutation.mutate({ id: selected.id, status: 'rejected' })}
                disabled={resolveMutation.isPending}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => resolveMutation.mutate({ id: selected.id, status: 'approved' })}
                disabled={resolveMutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute confirmation */}
      {confirmExecute && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Ejecutar Rectificación</h3>
            <p className="mt-2 text-sm text-muted">
              Se actualizará el campo <strong>{FIELD_LABELS[confirmExecute.fieldName] ?? confirmExecute.fieldName}</strong> del
              usuario <strong>{confirmExecute.userEmail}</strong> al valor: <strong>{confirmExecute.requestedValue}</strong>
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmExecute(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeMutation.mutate(confirmExecute.id)}
                disabled={executeMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {executeMutation.isPending ? 'Aplicando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
