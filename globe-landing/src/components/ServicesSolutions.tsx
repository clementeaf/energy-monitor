const CATEGORIES = [
  ['Montacargas'],
  ['Ascensores', 'Escaleras mecánicas'],
  ['Rampas mecánicas', 'Salvaescaleras'],
  ['Plataformas de carga y descarga'],
];

export function ServicesSolutions() {
  return (
    <section className="py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-[80px]">
        {/* Left column — title + description */}
        <div className="flex flex-col gap-6 lg:max-w-[707px]">
          <div className="flex flex-col gap-[8px]">
            <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
              Soluciones
            </span>
            <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
              Globe Services
            </h2>
          </div>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
            Acompañamos a empresas, comunidades y espacios públicos como un partner de confianza, con un servicio integral pensado para cada etapa del ciclo de vida de tus equipos.
          </p>
        </div>

        {/* Right column — category pills */}
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((row, ri) => (
            <div key={ri} className="flex flex-wrap gap-3 w-full">
              {row.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-body text-[14px] sm:text-[16px] leading-[26px] text-grey-900"
                  style={{ background: 'radial-gradient(circle, transparent 40%, rgba(246,231,222,0.4) 100%)' }}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-200 shrink-0" />
                  {cat}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
