import ind1 from '../assets/industry/image1.jpg';
import ind2 from '../assets/industry/image2.jpg';
import ind3 from '../assets/industry/image3.jpg';

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

/* Overlay gradient: dual layer */
const CARD_OVERLAY =
  'linear-gradient(0deg, #1C1C1CE5 0%, #3C3C3C00 100%), linear-gradient(0deg, #3C3C3CE5 0%, #951F2200 100%)';

/* Hover: rojizo gradient */
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 sm:px-0">
        {INDUSTRIES.map((item) => (
          <div key={item.title} className="group relative aspect-[795/760] overflow-hidden rounded-[4px]">
            <img
              src={item.src}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 rounded-[4px]" style={{ backgroundImage: CARD_OVERLAY }} />
            {/* Hover: rojizo gradient */}
            <div className="absolute inset-0 rounded-[4px] opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundImage: HOVER_GRADIENT }} />

            {/* Content — z-10 above overlay, centered like baked originals */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="font-heading text-[28px] leading-[36px] font-extrabold text-white">
                {item.title}
              </h3>
              <p className="font-body text-[16px] leading-[24px] text-white/90 mt-2">
                {item.subtitle}
              </p>
              <a
                href="#contacto"
                className="mt-6 inline-flex items-center gap-3.5 rounded-[100px] border border-white px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                {item.cta}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
