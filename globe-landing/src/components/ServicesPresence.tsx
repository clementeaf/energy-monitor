import buildIcon from '../assets/services/build.png';
import alarmIcon from '../assets/services/alarm.png';
import clockIcon from '../assets/services/clock.png';

const STATS = [
  { icon: 'building', value: '400+', label: 'Edificios atendidos' },
  { icon: 'alarm', value: '24/7', label: 'Averías y emergencias' },
  { icon: 'timer', value: '≤ 2h', label: 'SLA de respuesta' },
];

function StatIcon({ type }: { type: string }) {
  switch (type) {
    case 'building':
      return <img src={buildIcon} alt="Edificios" className="w-11 h-11 object-contain" />;
    case 'alarm':
      return <img src={alarmIcon} alt="Alarma" className="w-11 h-11 object-contain" />;
    case 'timer':
      return <img src={clockIcon} alt="SLA" className="w-11 h-11 object-contain" />;
    default:
      return null;
  }
}

export function ServicesPresence() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10 lg:gap-[80px] lg:items-end">
        {/* Left column — text */}
        <div className="flex flex-col gap-6 lg:max-w-[593px] text-center lg:text-left items-center lg:items-start">
          <div className="flex flex-col gap-[8px]">
            <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
              Presencia
            </span>
            <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
              Operamos a lo largo de todo Chile
            </h2>
          </div>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
            Estamos presentes a lo largo de Chile, con equipos preparados para actuar rápidamente donde se nos necesite, garantizando soporte continuo y soluciones eficientes en terreno.
          </p>
        </div>

        {/* Stats — mobile: vertical centered, desktop: horizontal */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-[40px]">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center lg:items-start gap-3">
              <StatIcon type={stat.icon} />
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="font-heading text-h1 text-grey-900">{stat.value}</span>
                <span className="font-body text-[14px] sm:text-[16px] leading-[24px] text-grey-700 whitespace-nowrap">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
