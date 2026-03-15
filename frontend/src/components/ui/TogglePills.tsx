interface TogglePillsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function TogglePills<T extends string>({ options, value, onChange }: TogglePillsProps<T>) {
  return (
    <div className="flex rounded-full border border-pa-border text-[12px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
            value === opt.value ? 'bg-pa-navy text-white' : 'text-pa-navy hover:bg-pa-navy/10'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
