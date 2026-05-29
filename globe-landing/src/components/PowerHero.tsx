import { useState, useEffect, useCallback } from 'react';
import heroCity from '../assets/power/hero-city.png';
import hero1 from '../assets/power/hero1.jpg';
import logoPower from '../assets/power/logo-power.png';

const SLIDES = [
  {
    image: heroCity,
    category: 'QUIÉNES SOMOS',
    title: 'Gestión energética e infraestructura eléctrica crítica para empresas en Chile',
    description: 'Infraestructura eléctrica crítica para empresas en Chile: generadores, climatización, monitoreo y Cliente Libre.',
    cta: 'Habla con un especialista',
  },
  {
    image: hero1,
    category: 'NOSOTROS',
    title: 'Ingeniería eléctrica operacional para activos críticos en Chile',
    description: 'Operación y mantenimiento de infraestructura eléctrica industrial y comercial en todo Chile. Mantenimiento, monitoreo EMS, subdistribución y Cliente Libre, tecnología Siemens.',
    cta: 'Hablar con un especialista',
  },
];

const SLIDE_INTERVAL = 6000;

const HERO_GRADIENT =
  'linear-gradient(0deg, rgba(60, 60, 60, 0.72) 0%, rgba(145, 52, 55, 0) 117.5%), linear-gradient(0deg, rgba(28, 28, 28, 0.72) 0%, rgba(60, 60, 60, 0) 100%)';

export function PowerHero() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[400px] sm:min-h-[500px] lg:h-[700px] flex items-center justify-center overflow-hidden px-5 sm:px-10 lg:px-[60px] py-[60px] sm:py-[80px]">
        {SLIDES.map((s, i) => (
          <img
            key={i}
            src={s.image}
            alt=""
            className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, objectPosition: 'center 35%' }}
          />
        ))}
        <div className="absolute inset-0" style={{ backgroundImage: HERO_GRADIENT }} />

        <div className="relative z-10 flex flex-col w-full max-w-[1200px] lg:pl-[72px]">
          {/* Logo */}
          <img
            src={logoPower}
            alt="Globe Power"
            className="w-[180px] sm:w-[220px] lg:w-[260px] h-auto mb-6"
          />

          {/* Two-column content */}
          <div className="relative lg:h-[180px] mb-6">
            {SLIDES.map((s, i) => (
              <div
                key={i}
                className={`flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-16 transition-opacity duration-700 ${
                  i === current ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              >
                {/* Left: category + title */}
                <div className="flex flex-col gap-2 lg:max-w-[75%]">
                  {s.category && (
                    <span className="font-body text-[13px] sm:text-[14px] leading-[20px] font-medium text-white/80 tracking-[2px]">
                      {s.category}
                    </span>
                  )}
                  {s.title && (
                    <h1 className="font-heading text-[28px] sm:text-[36px] lg:text-[48px] leading-[1.15] lg:leading-[56px] font-extrabold text-white">
                      {s.title}
                    </h1>
                  )}
                </div>

                {/* Right: description */}
                <div className="flex flex-col items-start gap-6 lg:w-[374px] lg:shrink-0">
                  {s.description && (
                    <p className="font-body text-[14px] sm:text-[15px] lg:text-[16px] leading-[22px] sm:leading-[24px] font-normal text-white/90">
                      {s.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA — fixed position, does not shift with text */}
          <div className="flex justify-end lg:pr-0">
            <a
              href="#contacto"
              className="inline-flex items-center gap-3 rounded-[100px] border border-white/60 px-6 py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {SLIDES[current].cta}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
              </svg>
            </a>
          </div>

          {/* Dots + arrows */}
          <div className="flex items-center justify-between mt-[60px]">
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`shrink-0 rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 sm:gap-9">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                className="flex items-center justify-center w-[42px] h-[42px] text-white hover:bg-white/10 transition-colors rounded-full"
                aria-label="Anterior"
              >
                <svg className="w-[38px] h-5" fill="none" viewBox="0 0 38 20" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 1L1 10m0 0l9 9M1 10h36" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                className="flex items-center justify-center w-[42px] h-[42px] text-white hover:bg-white/10 transition-colors rounded-full"
                aria-label="Siguiente"
              >
                <svg className="w-[38px] h-5" fill="none" viewBox="0 0 38 20" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
