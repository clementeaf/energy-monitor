const PILLARS = [
  { label: 'Tecnología propia', sub: 'Gestión energética en tiempo real' },
  { label: 'Formación técnica', sub: 'Formamos al especialista del mañana' },
  { label: 'Inteligencia artificial', sub: 'Próximamente' },
];

export function Innovation() {
  return (
    <section id="innovacion" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top row: centered text */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
            Cultura e innovación
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Cómo innovamos
          </h2>

          <p className="mt-4 text-[15px] text-gray-600 leading-[1.8]">
            Segmentamos nuestra cultura de innovación en tres pilares fundamentales
          </p>
        </div>

        {/* Bottom row: 3 image squares */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PILLARS.map((item) => (
            <div
              key={item.label}
              className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden flex flex-col items-start justify-end"
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
