const CARDS = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </svg>
    ),
    title: 'Socio técnico-operacional, no solo un proveedor',
    description: 'Nos integramos como partner de largo plazo: mantenemos, monitoreamos y optimizamos tu infraestructura eléctrica con reportería y trazabilidad en cada intervención.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h16" />
        <circle cx="19" cy="12" r="3" />
      </svg>
    ),
    title: 'Reducción de costos vía Cliente Libre',
    description: 'Evaluamos si tu empresa califica para el mercado de Cliente Libre (+500 kW) y gestionamos la migración para negociar directamente con generadoras, logrando ahorros típicos de entre 15 y 30%.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h16" />
        <circle cx="19" cy="12" r="3" />
      </svg>
    ),
    title: 'Cobro exacto por consumo real',
    description: 'Implementamos medición inteligente que elimina estimaciones y prorrateos: cada unidad o local paga exactamente lo que consume.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h16" />
        <circle cx="19" cy="12" r="3" />
      </svg>
    ),
    title: 'Mantenimiento que previene fallas, no solo las repara',
    description: 'Aplicamos mantenimiento preventivo, predictivo y correctivo sobre generadores, tableros, UPS, transformadores y climatización, cumpliendo normativa técnica vigente en Chile.',
  },
];

export function PowerValueProp() {
  return (
    <section className="py-20 lg:py-[100px] px-5 sm:px-10 lg:px-[60px] bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Header — centered */}
        <div className="flex flex-col items-center text-center gap-4 mb-16 lg:mb-20">
          <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
            PROPUESTA DE VALOR
          </span>
          <h2 className="font-heading text-[32px] sm:text-[36px] lg:text-[42px] leading-[1.15] font-extrabold text-grey-900 max-w-[900px]">
            Control real sobre el gasto y la continuidad eléctrica de tu empresa
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500 max-w-[900px]">
            Ayudamos a empresas con infraestructura crítica a controlar su consumo, reducir costos y garantizar continuidad eléctrica, integrando mantenimiento especializado, medición exacta y acceso al mercado de Cliente Libre.
          </p>
        </div>

        {/* 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-14 lg:gap-y-16">
          {CARDS.map((card) => (
            <div key={card.title} className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f0f5ed] flex items-center justify-center text-[#4a6741]">
                {card.icon}
              </div>
              <h3 className="font-heading text-[22px] sm:text-[24px] leading-[1.2] font-bold text-grey-900">
                {card.title}
              </h3>
              <p className="font-body text-[15px] leading-[24px] text-grey-500">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
