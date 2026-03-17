import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-pa-text">{title}</h3>
        <p className="mt-2 text-xs text-pa-text-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-pa-border px-3 py-1.5 text-xs text-pa-text transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
