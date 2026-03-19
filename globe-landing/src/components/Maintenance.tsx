const pillars = [
  { title: 'Telemetría Activa', desc: 'Anticipamos fallas antes de que ocurran mediante monitoreo continuo y alertas predictivas.' },
  { title: 'Decisiones Basadas en Datos', desc: 'De reactivo a predictivo. Los datos históricos y en tiempo real guían las intervenciones.' },
  { title: 'Eficiencia Presupuestaria', desc: 'Realizamos los mantenimientos que los datos demandan, generando ahorro de 20% en presupuesto.' },
];

export function Maintenance() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          El mantenimiento 4.0 es gestión de riesgos y continuidad operativa
        </h2>
        <p className="mt-4 text-sm text-gray-500 text-center max-w-2xl mx-auto">
          El mantenimiento ya no es una simple operación; es el pilar de la seguridad eléctrica.
        </p>

        <div className="mt-14 grid sm:grid-cols-3 gap-10">
          {pillars.map((p) => (
            <div key={p.title}>
              <h3 className="text-base font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">¿Cuál es el nivel de riesgo de tu infraestructura eléctrica?</p>
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Solicita una Evaluación de Riesgo
          </a>
          <p className="mt-3 text-xs text-gray-400">Inspección termográfica incluida — Sin costo</p>
        </div>
      </div>
    </section>
  );
}
