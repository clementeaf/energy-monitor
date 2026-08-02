import type { ReactNode } from 'react';

export function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      {children}
    </div>
  );
}

export function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  disabled,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          disabled={disabled}
          className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          disabled={disabled}
          maxLength={7}
          className="w-24 rounded-md border border-border px-2 py-1.5 text-sm font-mono disabled:bg-surface"
        />
      </div>
    </label>
  );
}

export function Swatch({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <div className="text-center" title={`${label}: ${color}`}>
      <div
        className="size-6 rounded border border-border"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
