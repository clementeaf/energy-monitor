import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isPending?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar', confirmVariant = 'danger', isPending }: Readonly<ConfirmDialogProps>) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={confirmVariant} size="md" onClick={onConfirm} loading={isPending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
