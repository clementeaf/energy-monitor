const results = [
  { value: '+70', label: 'Activos Gestionados' },
  { value: '+2000', label: 'Puntos de Medición' },
  { value: '>90%', label: 'Cobertura Instalación' },
  { value: '99%', label: 'Uptime del Sistema' },
  { value: '15%', label: 'Reducción Consumo No Facturado' },
  { value: '20%', label: 'Ahorro en Mantenimiento' },
];

export function Results() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase text-center">Resultados</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-navy text-center">
          Cifras que respaldan nuestra operación
        </h2>
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-3 gap-10">
          {results.map((r) => (
            <div key={r.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-navy">{r.value}</p>
              <p className="mt-2 text-sm text-gray-500">{r.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <a
            href="#contacto"
            className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm"
          >
            Agenda una Consulta
          </a>
        </div>
      </div>
    </section>
  );
}
