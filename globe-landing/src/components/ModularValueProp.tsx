import val1 from '../assets/modular/val1.png';
import val2 from '../assets/modular/val2.png';
import val3 from '../assets/modular/val3.png';

const CARDS = [
  {
    icon: val1, alt: 'Rapidez operativa',
    title: 'Rapidez operativa',
    description: 'Ejecutamos proyectos en plazos significativamente menores a la construcción tradicional, permitiendo una puesta en marcha más temprana.',
  },
  {
    icon: val2, alt: 'Adaptabilidad',
    title: 'Adaptabilidad',
    description: 'Diseñamos soluciones que se adaptan a las condiciones del proyecto y que pueden crecer o modificarse según las necesidades operativas.',
  },
  {
    icon: val3, alt: 'Calidad certificada',
    title: 'Calidad certificada',
    description: 'Fabricamos en entornos industrializados que aseguran consistencia, calidad y cumplimiento de estándares en cada proyecto.',
  },
];

const CIRCLE_GRADIENT = 'radial-gradient(circle, #FBEFE1 0%, #FBEFE100 100%)';

export function ModularValueProp() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center justify-center text-center gap-6">
        <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
          Propuesta de valor
        </span>
        <h2 className="font-heading text-h3 lg:text-h2 text-grey-900 max-w-[800px]">
          La ventaja de operar con un solo grupo
        </h2>
        <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700 max-w-[720px]">
          Integramos capacidades técnicas, operacionales y tecnológicas bajo una sola estructura. Una mirada; un responsable; continuidad garantizada.
        </p>
      </div>

      {/* Value cards */}
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 lg:gap-16 mt-16 lg:mt-[80px]">
        {CARDS.map((card, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-4">
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
              style={{ background: CIRCLE_GRADIENT }}
            >
              <img src={card.icon} alt={card.alt} className="w-7 h-7 object-contain" />
            </div>
            <h3 className="font-heading text-[18px] lg:text-[20px] font-extrabold text-grey-900">
              {card.title}
            </h3>
            <p className="font-body text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] text-grey-700">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
