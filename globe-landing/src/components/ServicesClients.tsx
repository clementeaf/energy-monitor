import logoApumanque from '../assets/Apumanque.png';
import logoCarabineros from '../assets/Carabineros_de_Chile.png';
import logoAdmicomu from '../assets/admicomu.png';
import logoEfe from '../assets/efe.png';
import logoHappyland from '../assets/happyland.png';

const CLIENT_LOGOS = [
  { src: logoApumanque, alt: 'Apumanque' },
  { src: logoCarabineros, alt: 'Carabineros de Chile' },
  { src: logoAdmicomu, alt: 'Admicomu' },
  { src: logoEfe, alt: 'EFE' },
  { src: logoHappyland, alt: 'Happyland' },
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
                style={{ filter: 'grayscale(100%)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
