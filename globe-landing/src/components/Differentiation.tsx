import iconEngine from '../assets/engine.png';
import iconHands from '../assets/hands.png';
import iconCheck from '../assets/check.png';
import iconWorker from '../assets/worker.png';

const items = [
  {
    title: 'Eficiencia operativa',
    desc: 'Estructuramos cada operación para que los recursos se traduzcan en resultados.',
    icon: iconEngine,
  },
  {
    title: 'Integradores',
    desc: 'Trabajamos junto a partners de clase mundial (Siemens, Meypar, Otis, Schindler, entre otros), integrando tecnología líder con ejecución local.',
    icon: iconHands,
  },
  {
    title: 'Tecnología y visibilidad',
    desc: 'Desarrollamos plataformas propias de monitoreo, análisis y trazabilidad. Nuestros clientes ven sus activos en tiempo real, no en un reporte mensual.',
    icon: iconCheck,
  },
  {
    title: 'Experiencia técnica',
    desc: 'Equipos especializados con conocimiento profundo en sistemas críticos: energía, transporte vertical e infraestructura.',
    icon: iconWorker,
  },
];

export function Differentiation() {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-5 bg-white p-8 min-h-[260px]"
            >
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-brand/10">
                <img src={item.icon} alt={item.title} className="w-6 h-6 object-contain" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-grey-900">{item.title}</h3>
                <p className="mt-2 text-sm text-grey-700 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
