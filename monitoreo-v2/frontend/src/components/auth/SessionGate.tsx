import type { ReactNode } from 'react';
import { useSessionResolver } from '../../hooks/auth/useSessionResolver';
import { useAuthStore } from '../../store/useAuthStore';

export function SessionGate({ children }: { children: ReactNode }) {
  useSessionResolver();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[var(--color-primary,#3D3BF3)]" />
      </div>
    );
  }

  return children;
}
