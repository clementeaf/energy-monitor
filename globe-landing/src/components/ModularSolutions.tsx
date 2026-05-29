import sol1 from '../assets/modular/sol1.jpg';
import sol2 from '../assets/modular/sol2.jpg';
import sol3 from '../assets/modular/sol3.jpg';

const ROWS = [
  {
    image: sol1, alt: 'Minería', bg: 'bg-[#C86C2E]', textColor: 'text-white',
    category: 'MINERÍA', title: 'Soluciones modulares para minería',
    description: 'Diseñamos e implementamos infraestructura para faenas, campamentos, oficinas y servicios en terreno, cumpliendo con los estándares y exigencias de la industria minera.',
  },
  {
    image: sol2, alt: 'Educación', bg: 'bg-[#E8BF89]', textColor: 'text-grey-900',
    category: 'EDUCACIÓN', title: 'Infraestructura modular para educación',
    description: 'Desarrollamos espacios educativos funcionales y seguros, adaptados a las necesidades de estudiantes, docentes y comunidades.',
  },
  {
    image: sol3, alt: 'Edificación', bg: 'bg-[#F9EEDB]', textColor: 'text-grey-900',
    category: 'EDIFICACIÓN', title: 'Soluciones modulares para edificación',
    description: 'Implementamos infraestructura modular para proyectos corporativos e institucionales, con altos estándares de calidad y diseño.',
  },
];

export function ModularSolutions() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center gap-6">
        <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
          Soluciones
        </span>
        <h2 className="font-heading text-h3 lg:text-h2 text-grey-900 max-w-[900px]">
          Desarrolla tu proyecto con soluciones modulares eficientes
        </h2>
        <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700 max-w-[680px]">
          Te acompañamos desde el diseño hasta la implementación de infraestructura modular, adaptándonos a los requerimientos técnicos, plazos y condiciones de cada operación. Evaluamos tu proyecto y proponemos una solución a medida.
        </p>
      </div>

      {/* Card rows */}
      <div className="max-w-[1200px] mx-auto flex flex-col gap-4 mt-16 lg:mt-[80px]">
        {ROWS.map((row, i) => {
          const isEven = i % 2 === 1;
          const card = (
            <div
              className={`w-full lg:w-[394px] h-[320px] lg:h-[481px] shrink-0 rounded ${row.bg} flex flex-col justify-between p-8`}
            >
              <div className="flex flex-col gap-3 text-left">
                {row.category && (
                  <span className={`font-body text-[13px] leading-[20px] font-medium tracking-[2px] ${row.textColor === 'text-white' ? 'text-white/80' : 'text-grey-500'}`}>
                    {row.category}
                  </span>
                )}
                {row.title && (
                  <h3 className={`font-heading text-h4 font-extrabold ${row.textColor}`}>{row.title}</h3>
                )}
                {row.description && (
                  <p className={`font-body text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] ${row.textColor === 'text-white' ? 'text-white/80' : 'text-grey-700'}`}>
                    {row.description}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <a
                  href="#contacto"
                  className={`inline-flex items-center gap-3.5 rounded-full border ${row.textColor === 'text-white' ? 'border-white' : 'border-grey-800'} px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium ${row.textColor} hover:opacity-70 transition-opacity`}
                >
                  Ver más
                  <svg className="w-5 h-3" fill="none" viewBox="0 0 20 12" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 1l5 5m0 0l-5 5M19 6H1" />
                  </svg>
                </a>
              </div>
            </div>
          );
          const image = (
            <div className="w-full lg:flex-1 h-[250px] lg:h-[481px] rounded overflow-hidden">
              <img src={row.image} alt={row.alt} className="size-full object-cover" />
            </div>
          );

          return (
            <div key={i} className="flex flex-col lg:flex-row gap-4">
              {isEven ? (
                <>
                  <div className="order-2 lg:order-1 w-full lg:flex-1">{image}</div>
                  <div className="order-1 lg:order-2">{card}</div>
                </>
              ) : (
                <>
                  {card}
                  {image}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
