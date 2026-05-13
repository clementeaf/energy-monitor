import logoAes from '../assets/modular/clients/aes.png';
import logoCmp from '../assets/modular/clients/cmp.png';
import logoCodelco from '../assets/modular/clients/codelco.png';
import logoEngie from '../assets/modular/clients/engie.png';
import logoImage from '../assets/modular/clients/image.png';
import logoScotia from '../assets/modular/clients/scotia.png';

const CLIENT_LOGOS = [
  { src: logoCodelco, alt: 'Codelco' },
  { src: logoAes, alt: 'AES' },
  { src: logoCmp, alt: 'CMP' },
  { src: logoEngie, alt: 'Engie' },
  { src: logoScotia, alt: 'Scotiabank' },
  { src: logoImage, alt: 'Cliente' },
];

export function ModularClients() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-[60px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px] items-center text-center">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Clientes
          </span>
          <h2 className="font-heading text-[20px] lg:text-[24px] leading-[28px] lg:leading-[32px] text-grey-900">
            Empresas que han confiado en nuestras soluciones
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
