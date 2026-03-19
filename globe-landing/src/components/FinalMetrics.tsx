const metrics = [
  { value: '>90%', label: 'Cobertura de Instalación', sub: 'En edificios administrados por Globe Power' },
  { value: '99%', label: 'Disponibilidad del Sistema', sub: 'Uptime continuo' },
  { value: '15%', label: 'Reducción de Consumo', sub: 'No facturado (desperdicio)' },
  { value: '20%', label: 'Ahorro en Mantenimiento', sub: 'Reducción presupuesto anual' },
  { value: '1H', label: 'Tiempo de Respuesta', sub: 'A Consultas Técnicas' },
];

export function FinalMetrics() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center mb-14">
          Métricas que respaldan nuestra eficiencia operativa
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-navy">{m.value}</p>
              <p className="mt-2 text-sm font-medium text-navy">{m.label}</p>
              <p className="mt-1 text-xs text-gray-400">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">Alcanza estos niveles de eficiencia</p>
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Comienza tu Evaluación Energética
          </a>
        </div>
      </div>
    </section>
  );
}
