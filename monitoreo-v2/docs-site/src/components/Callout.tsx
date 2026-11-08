import type { ReactNode } from 'react';

const icons: Record<string, string> = {
  note: 'ℹ',
  tip: '💡',
  warning: '⚠',
};

export function Callout({ type = 'note', children }: { type?: 'note' | 'tip' | 'warning'; children: ReactNode }) {
  return (
    <div className={`callout callout-${type} flex gap-2`}>
      <span>{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}
