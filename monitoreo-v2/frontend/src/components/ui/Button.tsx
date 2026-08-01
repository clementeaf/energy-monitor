import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-fg hover:bg-brand-hover focus:ring-border',
  secondary:
    'border border-border bg-background text-foreground hover:bg-surface hover:border-subtle focus:ring-border',
  danger:
    'bg-danger text-background hover:opacity-90 focus:ring-danger',
  ghost:
    'text-muted hover:bg-surface hover:text-foreground focus:ring-border',
};

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: Readonly<ButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium ' +
        'transition-all duration-150 ease-in-out ' +
        'focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
        'disabled:opacity-40 disabled:cursor-not-allowed ' +
        'active:scale-[0.98] ' +
        `${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`
      }
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
