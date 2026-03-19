const pillars = [
  {
    num: '01',
    title: 'Subdistribución y Remarcación',
    desc: 'Medición real por operador con precisión >99%. Eliminamos el prorrateo por metro cuadrado y asignamos consumos reales a cada inquilino con datos auditables y transparentes.',
  },
  {
    num: '02',
    title: 'Mantenimiento Eléctrico',
    desc: 'Continuidad operativa 24/7 con mantenimiento preventivo y correctivo. Telemetría activa para anticipar fallas en salas eléctricas y transformadores antes de que ocurran.',
  },
  {
    num: '03',
    title: 'Eficiencia Energética',
    desc: 'Optimización alineada a normativas ISO 50.001. Detectamos consumos anómalos, identificamos oportunidades de ahorro y habilitamos contratos competitivos para activos >300 kW.',
  },
  {
    num: '04',
    title: 'Software y Reportería',
    desc: 'Plataforma Power Digital para análisis predictivo, gestión en tiempo real y reportería avanzada. Integración nativa con Powercenter 3000 vía Modbus TCP/RTU.',
  },
];

export function Ecosystem() {
  return (
    <section id="ecosistema" className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase text-center">Nuestros Servicios</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-navy text-center">
          Un ecosistema integral bajo un solo responsable
        </h2>
        <p className="mt-4 text-sm text-gray-500 text-center max-w-2xl mx-auto">
          Cuatro pilares que cubren toda la cadena energética de tu edificio: desde la medición hasta el mantenimiento.
        </p>
        <div className="mt-14 grid sm:grid-cols-2 gap-8">
          {pillars.map((p) => (
            <div key={p.num} className="p-5 bg-white rounded-lg border border-gray-100">
              <span className="text-xs font-semibold text-gray-300">{p.num}</span>
              <h3 className="mt-1 text-base font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Contáctanos
          </a>
        </div>
      </div>
    </section>
  );
}
