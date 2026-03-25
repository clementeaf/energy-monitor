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
    <section id="ecosistema" className="py-24 sm:py-32 px-5 sm:px-10 lg:px-12 bg-gp-50">
      <div className="max-w-5xl mx-auto">
        <p className="section-label text-center">Nuestros Servicios</p>
        <h2 className="section-title text-center">
          Un ecosistema integral bajo un solo responsable
        </h2>
        <p className="mt-4 text-sm text-text-body text-center max-w-2xl mx-auto font-light">
          Cuatro pilares que cubren toda la cadena energética de tu edificio: desde la medición hasta el mantenimiento.
        </p>

        <div className="mt-16 grid sm:grid-cols-2 gap-8">
          {pillars.map((p) => (
            <div
              key={p.num}
              className="group p-6 bg-white rounded-lg border border-gp-200/60 shadow-card card-hover relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gp-700 transition-all duration-300 group-hover:w-1.5" />
              <div className="pl-4">
                <span className="text-xs font-bold text-gp-300">{p.num}</span>
                <h3 className="mt-1 text-base font-semibold text-gp-800">{p.title}</h3>
                <p className="mt-3 text-sm text-text-body leading-relaxed font-light">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a href="#contacto" className="btn-primary">
            Contáctanos
          </a>
        </div>
      </div>
    </section>
  );
}
