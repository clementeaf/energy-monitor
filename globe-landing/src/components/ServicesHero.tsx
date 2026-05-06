import { useState, useEffect, useCallback } from 'react';
import banner1 from '../assets/services/banner1.jpg';
import banner2 from '../assets/services/banner2.jpg';
import banner3 from '../assets/services/banner3.jpg';
import logoServices from '../assets/services/logo-services.png';

const SLIDES = [
  {
    image: banner1,
    category: 'TRANSPORTE VERTICAL',
    title: 'Elevamos el estándar del transporte vertical',
    description:
      'Aseguramos la continuidad del movimiento en los edificios y espacios donde conviven las personas. Operamos y mantenemos sistemas críticos con foco en seguridad, disponibilidad y respuesta inmediata.',
    cta: 'Solicitar inspección sin costo',
  },
  {
    image: banner2,
    category: 'SEGURIDAD',
    title: 'Seguridad certificada en cada viaje',
    description:
      'Operamos bajo estándares canadienses y la normativa chilena vigente. Técnicos certificados, inspecciones rigurosas y procedimientos auditados para que cada ascensor funcione como debe.',
    cta: 'Solicitar inspección sin costo',
  },
  {
    image: banner3,
    category: 'MANTENIMIENTO',
    title: 'Mantenimiento predictivo e inteligente',
    description:
      'Monitoreamos en tiempo real para anticipar fallas antes de que ocurran. Planes de mantenimiento adaptados a cada equipo con tecnología de punta.',
    cta: 'Solicitar inspección sin costo',
  },
];

const SLIDE_INTERVAL = 6000;

const HERO_GRADIENT =
  'linear-gradient(0deg, rgba(60, 60, 60, 0.72) 0%, rgba(145, 52, 55, 0) 117.5%), linear-gradient(0deg, rgba(28, 28, 28, 0.72) 0%, rgba(60, 60, 60, 0) 100%)';

export function ServicesHero() {
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
            key={s.image}
            src={s.image}
            alt=""
            className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, objectPosition: 'center 35%' }}
          />
        ))}
        <div className="absolute inset-0" style={{ backgroundImage: HERO_GRADIENT }} />

        <div className="relative z-10 flex flex-col w-full max-w-[1200px] lg:pl-[72px]">
          {/* Logo services */}
          <img
            src={logoServices}
            alt="Globe Services"
            className="w-[220px] sm:w-[300px] lg:w-[400px] h-auto mb-8"
          />

          {/* Two-column content — fixed height to prevent layout shift between slides */}
          <div className="relative lg:h-[180px] mb-12">
            {SLIDES.map((s, i) => (
              <div
                key={s.category}
                className={`flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-16 transition-opacity duration-700 ${
                  i === current ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              >
                {/* Left: category + title */}
                <div className="flex flex-col gap-2 lg:max-w-[50%]">
                  <span className="font-body text-[13px] sm:text-[14px] leading-[20px] font-medium text-white/80 tracking-[2px]">
                    {s.category}
                  </span>
                  <h1 className="font-heading text-[28px] sm:text-[36px] lg:text-[48px] leading-[1.15] lg:leading-[56px] font-extrabold text-white">
                    {s.title}
                  </h1>
                </div>

                {/* Right: description + CTA */}
                <div className="flex flex-col items-start justify-start gap-6 lg:w-[374px] lg:shrink-0">
                  <p className="font-body text-[14px] sm:text-[15px] lg:text-[16px] leading-[22px] sm:leading-[24px] font-normal text-white/90">
                    {s.description}
                  </p>
                  <a
                    href="#contacto"
                    className="inline-flex items-center gap-3 self-center lg:self-start rounded-[100px] border border-white/60 px-6 py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    {s.cta}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Dots + arrows */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
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
