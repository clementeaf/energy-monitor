const capabilities = [
  { title: 'Centralización Nacional', desc: 'Centralización total del consumo energético a nivel nacional bajo un estándar único.' },
  { title: 'Homogeneización', desc: 'Homogeneización de la calidad de servicio, la reportería y el control técnico en todo el portafolio.' },
  { title: 'Escalamiento Corporativo', desc: 'Escalamiento del modelo corporativo asegurando visibilidad en tiempo real de todo el portafolio.' },
];

export function Portfolio() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Estandarización y control absoluto para más de 70 activos
        </h2>

        <div className="mt-12 flex justify-center gap-16 sm:gap-24">
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold text-navy">+70</p>
            <p className="mt-2 text-sm text-gray-500">Activos Gestionados</p>
            <p className="text-xs text-gray-400">De distintas industrias</p>
          </div>
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold text-navy">+2000</p>
            <p className="mt-2 text-sm text-gray-500">Puntos de Medición</p>
            <p className="text-xs text-gray-400">Por activo en promedio</p>
          </div>
        </div>

        <div className="mt-14 grid sm:grid-cols-3 gap-10">
          {capabilities.map((c) => (
            <div key={c.title}>
              <h3 className="text-base font-semibold text-navy">{c.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">¿Gestionas múltiples activos?</p>
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Agenda una Consulta para Portafolio
          </a>
          <p className="mt-3 text-xs text-gray-400">Soluciones corporativas para +10 propiedades</p>
        </div>
      </div>
    </section>
  );
}
