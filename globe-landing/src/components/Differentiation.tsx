import iconEngine from '../assets/engine.png';
import iconHands from '../assets/hands.png';
import iconCheck from '../assets/check.png';
import iconWorker from '../assets/worker.png';

const items = [
  {
    title: 'Eficiencia operativa',
    desc: 'Estructuramos cada operación para que los recursos se traduzcan en resultados.',
    icon: iconCheck,
  },
  {
    title: 'Integradores',
    desc: 'Trabajamos junto a partners de clase mundial (Siemens, Meypar, Otis, Schindler, entre otros), integrando tecnología líder con ejecución local.',
    icon: iconHands,
  },
  {
    title: 'Tecnología y visibilidad',
    desc: 'Desarrollamos plataformas propias de monitoreo, análisis y trazabilidad. Nuestros clientes ven sus activos en tiempo real, no en un reporte mensual.',
    icon: iconEngine,
  },
  {
    title: 'Experiencia técnica',
    desc: 'Equipos especializados con conocimiento profundo en sistemas críticos: energía, transporte vertical e infraestructura.',
    icon: iconWorker,
  },
];

export function Differentiation() {
  return (
    <section id="ecosistema" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 py-[128px] flex flex-col gap-[80px]">
        {/* Header — Figma: centered, label + title + subtitle */}
        <div className="text-center">
          <div className="flex flex-col gap-2 items-center pb-9 text-grey-900">
            <span className="font-body text-[16px] leading-[20px] font-normal">
              ECOSISTEMA GLOBE
            </span>
            <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
              La ventaja de operar con un solo grupo
            </h2>
          </div>
          <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-700">
            Integramos capacidades técnicas, operacionales y tecnológicas bajo una sola estructura. Una mirada; un responsable; continuidad garantizada.
          </p>
        </div>

        {/* Cards — Figma: 2×2 grid, 260px rows, bg white, rounded-8, p-24 */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-6 bg-white hover:bg-grey-50 p-6 rounded-lg transition-colors duration-300"
            >
              {/* Icon — Figma: 68px circle, radial gradient rosa, icon 34px */}
              <div className="shrink-0 flex items-center justify-center w-[68px] h-[68px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(246,224,222,1)_0%,rgba(246,224,222,0)_100%)]">
                <img src={item.icon} alt="" className="w-[34px] h-[34px] object-contain" />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-heading text-[28px] leading-[36px] font-extrabold text-grey-900">
                  {item.title}
                </h3>
                <p className="font-body text-[16px] leading-[24px] font-normal text-grey-700">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
