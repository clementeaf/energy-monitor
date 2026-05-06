const CATEGORIES_FLAT = [
  'Ascensores', 'Montacargas', 'Escaleras mecánicas',
  'Rampas mecánicas', 'Salvaescaleras', 'Plataformas de carga y descarga',
];

const CATEGORIES_ROWS = [
  ['Ascensores', 'Montacargas'],
  ['Escaleras mecánicas', 'Rampas mecánicas'],
  ['Salvaescaleras', 'Plataformas de carga y descarga'],
];

export function ServicesSolutions() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-[80px]">
        {/* Left column — title + description */}
        <div className="flex flex-col gap-6 lg:max-w-[707px]">
          <div className="flex flex-col gap-[8px]">
            <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide whitespace-nowrap">
              Soluciones Globe Services
            </span>
            <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
              Asegura la continuidad de tu operación con un partner experto
            </h2>
          </div>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
            Acompañamos a empresas, comunidades y espacios públicos como un partner de confianza, con un servicio integral pensado para cada etapa del ciclo de vida de tus equipos.
          </p>
        </div>

        {/* Pills — mobile: horizontal scroll, desktop: 2-col rows */}
        {/* Mobile */}
        <div className="flex lg:hidden gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {CATEGORIES_FLAT.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-body text-[14px] leading-[26px] text-grey-900 bg-[#F6E7DE] whitespace-nowrap shrink-0"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A98A] shrink-0" />
              {cat}
            </span>
          ))}
        </div>
        {/* Desktop */}
        <div className="hidden lg:flex flex-wrap gap-3">
          {CATEGORIES_ROWS.map((row, ri) => (
            <div key={ri} className="flex flex-wrap gap-3 w-full">
              {row.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-body text-[16px] leading-[26px] text-grey-900 bg-[#F6E7DE]"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4A98A] shrink-0" />
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
