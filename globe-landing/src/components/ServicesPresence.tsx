const STATS = [
  { icon: 'building', value: '400+', label: 'Edificios atendidos' },
  { icon: 'clock', value: '24/7', label: 'Averías y emergencias' },
  { icon: 'timer', value: '≤ 2h', label: 'SLA de respuesta' },
];

function StatIcon({ type }: { type: string }) {
  switch (type) {
    case 'building':
      return (
        <svg className="w-11 h-11" viewBox="0 0 44 44" fill="none" stroke="#1C1C1C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 38h32M10 38V10l12-4v32M22 38V14l12 4v20M16 16v2M16 22v2M16 28v2M28 22v2M28 28v2" />
        </svg>
      );
    case 'clock':
      return (
        <svg className="w-11 h-11" viewBox="0 0 44 44" fill="none" stroke="#1C1C1C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22" cy="22" r="16" />
          <path d="M22 14v8l5 5" />
        </svg>
      );
    case 'timer':
      return (
        <svg className="w-11 h-11" viewBox="0 0 44 44" fill="none" stroke="#1C1C1C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22" cy="24" r="14" />
          <path d="M22 16v8l4 4M18 6h8M22 6v4" />
        </svg>
      );
    default:
      return null;
  }
}

export function ServicesPresence() {
  return (
    <section className="py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10 lg:gap-[80px] lg:items-end">
        {/* Left column — text */}
        <div className="flex flex-col gap-6 lg:max-w-[593px]">
          <div className="flex flex-col gap-[8px]">
            <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
              Presencia
            </span>
            <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
              Operamos a lo largo de todo Chile
            </h2>
          </div>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
            Estamos presentes a lo largo de Chile, con equipos preparados para actuar rápidamente donde se nos necesite, garantizando soporte continuo y soluciones eficientes en terreno.
          </p>
        </div>

        {/* Right column — stats */}
        <div className="flex gap-10 lg:gap-[40px]">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-3">
              <StatIcon type={stat.icon} />
              <div className="flex flex-col gap-1">
                <span className="font-heading text-h1 text-grey-900">{stat.value}</span>
                <span className="font-body text-[14px] sm:text-[16px] leading-[24px] text-grey-700 whitespace-nowrap">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
