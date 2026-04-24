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

/* Figma: dual gradient overlay on innovation cards */
const CARD_GRADIENT =
  'linear-gradient(0deg, rgba(60, 60, 60, 0.72) 0%, rgba(149, 31, 34, 0) 100%), linear-gradient(0deg, rgba(28, 28, 28, 0.72) 0%, rgba(60, 60, 60, 0) 100%)';

/* Figma hover: rojizo gradient */
const HOVER_GRADIENT =
  'linear-gradient(-0.07deg, rgba(91, 25, 27, 0.6) 38.1%, rgba(91, 25, 27, 0) 110.7%), linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%)';

export function Innovation() {
  return (
    <section id="innovacion" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 py-[128px] flex flex-col gap-[80px]">
        {/* Header — Figma: centered, label + title + subtitle */}
        <div className="text-center">
          <div className="flex flex-col gap-2 items-center pb-9 text-grey-900">
            <span className="font-body text-[16px] leading-[20px] font-normal">
              CULTURA E INNOVACIÓN
            </span>
            <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
              Cómo innovamos
            </h2>
          </div>
          <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-700">
            Nuestra cultura de innovación se sostiene en tres pilares fundamentales.
          </p>
        </div>

        {/* Cards — Figma: 3 cards, gap-12, h-380, rounded-8 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {PILLARS.map((item) => (
            <div key={item.tag} className="group relative flex-1 h-[300px] sm:h-[340px] lg:h-[380px] overflow-hidden rounded-lg">
              {/* Background image */}
              <img
                src={item.src}
                alt={item.tag}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Default gradient overlay */}
              <div className="absolute inset-0 rounded-lg transition-opacity duration-300 group-hover:opacity-0" style={{ backgroundImage: CARD_GRADIENT }} />
              {/* Hover: rojizo gradient overlay */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundImage: HOVER_GRADIENT }} />

              {/* Content — justify-end, p-24 */}
              <div className="relative flex flex-col justify-between h-full p-6">
                {/* Tag badge — top-left */}
                <div>
                  <span className="inline-block rounded-[100px] bg-white/20 border border-white/30 px-3 py-1.5 font-body text-[16px] leading-[22px] font-medium text-white">
                    {item.tag}
                  </span>
                </div>

                {/* Title + description — bottom */}
                <div className="flex flex-col gap-3 text-white">
                  <h3 className="font-heading text-[28px] leading-[36px] font-extrabold">
                    {item.title}
                  </h3>
                  <p className="font-body text-[16px] leading-[24px] font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
