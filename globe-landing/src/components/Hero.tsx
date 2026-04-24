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
    label: 'ENERGÍA',
    title: 'Energía que impulsa nuestra vida',
    subtitle: 'Diseñamos, operamos y optimizamos infraestructura energética para activos de alta exigencia. Integramos ingeniería, tecnología propia y gestión en terreno para asegurar continuidad, eficiencia y control en tiempo real.',
    cta: 'Conocer Globe Power',
  },
  {
    src: heroFrame122,
    position: 'center 35%',
    label: 'TRANSPORTE VERTICAL',
    title: 'Elevamos el estándar del transporte vertical',
    subtitle: 'Aseguramos la continuidad del movimiento en los edificios y espacios donde conviven las personas. Operamos y mantenemos sistemas críticos con foco en seguridad, disponibilidad y respuesta inmediata, bajo un estándar técnico que la industria aún no da por sentado.',
    cta: 'Conocer Globe Servicios',
  },
  {
    src: heroModular,
    position: 'center 50%',
    label: 'INFRAESTRUCTURA MODULAR',
    title: 'Hacemos posible el espacio que necesitas',
    subtitle: 'Diseñamos y construimos soluciones modulares adaptadas a cada operación: desde campamentos mineros y oficinas remotas hasta espacios permanentes. Proyectos eficientes, trazables y listos para operar donde otros no llegan.',
    cta: 'Conocer Globe Modular',
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

/* Figma gradient overlay — dual bottom-up gradients */
const HERO_GRADIENT =
  'linear-gradient(0deg, rgba(60, 60, 60, 0.72) 0%, rgba(145, 52, 55, 0) 117.5%), linear-gradient(0deg, rgba(28, 28, 28, 0.72) 0%, rgba(60, 60, 60, 0) 100%)';

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
    <section className="relative overflow-hidden rounded-br-[100px]">
      {/* Banner — Figma: h=598, px-60, py reduced to fit content + dots + logo bar */}
      <div className="relative h-[598px] flex items-center justify-center overflow-hidden px-5 sm:px-10 lg:px-[60px] pt-[80px] pb-[140px]">
        {/* Background slides */}
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt=""
            className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, objectPosition: s.position }}
          />
        ))}
        {/* Figma: dual gradient overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: HERO_GRADIENT }} />

        {/* Content — Figma: max-w-1200, flex col gap-52, justify-center */}
        <div className="relative z-10 flex flex-col gap-[32px] w-full max-w-[1200px]">
          {/* Slide text layers — grid stack: all cells occupy same grid area, tallest wins */}
          <div className="grid">
            {HERO_SLIDES.map((s, i) => (
              <div
                key={s.src}
                className={`col-start-1 row-start-1 flex gap-[60px] items-end transition-opacity duration-700 ease-in-out ${
                  i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Text column */}
                <div className="flex-1 min-w-0 flex flex-col gap-[40px]">
                  {/* Label + Title */}
                  <div className="flex flex-col gap-[2px] text-white">
                    <span className="font-body text-[16px] leading-[20px] font-normal">
                      {s.label}
                    </span>
                    <h1 className="font-heading text-[48px] leading-[56px] font-extrabold">
                      {s.title}
                    </h1>
                  </div>
                  {/* Subtitle */}
                  <p className="font-heading text-[18px] leading-[26px] font-medium text-white">
                    {s.subtitle}
                  </p>
                </div>

                {/* CTA button — aligned bottom-right */}
                <div className="hidden sm:flex flex-col items-end shrink-0 h-[48px]">
                  <a
                    href="#contacto"
                    className="inline-flex items-center gap-3.5 rounded-[100px] border border-white px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    {s.cta}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: dots left + arrows right */}
          <div className="flex items-center justify-between">
            {/* Dots */}
            <div className="flex items-center gap-2">
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

            {/* Arrow buttons — Figma: 42px, gap 36px */}
            <div className="hidden sm:flex items-center gap-9">
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

      {/* Client logos bar — Figma: w-1043, h-117, rounded-tr-[100px], pt-36 pb-16 */}
      <div className="absolute bottom-0 left-0 z-10 overflow-hidden w-full sm:max-w-[1043px] h-[117px] sm:rounded-tr-[100px] bg-white pt-9 pb-4">
        <div className="flex items-center animate-scroll-left w-max gap-[60px]">
          {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
            <img
              key={`${logo.alt}-${i}`}
              src={logo.src}
              alt={logo.alt}
              className="h-8 sm:h-11 w-auto shrink-0"
              style={{ filter: 'brightness(0) saturate(100%) invert(22%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(89%)' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
