import heroFrame122 from '../assets/hero/Frame 122.jpg';

const HERO_GRADIENT =
  'linear-gradient(0deg, rgba(60, 60, 60, 0.72) 0%, rgba(145, 52, 55, 0) 117.5%), linear-gradient(0deg, rgba(28, 28, 28, 0.72) 0%, rgba(60, 60, 60, 0) 100%)';

export function ServicesHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[400px] sm:min-h-[500px] lg:h-[700px] flex items-center justify-center overflow-hidden px-5 sm:px-10 lg:px-[60px] py-[60px] sm:py-[80px]">
        <img
          src={heroFrame122}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: 'center 35%' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: HERO_GRADIENT }} />

        <div className="relative z-10 flex flex-col gap-6 sm:gap-[40px] w-full max-w-[1200px]">
          <div className="flex flex-col gap-[2px] text-white">
            <span className="font-body text-[14px] sm:text-[16px] leading-[20px] font-normal">
              TRANSPORTE VERTICAL
            </span>
            <h1 className="font-heading text-[28px] sm:text-[36px] lg:text-[48px] leading-[1.15] lg:leading-[56px] font-extrabold">
              Elevamos el estándar del transporte vertical
            </h1>
          </div>
          <p className="font-heading text-[15px] sm:text-[16px] lg:text-[18px] leading-[22px] sm:leading-[24px] lg:leading-[26px] font-medium text-white max-w-[700px]">
            Aseguramos la continuidad del movimiento en los edificios y espacios donde conviven las personas. Operamos y mantenemos sistemas críticos con foco en seguridad, disponibilidad y respuesta inmediata.
          </p>
        </div>
      </div>
    </section>
  );
}
