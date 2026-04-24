import continentMap from '../assets/continent.png';

export function Presence() {
  return (
    <section className="bg-white pt-[128px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0">
        {/* Figma: flex row, gap-128, text left + map right */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-[128px] items-start">
          {/* Left column: text */}
          <div className="flex-1 min-w-0">
            {/* Label + Title — pb-60 */}
            <div className="flex flex-col gap-2 pb-[60px] text-grey-900">
              <span className="font-body text-[16px] leading-[20px] font-normal">
                PRESENCIA
              </span>
              <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
                De origen canadiense,<br />
                operación regional
              </h2>
            </div>

            {/* Body — Plus Jakarta Sans Medium 22px/30px, grey-700 */}
            <div className="font-heading text-[22px] leading-[30px] font-medium text-grey-700">
              <p>
                Grupo Globe tiene su origen en Canadá y hoy opera en Chile. Desarrollando proyectos de energía e infraestructura en activos críticos para minería, retail, hospitales e industrias.
              </p>
              <p className="mt-[30px]">
                Seguimos expandiendo nuestras capacidades en la región para acompañar a clientes actuales y nuevos proyectos operacionales. Este 2026 aperturaremos nuestra operación en Perú.
              </p>
            </div>
          </div>

          {/* Right column: map */}
          <div className="shrink-0">
            <img
              src={continentMap}
              alt="Presencia en Canadá y Chile"
              className="w-[463px] h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
