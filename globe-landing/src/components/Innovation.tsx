import inn1 from '../assets/hero/close-up-server-hub-it-professional-debugging-optimizing-code 1.jpg';
import inn2 from '../assets/hero/Frame 50.jpg';
import inn3 from '../assets/hero/everyone-is-smiling-listens-group-people-business-conference-modern-classroom-daytime 1.jpg';

const PILLARS = [
  {
    src: inn1,
    tag: 'Desarrollo propio',
    title: 'Tecnología hecha en casa',
    desc: 'Creamos nuestros propios sistemas EMS, BMS y plataformas de control documental, pensados para generar impacto real en la operación de cada cliente.',
  },
  {
    src: inn2,
    tag: 'Alianzas estratégicas',
    title: 'Tecnología mundial, ejecución local',
    desc: 'Trabajamos con Siemens, Meypar y otros partners globales para traer tecnología de clase mundial al mercado chileno.',
  },
  {
    src: inn3,
    tag: 'Desarrollo de personas',
    title: 'Invertimos en quienes hacen Globe',
    desc: 'Parte de nuestras utilidades se reinvierte en la formación y especialización de nuestros equipos.',
  },
];

export function Innovation() {
  return (
    <section id="innovacion" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top row: centered text */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-grey-400">
            Cultura e innovación
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-grey-900 leading-tight">
            Cómo innovamos
          </h2>

          <p className="mt-4 text-[15px] text-grey-700 leading-[1.8]">
          Nuestra cultura de innovación se sostiene en tres pilares fundamentales.          </p>
        </div>

        {/* Bottom row: 3 innovation cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-1">
          {PILLARS.map((item) => (
            <div key={item.tag} className="relative overflow-hidden rounded-md">
              <img
                src={item.src}
                alt={item.tag}
                className="w-full aspect-square object-cover"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
              {/* Tag pill */}
              <span className="absolute top-5 left-5 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-[13px] font-medium text-white">
                {item.tag}
              </span>
              {/* Text content */}
              <div className="absolute bottom-5 left-5 right-5">
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] sm:text-[14px] leading-[1.6] text-white/80">
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
