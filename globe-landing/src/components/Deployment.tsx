const phases = [
  { num: '1', title: 'Planificación', desc: 'Consultoría técnica' },
  { num: '2', title: 'Integración', desc: 'Instalación SENTRON' },
  { num: '3', title: 'Monitoreo Inicial', desc: 'Puesta en marcha' },
  { num: '4', title: 'Escalamiento', desc: 'Expansión propiedades' },
  { num: '5', title: 'Despliegue Total', desc: 'Operación 24/7' },
];

export function Deployment() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Despliegue escalonado con cero impacto en la operación diaria
        </h2>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {phases.map((p) => (
            <div key={p.num} className="text-center">
              <span className="text-2xl font-bold text-gray-200">{p.num}</span>
              <h3 className="mt-1 text-sm font-semibold text-navy">{p.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-navy font-medium">Sin impacto operativo. Cero riesgo.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-center text-sm">
              Comienza tu Evaluación
            </a>
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-navy font-medium rounded-md hover:bg-gray-50 transition-colors text-center text-sm">
              Ver Cronograma de Implementación
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-400">Despliegue piloto disponible — Prueba antes de escalar</p>
        </div>
      </div>
    </section>
  );
}
