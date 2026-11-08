export function PageAction({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button type="button" onClick={onClick} className="flex h-9 shrink-0 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-fg transition-colors hover:bg-primary-hover">
      {label}
    </button>
  );
}
