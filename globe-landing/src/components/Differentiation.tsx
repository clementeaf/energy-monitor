const items = [
  {
    title: 'Alianza Siemens',
    desc: 'Rigor industrial con hardware y software de clase mundial para edificios comerciales.',
  },
  {
    title: 'Mantenimiento 24/7',
    desc: 'Mantenimiento preventivo y correctivo con telemetría activa. Anticipamos fallas, no las reparamos.',
  },
  {
    title: 'Cloud + IA',
    desc: 'Detección temprana de anomalías y análisis predictivo en plataformas cloud empresariales.',
  },
  {
    title: 'Despliegue sin Impacto',
    desc: 'Implementación escalonada en 5 fases que no interrumpe la operación diaria de tu activo.',
  },
  {
    title: 'Soporte Humano',
    desc: 'Atención personalizada por especialistas. Sin bots, sin tickets perdidos. Respuesta en menos de 1 hora.',
  },
  {
    title: 'Sostenibilidad Validada',
    desc: 'Certificación Sistema B, respaldo I-RECs y apoyo para cumplimiento de estándares ISO 50.001.',
  },
];

export function Differentiation() {
  return (
    <section className="py-24 sm:py-32 px-5 sm:px-10 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="section-title text-center">
          ¿Por qué Globe Power?
        </h2>
        <p className="mt-4 text-sm text-text-body text-center max-w-2xl mx-auto font-light">
          El único integrador en Chile que combina rigor industrial y soporte humano.
        </p>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-lg bg-white border border-gp-200/60 shadow-card card-hover"
            >
              <h3 className="text-base font-semibold text-gp-800">{item.title}</h3>
              <p className="mt-2 text-sm text-text-body leading-relaxed font-light">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
