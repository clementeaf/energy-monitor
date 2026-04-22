import heroBg from '../assets/image1.png';
import logoCLC from '../assets/CLC.png';
import logoGoogle from '../assets/google.png';
import logoBbosch from '../assets/bbosch.png';
import logoAnglo from '../assets/angloAmerican.png';
import logoRosen from '../assets/rose.png';

const CLIENT_LOGOS = [
  { src: logoCLC, alt: 'Clínica Las Condes' },
  { src: logoGoogle, alt: 'Google' },
  { src: logoBbosch, alt: 'bbosch' },
  { src: logoAnglo, alt: 'AngloAmerican' },
  { src: logoRosen, alt: 'Rosen' },
];

export function Hero() {
  return (
    <section
      className="relative min-h-[85vh] flex flex-col overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      {/* Overlay — gradient from left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full pt-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 w-full">
          {/* ENERGÍA label */}
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
            Energía
          </span>

          {/* Title */}
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-white leading-[1.15]">
            Energía que impulsa nuestra vida
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-[14px] sm:text-[15px] text-white/85 max-w-[540px] leading-[1.7] font-normal">
            Diseñamos, operamos y optimizamos infraestructura energética para activos de alta
            exigencia. Integramos ingeniería, tecnología propia y gestión en terreno para asegurar
            continuidad, eficiencia y control en tiempo real.
          </p>
        </div>
      </div>

      {/* Bottom row: CTA + arrows — right aligned */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 w-full pb-6">
        <div className="hidden sm:flex items-center justify-end gap-8">
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
              className="flex items-center justify-center w-9 h-9 rounded-full border border-white/50 text-white hover:bg-white/10 transition-colors"
              aria-label="Anterior"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-white/50 text-white hover:bg-white/10 transition-colors"
              aria-label="Siguiente"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Client logos bar — full width, dark background, white line on top */}
      <div className="relative z-10 border-t border-white/20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 py-5 flex items-center justify-between">
          {CLIENT_LOGOS.map((logo) => (
            <img
              key={logo.alt}
              src={logo.src}
              alt={logo.alt}
              className="h-5 sm:h-7 w-auto brightness-0 invert opacity-70"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
