export function Hero() {
  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-36 px-5 sm:px-8 lg:px-10">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-tight">
          Transformamos la energía en un recurso estratégico de tu activo
        </h1>
        <p className="mt-6 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Gestión operativa, tecnológica y sostenible con estándar internacional.
        </p>
        <p className="mt-3 text-sm text-gray-400">
          Cuidamos tu energía, todos los días.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#contacto"
            className="w-full sm:w-auto px-8 py-3 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-center text-sm"
          >
            Agenda una Consultoría Técnica
          </a>
          <a
            href="#ecosistema"
            className="w-full sm:w-auto px-8 py-3 border border-gray-300 text-navy font-medium rounded-md hover:bg-gray-50 transition-colors text-center text-sm"
          >
            Ver la Solución
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Evaluación sin costo — Visita técnica incluida
        </p>
      </div>
    </section>
  );
}
