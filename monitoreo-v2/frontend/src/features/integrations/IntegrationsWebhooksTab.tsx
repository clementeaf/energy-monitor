import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Th, Td, ActionBtn } from '../../components/ui/TablePrimitives';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useWebhookSubscriptionsQuery,
  useCreateWebhookSubscription,
  useUpdateWebhookSubscription,
  useDeleteWebhookSubscription,
} from '../../hooks/queries/useWebhooksQuery';
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookSubscription,
  type WebhookEventType,
  type CreateWebhookSubscriptionPayload,
} from '../../types/webhook';

const EVENT_LABELS: Record<WebhookEventType, string> = {
  'reading.stale': 'Lectura obsoleta',
  'alert.created': 'Alerta creada',
  'meter.offline': 'Medidor offline',
  'gap.detected': 'Brecha detectada',
};

const EVENT_OPTIONS = WEBHOOK_EVENT_TYPES.map((value) => ({
  value,
  label: EVENT_LABELS[value],
}));

/**
 * CRUD tab for outbound webhook subscriptions (HMAC-signed HTTP callbacks).
 */
export function IntegrationsWebhooksTab() {
  const { has } = usePermissions();
  const canRead = has('webhooks', 'read');
  const canCreate = has('webhooks', 'create');
  const canUpdate = has('webhooks', 'update');
  const canDelete = has('webhooks', 'delete');

  const [eventFilter, setEventFilter] = useState('');
  const query = useWebhookSubscriptionsQuery(
    eventFilter ? { eventType: eventFilter } : undefined,
    { enabled: canRead },
  );
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });

  const createMutation = useCreateWebhookSubscription();
  const updateMutation = useUpdateWebhookSubscription();
  const deleteMutation = useDeleteWebhookSubscription();

  const allRows = query.data ?? [];
  const { visible: visibleRows, hasMore, sentinelRef, total } = useInfiniteScroll(allRows, [eventFilter]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<WebhookSubscription | null>(null);

  const [formEventType, setFormEventType] = useState<WebhookEventType>('alert.created');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');

  if (!canRead) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-muted">
        No tiene permisos para ver webhooks salientes.
      </div>
    );
  }

  const resetForm = (): void => {
    setFormEventType('alert.created');
    setFormUrl('');
    setFormSecret('');
  };

  const handleCreate = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!formUrl.trim() || formSecret.length < 16) return;

    const payload: CreateWebhookSubscriptionPayload = {
      eventType: formEventType,
      url: formUrl.trim(),
      secret: formSecret,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false);
        resetForm();
      },
    });
  };

  const handleToggleActive = (row: WebhookSubscription): void => {
    updateMutation.mutate({ id: row.id, payload: { active: !row.active } });
  };

  const handleDelete = (): void => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Suscripciones HTTP salientes con firma HMAC para eventos del sistema.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownSelect
            options={[{ value: '', label: 'Todos los eventos' }, ...EVENT_OPTIONS]}
            value={eventFilter}
            onChange={setEventFilter}
            className="w-52"
          />
          {canCreate && (
            <button
              type="button"
              onClick={() => { resetForm(); setCreateOpen(true); }}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
            >
              Nueva suscripcion
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Evento</Th>
              <Th>URL destino</Th>
              <Th>Activa</Th>
              <Th>Creada</Th>
              {(canUpdate || canDelete) && <Th></Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={(canUpdate || canDelete) ? 5 : 4}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay suscripciones webhook configuradas."
            skeletonWidths={['w-28', 'w-48', 'w-16', 'w-24', 'w-16']}
          >
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-surface">
                <Td>
                  <span className="font-medium text-foreground">{EVENT_LABELS[row.eventType]}</span>
                  <span className="ml-2 text-xs text-subtle">{row.eventType}</span>
                </Td>
                <Td className="max-w-xs truncate font-mono text-xs" title={row.url}>{row.url}</Td>
                <Td>
                  <Toggle
                    checked={row.active}
                    onChange={() => { handleToggleActive(row); }}
                    size="sm"
                    disabled={!canUpdate}
                  />
                </Td>
                <Td>{new Date(row.createdAt).toLocaleDateString('es-CL')}</Td>
                {(canUpdate || canDelete) && (
                  <Td>
                    {canDelete && (
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(row); }} variant="danger" />
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && (
        <p className="text-xs text-muted">Mostrando {visibleRows.length} de {total}</p>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); }} title="Nueva suscripcion webhook">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Tipo de evento" required>
            <DropdownSelect
              options={EVENT_OPTIONS}
              value={formEventType}
              onChange={(val) => { setFormEventType(val as WebhookEventType); }}
              className="w-full"
            />
          </Field>
          <Field label="URL destino" required>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => { setFormUrl(e.target.value); }}
              required
              placeholder="https://hooks.example.com/events"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Secret HMAC (min. 16 caracteres)" required>
            <input
              type="password"
              value={formSecret}
              onChange={(e) => { setFormSecret(e.target.value); }}
              required
              minLength={16}
              autoComplete="new-password"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={() => { setCreateOpen(false); }}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={formSecret.length < 16 || !formUrl.trim()}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar suscripcion"
        message={`Eliminar webhook para "${deleting ? EVENT_LABELS[deleting.eventType] : ''}"?`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
