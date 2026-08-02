import type { ReactNode, ReactElement } from 'react';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className = '',
}: Readonly<PageHeaderProps>): ReactElement {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{eyebrow}</p>
        )}
        <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
