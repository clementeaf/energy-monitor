import continentMap from '../assets/continent.png';

export function Presence() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left column: text */}
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-grey-400">
            Presencia
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-grey-900 leading-tight">
            De origen canadiense,<br />
            operación regional
          </h2>

          <div className="mt-6 space-y-5 text-[15px] text-grey-700 leading-[1.8]">
            <p>
              Grupo Globe tiene su origen en Canadá y hoy opera en Chile. Desarrollando proyectos de energía e
              infraestructura en activos críticos para minería, retail, hospitales e industrias.
            </p>
            <p>
              Seguimos expandiendo nuestras capacidades en la región para acompañar a clientes actuales y nuevos
              proyectos operacionales. Este 2026 abriremos nuestra operación en Perú.
            </p>
          </div>
        </div>

        {/* Right column: map */}
        <div className="flex justify-center">
          <img
            src={continentMap}
            alt="Presencia en Canadá y Chile"
            className="w-full max-w-md lg:max-w-lg"
          />
        </div>
      </div>
    </section>
  );
}
