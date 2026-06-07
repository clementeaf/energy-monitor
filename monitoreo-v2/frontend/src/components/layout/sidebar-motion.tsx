import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

export const SIDEBAR_MOTION_MS = 300;

interface SidebarCollapsibleProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Smooth height + opacity collapse (grid 0fr/1fr pattern).
 * @param open - Whether content is visible
 * @param children - Collapsible body
 * @param className - Optional wrapper classes
 */
export function SidebarCollapsible({
  open,
  children,
  className = '',
}: Readonly<SidebarCollapsibleProps>): ReactElement {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${className}`}
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

interface SidebarRevealProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Smooth horizontal reveal for labels when the sidebar expands.
 * @param show - Whether content should be visible
 * @param children - Text or inline controls to reveal
 * @param className - Optional extra classes on the wrapper
 */
export function SidebarReveal({
  show,
  children,
  className = '',
}: Readonly<SidebarRevealProps>): ReactElement {
  return (
    <span
      className={`inline-flex min-w-0 items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out motion-reduce:transition-none ${
        show ? 'max-w-[12rem] flex-1 opacity-100' : 'max-w-0 flex-none opacity-0'
      } ${className}`}
      aria-hidden={!show}
    >
      {children}
    </span>
  );
}

interface SidebarDropdownPanelProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Animated dropdown panel for sidebar switchers.
 * @param open - Whether the panel is open
 * @param children - Dropdown content
 * @param className - Position and layout classes
 */
export function SidebarDropdownPanel({
  open,
  children,
  className = '',
}: Readonly<SidebarDropdownPanelProps>): ReactElement | null {
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

  if (!mounted) return null;

  return (
    <div
      className={`absolute left-0 right-0 z-50 mt-1 origin-top overflow-hidden rounded-lg border border-border bg-background shadow-lg transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}
