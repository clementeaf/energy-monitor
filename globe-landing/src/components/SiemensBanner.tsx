import ind1 from '../assets/industry/image.png';
import ind2 from '../assets/industry/image2.png';
import ind3 from '../assets/industry/image3.png';

const INDUSTRIES = [
  {
    src: ind1,
    title: 'Energía',
    subtitle: 'Gestión energética y activos eléctricos',
    cta: 'Ir a Globe Power',
  },
  {
    src: ind2,
    title: 'Transporte Vertical',
    subtitle: 'Mantención y operación de ascensores y escaleras',
    cta: 'Ir a Globe Services',
  },
  {
    src: ind3,
    title: 'Infraestructura Modular',
    subtitle: 'Diseño y construcción de espacios modulares',
    cta: 'Ir a Globe Modular',
  },
];

/* Figma hover: rojizo gradient */
const HOVER_GRADIENT =
  'linear-gradient(-0.07deg, rgba(91, 25, 27, 0.6) 38.1%, rgba(91, 25, 27, 0) 110.7%), linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%)';

export function SiemensBanner() {
  return (
    <section id="industrias" className="pt-[128px]">
      {/* Header — Figma: 1fr/2fr grid, gap-80, max-w-1200 */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 pb-[84px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-y-6 lg:gap-x-[80px]">
          {/* Left: label + title */}
          <div className="flex flex-col gap-2 text-grey-900">
            <span className="font-body text-[16px] leading-[20px] font-normal">
              INDUSTRIAS
            </span>
            <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
              Áreas de negocios
            </h2>
          </div>

          {/* Right: description */}
          <div className="flex items-start pt-0 lg:pt-6">
            <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-700">
              Las operaciones de Grupo Globe se estructuran en tres áreas que responden a necesidades críticas de infraestructura y operación: energía, transporte vertical e infraestructura modular.
            </p>
          </div>
        </div>
      </div>

      {/* Cards — Figma: full-width, 3 cards, gap-1, h-380 */}
      {/* Cards — images already contain title + subtitle + gradient baked in */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-1 px-5 sm:px-0">
        {INDUSTRIES.map((item) => (
          <div key={item.title} className="group relative h-[300px] sm:h-[340px] lg:h-[380px] overflow-hidden rounded-[4px]">
            <img
              src={item.src}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Hover: rojizo gradient overlay (desktop only) */}
            <div className="absolute inset-0 rounded-[4px] opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundImage: HOVER_GRADIENT }} />

            {/* CTA pill — centered at bottom */}
            <a
              href="#contacto"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-3.5 rounded-[100px] border border-white px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {item.cta}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
