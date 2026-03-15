interface PillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PillButton({ children, onClick, className = '' }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border border-pa-blue px-2.5 py-0.5 text-[11px] font-medium text-pa-blue transition-colors hover:bg-pa-blue hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}
