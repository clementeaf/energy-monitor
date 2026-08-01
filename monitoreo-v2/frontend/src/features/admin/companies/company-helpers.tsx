export function SectionHeader({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {children}
      </p>
    </div>
  );
}

export function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <div className="mb-1 block text-xs font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}

export function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}
