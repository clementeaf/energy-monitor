import type { ReactNode } from 'react';

type CardVariant = 'default' | 'outlined' | 'elevated';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
  noPadding?: boolean;
}

const VARIANT_CLS: Record<CardVariant, string> = {
  default: 'panel hover:border-subtle',
  outlined: 'panel-muted hover:border-subtle',
  elevated: 'panel shadow-md hover:border-subtle',
};

export function Card({
  children,
  variant = 'default',
  title,
  subtitle,
  action,
  onClick,
  className = '',
  noPadding = false,
}: Readonly<CardProps>) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={
        `transition-all duration-150 ${VARIANT_CLS[variant]} ` +
        (onClick ? 'cursor-pointer active:scale-[0.99] ' : '') +
        className
      }
    >
      {hasHeader && (
        <div className={`flex items-start justify-between ${noPadding ? 'px-6 pt-6' : 'px-6 pt-6 pb-0'}`}>
          <div>
            {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? 'flex min-h-0 flex-1 flex-col' : 'p-6'}>{children}</div>
    </div>
  );
}
