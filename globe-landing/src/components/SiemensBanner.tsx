import ind1 from '../assets/industry/image.png';
import ind2 from '../assets/industry/image2.png';
import ind3 from '../assets/industry/image3.png';

const INDUSTRIES = [
  { src: ind1, alt: 'Energía' },
  { src: ind2, alt: 'Transporte Vertical' },
  { src: ind3, alt: 'Infraestructura Modular' },
];

export function SiemensBanner() {
  return (
    <section id="industrias" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top row: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-grey-400">
              Industrias
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-grey-900 leading-tight">
              Áreas de negocios
            </h2>
          </div>

          <div className="flex items-end">
            <p className="text-[15px] text-grey-700 leading-[1.8]">
              Las operaciones de Grupo Globe se estructuran en tres áreas que responden a necesidades críticas de infraestructura y operación: energía, transporte vertical e infraestructura modular.
            </p>
          </div>
        </div>

        {/* Bottom row: 3 industry cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-1">
          {INDUSTRIES.map((item) => (
            <div key={item.alt} className="group relative overflow-hidden rounded-md cursor-pointer">
              <img
                src={item.src}
                alt={item.alt}
                className="w-full"
              />
              <div className="absolute bottom-6 right-0 translate-x-full group-hover:translate-x-[-1rem] transition-transform duration-500 ease-out">
                <span className="inline-flex items-center gap-2 rounded-full bg-transparent border border-white px-5 py-2.5 text-sm font-medium text-white">
                  Ver más
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
