import { useState } from 'react';

const INDUSTRIES = [
  { label: 'Oficinas', description: 'Sabemos que cada espacio de trabajo debe funcionar sin interrupciones. Nos encargamos de que todo opere como corresponde, para que las personas puedan enfocarse en lo realmente importante: su trabajo.' },
  { label: 'Hotelería' },
  { label: 'Habitacionales' },
  { label: 'Retail' },
  { label: 'Estatal' },
  { label: 'Clínicas y hospitales' },
  { label: 'Transporte e infraestructura' },
  { label: 'Industrias' },
  { label: 'Entretenimiento' },
  { label: 'Centros educativos' },
];

export function ServicesIndustries() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-grey-50 py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-[128px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px]">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Industrial
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Experiencia comprobada en adaptarnos a tus necesidades
          </h2>
        </div>

        {/* Two columns */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-[80px]">
          {/* Left — industry list */}
          <div className="flex flex-col lg:w-[400px] shrink-0">
            {INDUSTRIES.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(i)}
                  className="flex items-center gap-3 w-full text-left py-4 relative"
                >
                  {/* Arrow — only on active */}
                  <div className={`w-6 shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    <svg className="w-6 h-5" fill="none" viewBox="0 0 38 20" stroke="#1C1C1C" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
                    </svg>
                  </div>
                  <span
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'font-heading text-[22px] leading-[30px] font-extrabold text-[#1C1C1C]'
                        : 'font-body text-[16px] sm:text-[18px] leading-[26px] text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  {/* Underline: black start → grey rest */}
                  <div className="absolute bottom-0 left-0 right-0 h-px">
                    {isActive ? (
                      <div className="w-full h-full" style={{ background: 'linear-gradient(to right, #1C1C1C 30%, #E4E4E4 30%)' }} />
                    ) : (
                      <div className="w-full h-full bg-grey-200" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right — detail panel */}
          <div className="flex-1 flex flex-col gap-6">
            <h3 className="font-heading text-h4 lg:text-h3 text-grey-900">
              {INDUSTRIES[active].label}
            </h3>
            {INDUSTRIES[active].description && (
              <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
                {INDUSTRIES[active].description}
              </p>
            )}
            <div className="w-full h-[300px] sm:h-[380px] rounded bg-grey-200 overflow-hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}
