export function Contact() {
  return (
    <section id="contacto">
      <div className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-navy">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Lideremos juntos la gestión energética corporativa en Chile
          </h2>
          <p className="mt-4 text-gray-400 text-sm sm:text-base">
            Nuestra propuesta es una alianza a largo plazo para transformar la energía en el mayor activo de tus edificios.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:aportilla@globepower.cl"
              className="w-full sm:w-auto px-8 py-3 bg-white text-navy font-medium rounded-md hover:bg-gray-100 transition-colors text-center text-sm"
            >
              Agenda una Consultoría Estratégica
            </a>
            <a
              href="mailto:aportilla@globepower.cl"
              className="w-full sm:w-auto px-8 py-3 border border-white/20 text-white font-medium rounded-md hover:bg-white/5 transition-colors text-center text-sm"
            >
              Contactar Ahora
            </a>
          </div>
        </div>
      </div>

      <div className="py-16 sm:py-20 px-5 sm:px-8 lg:px-10">
        <div className="max-w-sm mx-auto text-center">
          <h3 className="text-base font-semibold text-navy">Álvaro Portilla</h3>
          <p className="text-sm text-gray-400">Gerente Globe Power</p>
          <div className="mt-4 space-y-1 text-sm text-gray-500">
            <p>aportilla@globepower.cl</p>
            <p>+56 9 5780 9131</p>
            <p>www.globepower.com</p>
          </div>
          <p className="mt-5 text-sm text-gray-400 italic">Cuidamos tu energía, todos los días.</p>
        </div>
      </div>
    </section>
  );
}
