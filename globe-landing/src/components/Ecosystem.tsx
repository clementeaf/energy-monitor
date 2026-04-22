const VALUES = [
  'Integridad',
  'Cliente en el centro',
  'Excelencia operacional',
  'Impacto positivo',
];

export function Ecosystem() {
  return (
    <section id="valores" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-[#F9F9F9]">
      <div className="max-w-7xl mx-auto">
        {/* Top row: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left column */}
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              Valores
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Los principios que sostienen cada operación
            </h2>
          </div>

          {/* Right column */}
          <div className="flex items-end">
            <p className="text-[15px] text-gray-600 leading-[1.8]">
              No son declaraciones. Son los criterios que usamos para tomar decisiones técnicas, operacionales y comerciales todos los días.
            </p>
          </div>
        </div>

        {/* Bottom row: 4 image placeholders */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((label) => (
            <div
              key={label}
              className="relative aspect-[4/3] rounded-xl bg-gray-200 overflow-hidden flex items-end"
            >
              {/* Placeholder for image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="relative z-10 px-4 pb-4 text-sm font-semibold text-white">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
