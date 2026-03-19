const items = [
  { num: '01', title: 'Comercialización Energética', desc: 'Comercializamos la energía de la mano de nuestros clientes, optimizando contratos y aprovechando oportunidades de mercado.' },
  { num: '02', title: 'Financiamiento de Equipamiento', desc: 'Financiamos el equipamiento y asumimos la gestión del facility eléctrico, liberando tu capital para tu core business.' },
  { num: '03', title: 'Ingresos Recuperados', desc: 'Generamos ingresos recuperados, reducimos costos operativos y liberamos flujo de caja para inversiones estratégicas.' },
  { num: '04', title: 'Beneficios Tributarios', desc: 'Beneficios tributarios y comerciales directos para el propietario del activo, maximizando el retorno de inversión.' },
];

export function Financial() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Transformamos un gasto ciego en una nueva línea de ingresos
        </h2>

        <div className="mt-14 grid sm:grid-cols-2 gap-x-10 gap-y-12">
          {items.map((item) => (
            <div key={item.num}>
              <span className="text-xs font-semibold text-gray-300">{item.num}</span>
              <h3 className="mt-1 text-base font-semibold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-gray-400 mb-5">¿Cuánto podrías recuperar con este modelo?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-center text-sm">
              Calcula tu Potencial de Ahorro
            </a>
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-navy font-medium rounded-md hover:bg-gray-50 transition-colors text-center text-sm">
              Ver Caso Financiero Real
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-400">Respuesta en 24 horas — Proyección personalizada</p>
        </div>
      </div>
    </section>
  );
}
