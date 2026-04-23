import { useEffect, useRef, type ReactNode } from 'react';

type DrawerSide = 'left' | 'right';
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  footer?: ReactNode;
  dialogClassName?: string;
}

const SIZE_CLS: Record<DrawerSize, string> = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[40rem]',
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  footer,
  dialogClassName,
}: Readonly<DrawerProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = useRef(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !isOpen.current) {
      el.showModal();
      isOpen.current = true;
    }
    if (!open && isOpen.current) {
      el.close();
      isOpen.current = false;
    }
  }, [open]);

  const handleClose = () => {
    isOpen.current = false;
    onClose();
  };

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) handleClose();
  };

  const positionCls = side === 'left'
    ? 'mr-auto ml-0 rounded-r-lg'
    : 'ml-auto mr-0 rounded-l-lg';

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClose(); } }}
      className={
        dialogClassName ??
        `fixed inset-y-0 m-0 flex h-full max-h-full flex-col bg-white p-0 shadow-xl ` +
        `backdrop:bg-black/50 backdrop:backdrop-blur-sm ` +
        `${positionCls} ${SIZE_CLS[size]}`
      }
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="shrink-0 border-t border-gray-200 px-6 py-4">{footer}</div>
      )}
    </dialog>
  );
}
