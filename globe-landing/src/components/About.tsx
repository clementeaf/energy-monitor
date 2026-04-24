export function About() {
  return (
    <section id="nosotros" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 py-[128px]">
        {/* Label + Title — Figma: w-560, gap-8, pb-60 */}
        <div className="flex flex-col gap-2 max-w-[560px] pb-[60px] text-grey-900">
          <span className="font-body text-[16px] leading-[20px] font-normal">
            QUIÉNES SOMOS
          </span>
          <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
            Grupo Globe
          </h2>
        </div>

        {/* Body — Figma: Plus Jakarta Sans Medium 22px/30px, grey-700 */}
        <div className="font-heading text-[22px] leading-[30px] font-medium text-grey-700">
          <p>
            Somos un grupo empresarial de origen canadiense que desarrolla y opera soluciones en energía e infraestructura crítica. Actuamos como partner estratégico, integrando ingeniería, tecnología y ejecución propia para asegurar continuidad, eficiencia y control en activos complejos.
          </p>
          <p className="mt-[30px]">
            Operamos en tres líneas:{'\n'}
            energía y sistemas eléctricos, transporte vertical e infraestructura modular.
          </p>
          <p className="mt-[30px]">
            Impulsamos un nuevo estándar basado en seguridad, tecnología, confiabilidad y gestión en tiempo real.
          </p>
        </div>
      </div>
    </section>
  );
}
