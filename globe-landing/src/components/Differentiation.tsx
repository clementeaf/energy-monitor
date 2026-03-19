const items = [
  { tag: 'Rigor Industrial', title: 'Alianza Siemens', desc: 'Alianza exclusiva Siemens para SMB, garantizando calidad de clase mundial.' },
  { tag: 'Soporte Humano', title: 'Atención Personalizada', desc: 'Atención personalizada por especialistas. Sin bots, sin tickets perdidos.' },
  { tag: 'Agilidad Tecnológica', title: 'Cloud + AI', desc: 'Plataformas en la nube con IA para detección temprana de anomalías. Predictivo vs. reactivo.' },
  { tag: 'Sostenibilidad', title: 'Validación Sistema B', desc: 'Apoyo para certificaciones I-RECs y respaldo como empresa Sistema B.' },
];

export function Differentiation() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center max-w-3xl mx-auto">
          El único integrador en Chile que combina rigor industrial y soporte humano
        </h2>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {items.map((item) => (
            <div key={item.tag}>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{item.tag}</p>
              <h3 className="mt-1 text-base font-semibold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a href="#contacto" className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm">
            Agenda una Reunión Comparativa
          </a>
          <p className="mt-3 text-xs text-gray-400">30 minutos — Te mostramos la diferencia</p>
        </div>
      </div>
    </section>
  );
}
