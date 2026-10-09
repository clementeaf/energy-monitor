import { useToastStore } from '../../store/useToastStore';

export function Toast() {
  const message = useToastStore((s) => s.message);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-raised px-4 py-2.5 text-sm text-foreground shadow-float">
          <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          {message}
        </div>
      )}
    </div>
  );
}
