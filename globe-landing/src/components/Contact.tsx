export function Contact() {
  return (
    <section id="contacto">
      <div className="relative py-24 sm:py-32 px-5 sm:px-10 lg:px-12 bg-gp-900 overflow-hidden">
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-gp-700/10 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold text-white leading-tight">
            Lideremos juntos la gestión energética corporativa en Chile
          </h2>
          <p className="mt-5 text-gp-300 text-sm sm:text-base font-light max-w-xl mx-auto">
            Nuestra propuesta es una alianza a largo plazo para transformar la energía en el mayor activo de tus edificios.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:comercial@globepower.cl" className="btn-white w-full sm:w-auto">
              Agenda una Consultoría Estratégica
            </a>
            <a href="mailto:comercial@globepower.cl" className="btn-ghost w-full sm:w-auto">
              Contactar Ahora
            </a>
          </div>
        </div>
      </div>

      <div className="py-16 sm:py-20 px-5 sm:px-10 lg:px-12">
        <div className="max-w-sm mx-auto text-center">
          <h3 className="text-lg font-bold text-gp-800">Globe Power</h3>
          <div className="mt-4 space-y-1 text-sm text-text-body font-light">
            <p>comercial@globepower.cl</p>
            <p>www.globepower.com</p>
          </div>
          <p className="mt-5 text-sm text-text-muted italic font-light">
            Cuidamos tu energía, todos los días.
          </p>
        </div>
      </div>
    </section>
  );
}
