const PILLS = [
  'Presencia en más de 5 regiones de Chile',
  'Monitoreo remoto 24/7 multi-sitio',
  'Tiempo de respuesta técnica en terreno',
  'Operación continua sin dependencia de un único equipo',
];

export function PowerPresence() {
  return (
    <section className="py-20 lg:py-[100px] px-5 sm:px-10 lg:px-[60px] bg-[#fafafa]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-20">
        {/* Left: text */}
        <div className="flex flex-col gap-4 lg:max-w-[480px]">
          <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
            PRESENCIA
          </span>
          <h2 className="font-heading text-[32px] sm:text-[36px] lg:text-[40px] leading-[1.15] font-extrabold text-grey-900">
            Cobertura nacional con equipos técnicos en terreno
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500 mt-2">
            Monitoreo remoto 24/7 y equipos locales en todo Chile para intervención rápida.
          </p>
        </div>

        {/* Right: pills */}
        <div className="flex flex-col gap-3 lg:pt-4">
          {PILLS.map((text) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-full bg-[#f0f5ed] px-6 py-3.5"
            >
              <svg className="w-5 h-5 shrink-0 text-[#4a6741]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-body text-[15px] leading-[20px] text-grey-800">
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA centered */}
      <div className="flex justify-center mt-16">
        <a
          href="#contacto"
          className="inline-flex items-center gap-3 rounded-full border border-grey-400 px-7 py-3.5 font-body text-[15px] leading-[20px] font-medium text-grey-800 hover:bg-grey-100 transition-colors"
        >
          Hablar con un especialista
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
