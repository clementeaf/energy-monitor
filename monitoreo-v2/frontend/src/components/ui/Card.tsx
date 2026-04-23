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
  default: 'bg-white border border-gray-200 hover:border-gray-300',
  outlined: 'bg-white border border-gray-200 hover:border-gray-300',
  elevated: 'bg-white border border-gray-200 hover:border-gray-300',
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
        `rounded-lg transition-all duration-150 ${VARIANT_CLS[variant]} ` +
        (onClick ? 'cursor-pointer active:scale-[0.99] ' : '') +
        className
      }
    >
      {hasHeader && (
        <div className={`flex items-start justify-between ${noPadding ? 'px-6 pt-6' : 'px-6 pt-6 pb-0'}`}>
          <div>
            {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}
