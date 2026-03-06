import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-4 ${onClick ? 'cursor-pointer hover:border-accent' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
