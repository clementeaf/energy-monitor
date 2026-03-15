import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type DrawerSide = 'right' | 'left' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  title?: string;
  className?: string;
  overlayClose?: boolean;
}

const sizeMap: Record<DrawerSide, Record<DrawerSize, string>> = {
  right: { sm: 'w-80', md: 'w-96', lg: 'w-fit max-w-[90vw]', xl: 'w-fit max-w-[90vw]', full: 'w-screen' },
  left:  { sm: 'w-80', md: 'w-96', lg: 'w-fit max-w-[90vw]', xl: 'w-fit max-w-[90vw]', full: 'w-screen' },
  top:   { sm: 'h-48', md: 'h-64', lg: 'h-96', xl: 'h-[32rem]', full: 'h-screen' },
  bottom:{ sm: 'h-48', md: 'h-64', lg: 'h-96', xl: 'h-[32rem]', full: 'h-screen' },
};

const positionMap: Record<DrawerSide, string> = {
  right:  'inset-y-0 right-0',
  left:   'inset-y-0 left-0',
  top:    'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
};

const translateOpen: Record<DrawerSide, string> = {
  right:  'translate-x-0',
  left:   'translate-x-0',
  top:    'translate-y-0',
  bottom: 'translate-y-0',
};

const translateClosed: Record<DrawerSide, string> = {
  right:  'translate-x-full',
  left:   '-translate-x-full',
  top:    '-translate-y-full',
  bottom: 'translate-y-full',
};

export function Drawer({
  open,
  onClose,
  children,
  side = 'right',
  size = 'md',
  title,
  className = '',
  overlayClose = true,
}: Readonly<DrawerProps>) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap: focus panel on open
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className='fixed inset-0 z-50'>
      {/* Overlay */}
      <div
        className='absolute inset-0 bg-black/40 transition-opacity duration-300'
        onClick={overlayClose ? onClose : undefined}
        aria-hidden='true'
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={title ?? 'Drawer'}
        tabIndex={-1}
        className={[
          'absolute flex flex-col bg-surface shadow-xl outline-none',
          'transition-transform duration-300 ease-in-out',
          positionMap[side],
          sizeMap[side][size],
          open ? translateOpen[side] : translateClosed[side],
          className,
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div className='flex items-center justify-between border-b border-border px-5 py-4'>
            <h2 className='text-lg font-semibold text-text'>{title}</h2>
            <button
              onClick={onClose}
              className='rounded p-1 text-muted hover:bg-raised hover:text-text transition-colors'
              aria-label='Cerrar'
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className='flex-1 overflow-y-auto p-5'>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
