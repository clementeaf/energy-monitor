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

export function ServicesClients() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-[60px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px] text-center">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Clientes
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Confían en nosotros
          </h2>
        </div>

        {/* Logo carousel */}
        <div className="overflow-hidden">
          <div className="flex items-center animate-scroll-left w-max gap-8 sm:gap-[60px]">
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
              <img
                key={`${logo.alt}-${i}`}
                src={logo.src}
                alt={logo.alt}
                className="h-6 sm:h-11 w-auto shrink-0"
                style={{ filter: 'brightness(0) saturate(100%) invert(22%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(89%)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
