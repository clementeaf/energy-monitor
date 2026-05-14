const STEPS = [
  { num: '01', title: 'Consumo real', color: '#9a9a7a' },
  { num: '02', title: 'Medición SENTRON', color: '#6b7a4a' },
  { num: '03', title: 'Procesamiento', color: '#4a5a30' },
  { num: '04', title: 'Facturación exacta', color: '#2e3a1c' },
];

const PILLS = ['Lorem ipsum', 'Sin Prorrateo', 'Datos Auditables'];

export function PowerProcess() {
  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center gap-6">
        <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
          Propuesta de valor
        </span>
        <h2 className="font-heading text-h3 lg:text-h2 text-grey-900 max-w-[900px]">
          Transparencia total que elimina cobros injustos y fricciones
        </h2>
        <p className="font-body text-[15px] sm:text-[16px] leading-[24px] text-grey-600 max-w-[800px]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>

        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6 lg:gap-12 mt-10 lg:mt-16 w-full max-w-[1000px]">
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-4">
              <div
                className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] lg:w-[96px] lg:h-[96px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: s.color }}
              >
                <span className="font-heading text-[28px] sm:text-[32px] lg:text-[36px] font-extrabold text-white">
                  {s.num}
                </span>
              </div>
              <h3 className="font-heading text-[16px] sm:text-[18px] lg:text-[20px] leading-[1.3] font-extrabold text-grey-900">
                {s.title}
              </h3>
              <p className="font-body text-[13px] sm:text-[14px] leading-[20px] text-grey-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
          ))}
        </div>

        {/* Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {PILLS.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-[#d4dcc4] bg-[#f0f2e8] px-5 py-2.5 font-body text-[14px] leading-[18px] text-grey-700"
            >
              <svg className="w-4 h-4 text-[#6b7a4a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
