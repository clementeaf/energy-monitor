const items = [
  {
    title: 'Eficiencia operativa',
    desc: 'Estructuramos cada operación para que los recursos se traduzcan en resultados.',
  },
  {
    title: 'Integradores',
    desc: 'Trabajamos junto a partners de clase mundial (Siemens, Meypar, Otis, Schindler, entre otros), integrando tecnología líder con ejecución local.',
  },
  {
    title: 'Tecnología y visibilidad',
    desc: 'Desarrollamos plataformas propias de monitoreo, análisis y trazabilidad. Nuestros clientes ven sus activos en tiempo real, no en un reporte mensual.',
  },
  {
    title: 'Experiencia técnica',
    desc: 'Equipos especializados con conocimiento profundo en sistemas críticos: energía, transporte vertical e infraestructura.',
  },
];

export function Differentiation() {
  return (
    <section className="bg-white">
      <div className="grid grid-cols-1 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex gap-5 border border-gray-100 bg-white p-8"
            >
              {/* Icon circle placeholder */}
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-red-600/10">
                <div className="w-5 h-5 rounded-full bg-red-600/30" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
