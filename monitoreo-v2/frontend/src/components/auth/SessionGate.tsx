import type { ReactNode } from 'react';
import { useSessionResolver } from '../../hooks/auth/useSessionResolver';
import { useAuthStore } from '../../store/useAuthStore';

export function SessionGate({ children }: Readonly<{ children: ReactNode }>) {
  useSessionResolver();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
      </div>
    );
  }

  return children;
}
