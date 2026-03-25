export function Hero() {
  return (
    <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32 lg:pt-52 lg:pb-40 px-5 sm:px-10 lg:px-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gp-50/60 to-gp-100/40 -z-10" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gp-200/20 rounded-full blur-3xl -z-10" />

      <div className="max-w-3xl mx-auto text-center">
        <span className="section-label">Gestión Energética Corporativa</span>
        <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gp-800 leading-tight">
          Transformamos la energía en un recurso estratégico de tu activo
        </h1>
        <p className="mt-6 text-base sm:text-lg text-text-body max-w-2xl mx-auto leading-relaxed font-light">
          Gestión operativa, tecnológica y sostenible con estándar internacional.
        </p>
        <p className="mt-3 text-sm text-text-muted font-light">
          Cuidamos tu energía, todos los días.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#contacto" className="btn-primary w-full sm:w-auto">
            Agenda una Consultoría Técnica
          </a>
          <a href="#ecosistema" className="btn-secondary w-full sm:w-auto">
            Ver la Solución
          </a>
        </div>
        <p className="mt-5 text-xs text-text-muted">
          Evaluación sin costo — Visita técnica incluida
        </p>
      </div>
    </section>
  );
}
