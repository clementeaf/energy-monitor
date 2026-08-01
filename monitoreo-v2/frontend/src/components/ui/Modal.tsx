import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  dialogClassName?: string;
}

export function Modal({ open, onClose, title, children, dialogClassName }: Readonly<ModalProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={
        dialogClassName ??
        'm-auto max-w-lg panel p-0 backdrop:bg-foreground/50 backdrop:backdrop-blur-sm'
      }
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-subtle transition-all duration-150 hover:bg-surface hover:text-muted"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </dialog>
  );
}
