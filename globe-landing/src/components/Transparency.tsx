const steps = ['Consumo Real', 'Medición SENTRON', 'Procesamiento', 'Facturación Exacta'];

const benefits = [
  { title: 'Consumos Reales', desc: 'Asignamos consumos reales a cada operador e inquilino' },
  { title: 'Sin Prorrateo', desc: 'Eliminamos el modelo de prorrateo por metro cuadrado' },
  { title: 'Datos Auditables', desc: 'Mejoramos la relación propietario-arrendatario con transparencia total' },
];

export function Transparency() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Transparencia total que elimina cobros injustos y fricciones
        </h2>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center">
              <span className="px-4 py-2 text-sm text-navy font-medium">
                {step}
              </span>
              {i < steps.length - 1 && (
                <span className="hidden sm:block text-gray-300">&rarr;</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div key={b.title}>
              <h3 className="text-sm font-semibold text-navy">&#10003; {b.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">¿Cuánto estás perdiendo con el modelo actual?</p>
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Solicita una Auditoría de Facturación Energética
          </a>
          <p className="mt-3 text-xs text-gray-400">Análisis gratuito — Identifica oportunidades en 48 horas</p>
        </div>
      </div>
    </section>
  );
}
