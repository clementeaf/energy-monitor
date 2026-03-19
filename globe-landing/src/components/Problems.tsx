const problems = [
  {
    num: '01',
    title: 'Cobros Ineficientes',
    desc: 'La facturación por metro cuadrado, sin medición real por operador, genera ajustes manuales, errores e injusticias.',
  },
  {
    num: '02',
    title: 'Falta de Control',
    desc: 'Sin telemetría en tiempo real, los costos operativos aumentan por consumos anómalos no detectados.',
  },
  {
    num: '03',
    title: 'Oportunidades Perdidas',
    desc: 'Activos con más de 300 kW de consumo permanecen en régimen regulado, perdiendo la ventaja de negociar contratos competitivos.',
  },
  {
    num: '04',
    title: 'Mantenimientos Correctivos',
    desc: 'Reparar al romper es mucho más caro a largo plazo que el preventivo.',
  },
];

export function Problems() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center max-w-3xl mx-auto">
          Los activos operan con modelos obsoletos y riesgos invisibles
        </h2>
        <div className="mt-14 grid sm:grid-cols-2 gap-x-10 gap-y-12">
          {problems.map((p) => (
            <div key={p.num}>
              <span className="text-xs font-semibold text-gray-300">{p.num}</span>
              <h3 className="mt-1 text-base font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">Transformemos estos riesgos en oportunidades</p>
          <a href="#ecosistema" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Ver la Solución
          </a>
        </div>
      </div>
    </section>
  );
}
