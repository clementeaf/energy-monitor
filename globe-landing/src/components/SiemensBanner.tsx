const steps = [
  { label: 'Consumo Real', sub: 'Medición por operador' },
  { label: 'SENTRON', sub: 'Hardware industrial' },
  { label: 'Powermind', sub: 'Procesamiento cloud' },
  { label: 'Facturación Exacta', sub: 'Datos auditables' },
];

export function SiemensBanner() {
  return (
    <section className="relative py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-gp-900 overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gp-700/10 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <span className="inline-block px-4 py-1.5 text-xs font-semibold text-gp-300 bg-gp-800 rounded-pill tracking-wider uppercase border border-gp-700/30">
          Siemens Partner
        </span>
        <h2 className="mt-5 text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          Tecnología Siemens SENTRON con precisión &gt;99%
        </h2>
        <p className="mt-4 text-sm text-gp-300 max-w-xl mx-auto font-light">
          Equipos SENTRON 7KT1661 y PAC 4220 con integración nativa a plataformas cloud como Insights Hub, AWS y Azure.
        </p>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.label} className="relative">
              <div className="p-5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm card-hover hover:bg-white/10 hover:border-white/20">
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-xs text-gp-300 font-light">{step.sub}</p>
              </div>
              {i < steps.length - 1 && (
                <span className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-gp-400 text-xs">
                  &rarr;
                </span>
              )}
            </div>
          ))}
        </div>

        <a href="#contacto" className="btn-white mt-12">
          Conoce la Tecnología
        </a>
      </div>
    </section>
  );
}
