interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE = {
  sm: { track: 'h-5 w-9', knob: 'size-3.5', translate: 'translate-x-4' },
  md: { track: 'h-6 w-11', knob: 'size-4', translate: 'translate-x-5' },
};

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
}: Readonly<ToggleProps>) {
  const s = SIZE[size];

  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          `relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3D3BF3)] focus:ring-offset-1 ${s.track} ` +
          (checked ? 'bg-[var(--color-primary,#3D3BF3)]' : 'bg-gray-300')
        }
      >
        <span
          className={
            `inline-block rounded-full bg-white shadow transition-transform duration-200 ${s.knob} ` +
            (checked ? s.translate : 'translate-x-1')
          }
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}
