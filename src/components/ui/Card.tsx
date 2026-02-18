import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`border border-[#e0e0e0] bg-white p-4 ${onClick ? 'cursor-pointer hover:border-[#999]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
