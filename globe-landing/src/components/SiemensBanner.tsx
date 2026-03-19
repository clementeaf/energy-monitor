const steps = [
  { label: 'Consumo Real', sub: 'Medición por operador' },
  { label: 'SENTRON', sub: 'Hardware industrial' },
  { label: 'Powermind', sub: 'Procesamiento cloud' },
  { label: 'Facturación Exacta', sub: 'Datos auditables' },
];

export function SiemensBanner() {
  return (
    <section className="py-16 sm:py-20 px-5 sm:px-8 lg:px-10 bg-navy">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-300 bg-white/10 rounded tracking-wider uppercase">
          Siemens Partner
        </span>
        <h2 className="mt-4 text-xl sm:text-2xl font-bold text-white">
          Tecnología Siemens SENTRON con precisión &gt;99%
        </h2>
        <p className="mt-3 text-sm text-gray-400 max-w-xl mx-auto">
          Equipos SENTRON 7KT1661 y PAC 4220 con integración nativa a plataformas cloud como Insights Hub, AWS y Azure.
        </p>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.label} className="relative">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-xs text-gray-400">{step.sub}</p>
              </div>
              {i < steps.length - 1 && (
                <span className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-500 text-xs">&rarr;</span>
              )}
            </div>
          ))}
        </div>

        <a
          href="#contacto"
          className="mt-10 inline-flex px-6 py-2.5 bg-white text-navy font-medium rounded-md hover:bg-gray-100 transition-colors text-sm"
        >
          Conoce la Tecnología
        </a>
      </div>
    </section>
  );
}
