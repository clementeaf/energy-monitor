interface PillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PillButton({ children, onClick, className = '', disabled }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border border-pa-blue px-2.5 py-0.5 text-[11px] font-medium text-pa-blue transition-colors hover:bg-pa-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-pa-blue ${className}`}
    >
      {children}
    </button>
  );
}
