import inn1 from '../assets/innovation/image.png';
import inn2 from '../assets/innovation/image2.png';
import inn3 from '../assets/innovation/image3.png';

const PILLARS = [
  { src: inn1, alt: 'Desarrollo propio — Tecnología hecha en casa' },
  { src: inn2, alt: 'Alianzas estratégicas — Tecnología mundial, ejecución local' },
  { src: inn3, alt: 'Desarrollo de personas — Invertimos en quienes hacen Globe' },
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
            Segmentamos nuestra cultura de innovación en tres pilares fundamentales
          </p>
        </div>

        {/* Bottom row: 3 innovation cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-1">
          {PILLARS.map((item) => (
            <img
              key={item.alt}
              src={item.src}
              alt={item.alt}
              className="w-full aspect-square object-cover rounded-md"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
