import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { SIDEBAR_MOTION_MS } from './sidebar-motion';

interface SidebarFlyoutProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Floating panel anchored to the right of the icon rail with enter/exit motion.
 * @param open - Whether the flyout is visible
 * @param onClose - Called when clicking outside
 * @param title - Header label inside the flyout
 * @param children - Flyout body content
 * @param className - Optional width or spacing overrides
 */
export function SidebarFlyout({
  open,
  onClose,
  title,
  children,
  className = 'w-52',
}: Readonly<SidebarFlyoutProps>): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<boolean>(open);
  const [visible, setVisible] = useState<boolean>(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), SIDEBAR_MOTION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      ref={ref}
      className={`absolute left-full top-0 z-50 ml-2 overflow-hidden rounded-lg border border-border bg-background shadow-[var(--shadow-float)] transition-all duration-300 ease-out motion-reduce:transition-none ${className} ${
        visible
          ? 'pointer-events-auto translate-x-0 opacity-100'
          : 'pointer-events-none -translate-x-2 opacity-0'
      }`}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}
