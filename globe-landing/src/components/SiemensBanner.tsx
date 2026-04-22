const INDUSTRIES = [
  { label: 'Energía', sub: 'Gestión energética y activos eléctricos' },
  { label: 'Transporte Vertical', sub: 'Mantención y operación de ascensores y escaleras' },
  { label: 'Infraestructura Modular', sub: 'Diseño y construcción de espacios modulares' },
];

export function SiemensBanner() {
  return (
    <section id="industrias" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top row: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left column */}
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              Industrias
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Áreas de negocios
            </h2>
          </div>

          {/* Right column */}
          <div className="flex items-end">
            <p className="text-[15px] text-gray-600 leading-[1.8]">
              Las operaciones de Grupo Globe se estructuran en tres áreas que responden a necesidades críticas de infraestructura y operación: energía, transporte vertical e infraestructura modular.
            </p>
          </div>
        </div>

        {/* Bottom row: 3 image cards centered */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {INDUSTRIES.map((item) => (
            <div
              key={item.label}
              className="relative aspect-[3/4] rounded-xl bg-gray-200 overflow-hidden flex flex-col items-start justify-end"
            >
              {/* Placeholder for image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="relative z-10 p-5">
                <span className="text-base font-bold text-white">{item.label}</span>
                <p className="mt-1 text-xs text-white/80">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
