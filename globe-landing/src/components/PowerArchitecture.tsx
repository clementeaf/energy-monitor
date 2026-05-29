import { useState } from 'react';

const ITEMS = [
  {
    title: 'Mantenimiento eléctrico',
    description: 'Mantenemos tableros, generadores, UPS, transformadores y condensadores bajo planes preventivos y predictivos para reducir fallas, extender vida útil y cumplir normativas SEC y NSEG.',
  },
  {
    title: 'Cliente Libre',
    description: 'Asesoramos a empresas con demandas superiores a 500 kW en la migración al mercado de Cliente Libre: análisis de perfil de consumo, evaluación de contratos y acompañamiento en la negociación directa con generadoras.',
  },
  {
    title: 'EMS Energy Management System',
    description: 'Implementamos plataformas de monitoreo energético en tiempo real para instalaciones multi-sede: centraliza datos de medidores inteligentes, detecta anomalías, genera reportes automáticos y optimiza decisiones operacionales.',
  },
  {
    title: 'Eficiencia energética',
    description: 'Analizamos el perfil de consumo e identificamos oportunidades de reducción mediante automatización, corrección del factor de potencia, gestión de demanda y sustitución de equipos para lograr ahorro mensual medible.',
  },
];

export function PowerArchitecture() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 lg:py-[100px] px-5 sm:px-10 lg:px-[60px] bg-[#fafafa]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-16">
        {/* Left: text */}
        <div className="flex flex-col gap-4 lg:max-w-[40%]">
          <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
            ARQUITECTURA COMPLETA
          </span>
          <h2 className="font-heading text-[32px] sm:text-[36px] lg:text-[40px] leading-[1.15] font-extrabold text-grey-900">
            Un modelo de servicio integrado para infraestructura eléctrica crítica
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500 mt-2">
            Globe Power cubre las cuatro dimensiones del control energético empresarial: estado físico de equipos, costo del suministro, visibilidad del consumo y eficiencia operacional.
          </p>
        </div>

        {/* Right: accordion */}
        <div className="flex flex-col lg:w-[50%]">
          {ITEMS.map((item, i) => {
            const isActive = active === i;
            return (
              <div key={item.title} className="relative border-b border-grey-200">
                <button
                  type="button"
                  onClick={() => setActive(isActive ? -1 : i)}
                  className="w-full flex items-center gap-3 py-5 text-left"
                >
                  {isActive && (
                    <span className="shrink-0 text-grey-900 text-[18px] leading-none">&rarr;</span>
                  )}
                  <span className={`font-heading text-[16px] sm:text-[18px] leading-[24px] text-grey-900 ${isActive ? 'font-bold' : 'font-normal'}`}>
                    {item.title}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isActive ? 'max-h-[300px] pb-5' : 'max-h-0'
                  }`}
                >
                  {isActive && (
                    <p className="font-body text-[14px] sm:text-[15px] leading-[24px] text-grey-500 pl-8">
                      {item.description}
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-1/4 h-[2px] bg-grey-900" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
