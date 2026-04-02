import type { ReactNode } from 'react';

type CardVariant = 'default' | 'outlined' | 'elevated';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  /** Optional header section */
  title?: string;
  subtitle?: string;
  /** Top-right slot (badge, button, icon) */
  action?: ReactNode;
  /** Clickable card */
  onClick?: () => void;
  className?: string;
  /** Remove internal padding */
  noPadding?: boolean;
}

const VARIANT_CLS: Record<CardVariant, string> = {
  default: 'bg-white shadow-sm ring-1 ring-gray-200',
  outlined: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-md',
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
}: CardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      onClick={onClick}
      className={
        `rounded-lg ${VARIANT_CLS[variant]} ` +
        (onClick ? 'cursor-pointer transition-shadow hover:shadow-md ' : '') +
        className
      }
    >
      {hasHeader && (
        <div className={`flex items-start justify-between ${noPadding ? 'px-4 pt-4' : 'px-4 pt-4 pb-0'}`}>
          <div>
            {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}
