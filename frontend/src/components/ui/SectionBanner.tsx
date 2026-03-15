interface SectionBannerProps {
  title: string;
  children?: React.ReactNode;
  inline?: boolean;
  className?: string;
}

export function SectionBanner({ title, children, inline, className = '' }: SectionBannerProps) {
  return (
    <div className={`flex items-center ${inline ? 'w-fit' : ''} gap-3 rounded-lg bg-pa-bg-alt px-4 py-2.5 ${className}`}>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{title}</h2>
      {children}
    </div>
  );
}
