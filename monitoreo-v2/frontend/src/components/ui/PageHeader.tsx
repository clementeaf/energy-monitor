import type { ReactNode, ReactElement } from 'react';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Handle-style page title block with optional eyebrow and actions row.
 * @param title - Main page heading
 * @param eyebrow - Small uppercase label above title
 * @param description - Muted subtitle below title
 * @param actions - Right-aligned controls (filters, buttons)
 * @param className - Optional wrapper classes
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className = '',
}: Readonly<PageHeaderProps>): ReactElement {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{eyebrow}</p>
        )}
        <h1 className={`font-semibold tracking-tight text-foreground ${eyebrow ? 'mt-1 text-2xl' : 'text-2xl'}`}>
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
