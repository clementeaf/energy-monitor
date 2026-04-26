import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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

const DURATION = 250;

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  footer,
}: Readonly<DrawerProps>) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount → visible (allow CSS transition to kick in)
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), DURATION);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mounted, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mounted]);

  if (!mounted) return null;

  const isRight = side === 'right';
  const translateCls = visible
    ? 'translate-x-0'
    : isRight ? 'translate-x-full' : '-translate-x-full';

  const positionCls = isRight
    ? 'right-0 rounded-l-xl'
    : 'left-0 rounded-r-xl';

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop — transparent, just catches clicks */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={
          `absolute inset-y-0 flex h-full flex-col border-none bg-white shadow-2xl ` +
          `transition-transform ease-out ` +
          `${positionCls} ${SIZE_CLS[size]} ${translateCls}`
        }
        style={{ transitionDuration: `${DURATION}ms` }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
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
      </div>
    </div>,
    document.body,
  );
}
