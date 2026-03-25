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
    <section id="resultados" className="py-24 sm:py-32 px-5 sm:px-10 lg:px-12 bg-gp-50">
      <div className="max-w-4xl mx-auto">
        <p className="section-label text-center">Resultados</p>
        <h2 className="section-title text-center">
          Cifras que respaldan nuestra operación
        </h2>

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {results.map((r) => (
            <div key={r.label} className="text-center">
              <p className="text-4xl sm:text-5xl font-bold text-gp-700">{r.value}</p>
              <p className="mt-3 text-sm text-text-body font-light">{r.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a href="#contacto" className="btn-primary">
            Agenda una Consulta
          </a>
        </div>
      </div>
    </section>
  );
}
