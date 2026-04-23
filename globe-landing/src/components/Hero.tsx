import { useState, useEffect, useCallback } from 'react';
import heroSantiago from '../assets/hero/vista-panoramica-de-la-ciudad-de-santiago-de-chile-2024-05-01.jpg';
import heroFrame122 from '../assets/hero/Frame 122.jpg';
import heroModular from '../assets/hero/modular.jpg';
import logoCLC from '../assets/CLC.png';
import logoGoogle from '../assets/google.png';
import logoBbosch from '../assets/bbosch.png';
import logoAnglo from '../assets/angloAmerican.png';
import logoRosen from '../assets/rose.png';

const HERO_SLIDES = [
  {
    src: heroSantiago,
    position: 'center 40%',
    label: 'Energía',
    title: 'Energía que impulsa nuestra vida',
    subtitle: 'Diseñamos, operamos y optimizamos infraestructura energética para activos de alta exigencia. Integramos ingeniería, tecnología propia y gestión en terreno para asegurar continuidad, eficiencia y control en tiempo real.',
  },
  {
    src: heroFrame122,
    position: 'center 35%',
    label: 'Transporte Vertical',
    title: 'Elevamos el estándar del transporte vertical',
    subtitle: 'Aseguramos la continuidad del movimiento en los edificios y espacios donde conviven las personas. Operamos y mantenemos sistemas críticos con foco en seguridad, disponibilidad y respuesta inmediata, bajo un estándar técnico que la industria aún no da por sentado.',
  },
  {
    src: heroModular,
    position: 'center 50%',
    label: 'Infraestructura Modular',
    title: 'Hacemos posible el espacio que necesitas',
    subtitle: 'Diseñamos y construimos soluciones modulares adaptadas a cada operación: desde campamentos mineros y oficinas remotas hasta espacios permanentes. Proyectos eficientes, trazables y listos para operar donde otros no llegan.',
  },
];
const SLIDE_INTERVAL = 6000;

const CLIENT_LOGOS = [
  { src: logoCLC, alt: 'Clínica Las Condes' },
  { src: logoGoogle, alt: 'Google' },
  { src: logoBbosch, alt: 'bbosch' },
  { src: logoAnglo, alt: 'AngloAmerican' },
  { src: logoRosen, alt: 'Rosen' },
];

export function Hero() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-[85vh] flex flex-col overflow-hidden sm:rounded-br-[5rem]">
      {/* Background slides */}
      {HERO_SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, objectPosition: slide.position }}
        />
      ))}
      {/* Dark overlay mask */}
      <div className="absolute inset-0 bg-black/45" />
      {/* Overlay — gradient from left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/15 to-transparent" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full pt-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 w-full">
          {/* Slide label */}
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80 transition-opacity duration-500">
            {HERO_SLIDES[current].label}
          </span>

          {/* Title */}
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-white leading-[1.15] transition-opacity duration-500">
            {HERO_SLIDES[current].title}
          </h1>

          {/* Subtitle + CTA row */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              {HERO_SLIDES[current].subtitle && (
                <p className="text-[14px] sm:text-[15px] text-white/85 max-w-[540px] leading-[1.7] font-normal transition-opacity duration-500">
                  {HERO_SLIDES[current].subtitle}
                </p>
              )}

              {/* Carousel dots */}
              <div className="flex items-center gap-2 mt-5">
                {HERO_SLIDES.map((_, i) => (
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
            </div>

            <div className="hidden sm:flex flex-col items-end gap-3 shrink-0 sm:mr-[-2rem] lg:mr-[-4rem]">
              <a
                href="#nosotros"
                className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-2 text-[13px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Conocer Globe Power
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  className="flex items-center justify-center w-11 h-9 rounded-full text-white hover:bg-white/10 transition-colors"
                  aria-label="Anterior"
                >
                  <svg className="w-8 h-3" fill="none" viewBox="0 0 32 12" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 1L1 6m0 0l5 5M1 6h30" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goTo(current + 1)}
                  className="flex items-center justify-center w-11 h-9 rounded-full text-white hover:bg-white/10 transition-colors"
                  aria-label="Siguiente"
                >
                  <svg className="w-8 h-3" fill="none" viewBox="0 0 32 12" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M26 1l5 5m0 0l-5 5M31 6H1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client logos bar — Figma: 1043 x 117 */}
      <div className="relative z-10">
        <div className="overflow-hidden w-full sm:max-w-[1043px] h-[100px] sm:h-[117px] sm:rounded-tr-[5rem] bg-white">
          <div className="flex items-center h-full animate-scroll-left w-max">
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
              <img
                key={`${logo.alt}-${i}`}
                src={logo.src}
                alt={logo.alt}
                className="h-8 sm:h-11 w-auto mx-10 sm:mx-16 shrink-0"
                style={{ filter: 'brightness(0) saturate(100%) invert(22%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(89%)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
