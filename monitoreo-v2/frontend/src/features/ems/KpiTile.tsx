import type { ReactNode } from 'react';

type KpiTone = 'neutral' | 'positive' | 'negative';

const VARIANT_CLS = {
  surface: { box: 'bg-card text-card-fg', label: 'text-card-muted', sub: 'text-muted' },
  subtle: { box: 'bg-raised text-foreground', label: 'text-muted', sub: 'text-muted' },
  inverse: { box: 'bg-primary text-primary-fg', label: 'text-primary-fg/70', sub: 'text-primary-fg/70' },
} as const;

const TONE_CLS: Record<KpiTone, string> = {
  neutral: '',
  positive: 'text-success',
  negative: 'text-danger',
};

export function KpiTile({ label, value, unit, sub, variant = 'surface', tone = 'neutral', onClick }: Readonly<{
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  variant?: keyof typeof VARIANT_CLS;
  tone?: KpiTone;
  onClick?: () => void;
}>) {
  const cls = VARIANT_CLS[variant];
  const content = (
    <>
      <p className={`text-xs ${cls.label}`}>{label}</p>
      <p className={`mt-1 break-words font-mono text-xl font-semibold tabular-nums sm:text-2xl ${TONE_CLS[tone]}`}>
        {value}
        {unit && <span className={`ml-1 text-sm font-normal ${cls.label}`}>{unit}</span>}
      </p>
      {sub && <p className={`mt-1 text-[11px] ${cls.sub}`}>{sub}</p>}
    </>
  );
  const box = `min-w-0 rounded-xl px-4 py-3 text-left ${cls.box}`;
  return onClick
    ? <button type="button" onClick={onClick} className={`${box} transition-opacity hover:opacity-90`}>{content}</button>
    : <div className={box}>{content}</div>;
}
