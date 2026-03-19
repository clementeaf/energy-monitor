const pillars = [
  {
    num: '01',
    title: 'Subdistribución y Remarcación',
    desc: 'Transparencia absoluta en la medición. Precisión >99% con hardware Siemens SENTRON.',
  },
  {
    num: '02',
    title: 'Eficiencia Energética',
    desc: 'Optimización alineada a normativas internacionales. ISO 50001, auditorías, SGE.',
  },
  {
    num: '03',
    title: 'Software y Reportería',
    desc: 'Telemetría y análisis en tiempo real. Power Digital, dashboards, AI insights.',
  },
  {
    num: '04',
    title: 'Mantenimiento Eléctrico',
    desc: 'Continuidad operativa preventiva y correctiva 24/7. Mantenimiento 4.0 predictivo.',
  },
];

export function Ecosystem() {
  return (
    <section id="ecosistema" className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase text-center">Arquitectura Completa</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-navy text-center">
          Un ecosistema integral bajo un solo responsable
        </h2>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((p) => (
            <div key={p.num}>
              <span className="text-xs font-semibold text-gray-300">{p.num}</span>
              <h3 className="mt-1 text-base font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              <a href="#" className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Conoce más &rarr;
              </a>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-center text-sm">
            Hablar con un Especialista en Integración
          </a>
          <a href="#siemens" className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-navy font-medium rounded-md hover:bg-gray-50 transition-colors text-center text-sm">
            Ver Tecnología
          </a>
        </div>
      </div>
    </section>
  );
}
