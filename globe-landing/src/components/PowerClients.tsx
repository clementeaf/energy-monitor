import subway from '../assets/power/subway.png';
import chilexpress from '../assets/power/chileExpress.png';
import aiep from '../assets/power/aiep.png';
import sportlife from '../assets/power/sportlife.png';

const LOGOS = [
  { src: subway, alt: 'Subway' },
  { src: chilexpress, alt: 'Chilexpress' },
  { src: aiep, alt: 'AIEP' },
  { src: sportlife, alt: 'Sportlife' },
];

// Duplicate for seamless infinite scroll
const TRACK = [...LOGOS, ...LOGOS];

export function PowerClients() {
  return (
    <section className="py-20 lg:py-[100px] bg-white overflow-hidden">
      <div className="flex flex-col items-center text-center gap-4 mb-12 lg:mb-16 px-5">
        <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
          CLIENTES
        </span>
        <h2 className="font-heading text-[28px] sm:text-[32px] lg:text-[36px] leading-[1.15] font-extrabold text-grey-900">
          Confían en nosotros
        </h2>
      </div>

      {/* Infinite carousel */}
      <div className="relative w-full">
        <div className="flex items-center gap-16 sm:gap-20 lg:gap-28 animate-scroll w-max">
          {TRACK.map((logo, i) => (
            <img
              key={`${logo.alt}-${i}`}
              src={logo.src}
              alt={logo.alt}
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain grayscale"
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </section>
  );
}
