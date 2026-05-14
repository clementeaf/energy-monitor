const STATS = [
  {
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="32" height="24" rx="2" />
        <line x1="4" y1="16" x2="36" y2="16" />
        <line x1="4" y1="24" x2="36" y2="24" />
        <line x1="16" y1="8" x2="16" y2="32" />
        <line x1="28" y1="8" x2="28" y2="32" />
      </svg>
    ),
    value: '0000',
    label: 'Lorem ipsum',
  },
  {
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L8 14v12l12 8 12-8V14L20 6z" />
        <line x1="20" y1="6" x2="20" y2="26" />
        <line x1="8" y1="14" x2="20" y2="22" />
        <line x1="32" y1="14" x2="20" y2="22" />
      </svg>
    ),
    value: '0000',
    label: 'Lorem ipsum',
  },
  {
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="20" r="14" />
        <polyline points="20,10 20,20 28,24" />
        <line x1="4" y1="20" x2="8" y2="20" />
        <line x1="32" y1="20" x2="36" y2="20" />
      </svg>
    ),
    value: '0000',
    label: 'Lorem ipsum',
  },
];

export function PowerPresence() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-16">
        {/* Left: text */}
        <div className="flex flex-col gap-4 lg:max-w-[55%]">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Presencia
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Operamos a lo largo de todo Chile
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[24px] text-grey-600">
            Estamos presentes a lo largo de Chile, con equipos preparados para actuar rápidamente donde se nos necesite, garantizando soporte continuo y soluciones eficientes en terreno.
          </p>
        </div>

        {/* Right: stats */}
        <div className="flex items-start gap-8 sm:gap-12 lg:gap-16 lg:pt-8">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              <div className="text-grey-700">{s.icon}</div>
              <span className="font-heading text-[28px] sm:text-[32px] leading-[1.2] font-extrabold text-grey-900">
                {s.value}
              </span>
              <span className="font-body text-[13px] sm:text-[14px] leading-[18px] text-grey-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
