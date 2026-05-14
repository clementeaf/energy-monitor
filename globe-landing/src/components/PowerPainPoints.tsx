const PAIN_POINTS = [
  {
    title: 'Cobros Ineficientes',
    description: 'La facturación por metro cuadrado, sin medición real por operador, genera ajustes manuales, errores e injusticias.',
  },
  {
    title: 'Falta de Control',
    description: 'Sin telemetría en tiempo real, los costos operativos aumentan por consumos anómalos no detectados.',
  },
  {
    title: 'Oportunidades Perdidas',
    description: 'Activos con más de 300 kW de consumo permanecen en régimen regulado, perdiendo la ventaja de negociar contratos competitivos.',
  },
  {
    title: 'Mantenimientos Correctivos',
    description: 'Reparar al romper es mucho más caro a largo plazo que el preventivo.',
  },
];

const ClockIcon = () => (
  <div className="w-14 h-14 rounded-full bg-[#f0f2e8] flex items-center justify-center">
    <svg className="w-7 h-7 text-grey-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 16,14" />
      <line x1="3" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
    </svg>
  </div>
);

export function PowerPainPoints() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-12 lg:gap-16">
        {PAIN_POINTS.map((p) => (
          <div key={p.title} className="flex flex-col gap-4">
            <ClockIcon />
            <h3 className="font-heading text-[22px] sm:text-[26px] leading-[1.2] font-extrabold text-grey-900">
              {p.title}
            </h3>
            <p className="font-body text-[15px] sm:text-[16px] leading-[24px] text-grey-600">
              {p.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
