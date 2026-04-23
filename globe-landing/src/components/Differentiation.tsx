const items = [
  {
    title: 'Eficiencia operativa',
    desc: 'Estructuramos cada operación para que los recursos se traduzcan en resultados.',
    // Material Symbol: engineering
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm13.1-8.16c.01-.11.02-.22.02-.34 0-.12-.01-.23-.03-.34l.74-.58c.07-.05.08-.15.04-.22l-.7-1.21c-.04-.08-.14-.1-.21-.08l-.86.35c-.18-.14-.38-.25-.59-.34l-.13-.93A.18.18 0 0020.2 3h-1.4c-.09 0-.16.06-.17.15l-.13.93c-.21.09-.41.21-.59.34l-.87-.35c-.08-.03-.17 0-.21.08l-.7 1.21c-.04.08-.02.17.04.22l.74.58c-.02.11-.03.23-.03.34 0 .11.01.23.03.34l-.74.58c-.07.05-.08.15-.04.22l.7 1.21c.04.08.14.1.21.08l.87-.35c.18.14.38.25.59.34l.13.93c.01.09.08.15.17.15h1.4c.09 0 .16-.06.17-.15l.13-.93c.21-.09.41-.21.59-.34l.87.35c.08.03.17 0 .21-.08l.7-1.21c.04-.08.02-.17-.04-.22l-.74-.58zM19.5 7.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm-.1 3.41l-.87.35c-.18-.14-.38-.25-.59-.34l-.13-.93A.18.18 0 0017.64 10h-1.4c-.09 0-.16.06-.17.15l-.13.93c-.21.09-.41.21-.59.34l-.87-.35c-.08-.03-.17 0-.21.08l-.7 1.21c-.04.08-.02.17.04.22l.74.58c-.02.11-.03.23-.03.34 0 .11.01.23.03.34l-.74.58c-.07.05-.08.15-.04.22l.7 1.21c.04.08.14.1.21.08l.87-.35c.18.14.38.25.59.34l.13.93c.01.09.08.15.17.15h1.4c.09 0 .16-.06.17-.15l.13-.93c.21-.09.41-.21.59-.34l.87.35c.08.03.17 0 .21-.08l.7-1.21c.04-.08.02-.17-.04-.22l-.74-.58c.02-.11.03-.23.03-.34 0-.11-.01-.23-.03-.34l.74-.58c.07-.05.08-.15.04-.22l-.7-1.21c-.04-.08-.14-.1-.21-.08zM16.94 16c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
      </svg>
    ),
  },
  {
    title: 'Integradores',
    desc: 'Trabajamos junto a partners de clase mundial (Siemens, Meypar, Otis, Schindler, entre otros), integrando tecnología líder con ejecución local.',
    // Material Symbol: handshake
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.22 19.85c-.18.18-.5.21-.71 0L6.91 15.3a.505.505 0 010-.71l.71-.71c.18-.18.5-.21.71 0l3.89 3.89c.2.2.51.2.71 0l.71-.71-3.18-3.18c-.18-.18-.18-.51 0-.71l.71-.71c.18-.18.51-.18.71 0l3.18 3.18.71-.71-3.18-3.18c-.18-.18-.18-.51 0-.71l.71-.71c.18-.18.51-.18.71 0l3.18 3.18.71-.71-3.89-3.89a.505.505 0 010-.71l.71-.71c.18-.18.5-.21.71 0l4.59 4.59c.18.18.18.5 0 .71l-7.07 7.07c-.19.19-.51.19-.7 0zM2 8l4.05-4.05c.47-.47 1.1-.7 1.71-.66L11.19 7l-.54.54c-.95.95-.95 2.49 0 3.44l5.37 5.37c.95.95 2.49.95 3.44 0L20 15.81l.94.94c.18.18.18.5 0 .71l-4.24 4.24c-.47.47-1.1.73-1.77.73-.67 0-1.3-.26-1.77-.73L8.11 16.65c-.47-.47-1.1-.73-1.77-.73-.67 0-1.3.26-1.77.73l-.71.71L2 15.5V8z" />
      </svg>
    ),
  },
  {
    title: 'Tecnología y visibilidad',
    desc: 'Desarrollamos plataformas propias de monitoreo, análisis y trazabilidad. Nuestros clientes ven sus activos en tiempo real, no en un reporte mensual.',
    // Material Symbol: dashboard_2_gear
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zM15 20H6c-.55 0-1-.45-1-1v-1h10v2zm4-1c0 .55-.45 1-1 1s-1-.45-1-1v-3H8V5h11v14zM9 7h6v2H9V7zm7 0h2v2h-2V7zm-7 3h6v2H9v-2zm7 0h2v2h-2v-2z" />
      </svg>
    ),
  },
  {
    title: 'Experiencia técnica',
    desc: 'Equipos especializados con conocimiento profundo en sistemas críticos: energía, transporte vertical e infraestructura.',
    // Material Symbol: support_agent
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28-.6.34-1 .98-1 1.72v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62z" />
        <circle cx="9" cy="13" r="1" />
        <circle cx="15" cy="13" r="1" />
        <path d="M18 11.03A6.04 6.04 0 0012.05 6C9.02 6 5.76 8.51 6.02 12.45c2.47-2.04 5.6-2.73 8.56-2.01 1.1.27 2.43.77 3.42 1.59z" />
      </svg>
    ),
  },
];

export function Differentiation() {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-5 bg-white p-8 min-h-[260px]"
            >
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand">
                {item.icon}
              </div>

              <div>
                <h3 className="text-base font-semibold text-grey-900">{item.title}</h3>
                <p className="mt-2 text-sm text-grey-700 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
