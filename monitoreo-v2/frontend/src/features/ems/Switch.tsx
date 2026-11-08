export function Switch({ checked, disabled = false, label, onChange }: Readonly<{ checked: boolean; disabled?: boolean; label: string; onChange: () => void }>) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-border-strong'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-fg transition-transform ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}
