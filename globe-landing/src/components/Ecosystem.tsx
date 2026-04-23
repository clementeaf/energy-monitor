import val1 from '../assets/values/image1.png';
import val2 from '../assets/values/image2.png';
import val3 from '../assets/values/image3.png';
import val4 from '../assets/values/image4.png';

const VALUES = [
  { src: val1, alt: 'Integridad' },
  { src: val2, alt: 'Cliente en el centro' },
  { src: val3, alt: 'Excelencia operacional' },
  { src: val4, alt: 'Impacto positivo' },
];

export function Ecosystem() {
  return (
    <section id="valores" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-grey-50">
      <div className="max-w-7xl mx-auto">
        {/* Top row: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left column */}
          <div>
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-grey-900">
              Valores
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-grey-900 leading-tight">
              Los principios que sostienen cada operación
            </h2>
          </div>

          {/* Right column */}
          <div className="flex items-end">
            <p className="text-[15px] text-grey-700 leading-[1.8]">
              No son declaraciones. Son los criterios que usamos para tomar decisiones técnicas, operacionales y comerciales todos los días.
            </p>
          </div>
        </div>

        {/* Bottom row: 4 value cards with hover button */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-1">
          {VALUES.map((v) => (
            <div key={v.alt} className="group relative overflow-hidden rounded-md cursor-pointer">
              <img
                src={v.src}
                alt={v.alt}
                className="w-full aspect-[3/4] object-cover"
              />
              {/* Hover: "Ver más" button slides in from right */}
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
