import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deletionRequestsEndpoints } from '../../../services/endpoints';
import type { DeletionRequestItem } from '../../../services/endpoints';

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
  approved: { text: 'Aprobada', cls: 'bg-green-100 text-green-800' },
  rejected: { text: 'Rechazada', cls: 'bg-gray-100 text-gray-600' },
  executed: { text: 'Ejecutada', cls: 'bg-red-100 text-red-800' },
};

export function DeletionRequestsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<DeletionRequestItem | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmExecute, setConfirmExecute] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: () => deletionRequestsEndpoints.list().then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      deletionRequestsEndpoints.resolve(id, status, notes || undefined).then((r) => r.data),
    onSuccess: () => {
      setSelected(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => deletionRequestsEndpoints.execute(id).then((r) => r.data),
    onSuccess: () => {
      setConfirmExecute(null);
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
    },
  });

  const items = query.data ?? [];
  const pending = items.filter((i) => i.status === 'pending');
  const resolved = items.filter((i) => i.status !== 'pending');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitudes de Eliminación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de solicitudes ARCO+ (Ley 21.719). Plazo máximo: 15 días hábiles.
        </p>
      </div>

      {query.isPending && <p className="text-sm text-gray-400">Cargando...</p>}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 font-medium text-amber-900">
            Pendientes ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.userEmail}</p>
                  {item.userDisplayName && (
                    <p className="text-sm text-gray-500">{item.userDisplayName}</p>
                  )}
                  {item.reason && (
                    <p className="mt-1 text-sm text-gray-600">Motivo: {item.reason}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Solicitado: {new Date(item.requestedAt).toLocaleString('es-CL')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(item); setNotes(''); }}
                  className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && !query.isPending && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No hay solicitudes pendientes
        </div>
      )}

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-medium text-gray-900">Historial</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha solicitud</th>
                <th className="px-6 py-3">Resuelto por</th>
                <th className="px-6 py-3">Notas</th>
                <th className="px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resolved.map((item) => {
                const badge = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
                return (
                  <tr key={item.id}>
                    <td className="px-6 py-3">{item.userEmail}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(item.requestedAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{item.resolvedByEmail ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{item.notes ?? '—'}</td>
                    <td className="px-6 py-3">
                      {item.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => setConfirmExecute(item.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Ejecutar eliminación
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Gestionar Solicitud</h3>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{selected.userEmail}</strong>
              {selected.reason && <> — {selected.reason}</>}
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Motivo de la decisión..."
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => resolveMutation.mutate({ id: selected.id, status: 'rejected' })}
                disabled={resolveMutation.isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-red-900">Ejecutar Eliminación</h3>
            <p className="mt-2 text-sm text-gray-600">
              Esta acción es <strong>irreversible</strong>. Los datos personales del usuario serán
              anonimizados permanentemente. Los registros de auditoría se conservan con referencia anonimizada.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmExecute(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeMutation.mutate(confirmExecute)}
                disabled={executeMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {executeMutation.isPending ? 'Anonimizando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
