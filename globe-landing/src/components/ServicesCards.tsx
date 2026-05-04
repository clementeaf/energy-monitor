export function ServicesCards() {
  return (
    <section className="py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-[128px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px] text-center">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Servicios
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Soluciones para una operación continua y eficiente
          </h2>
        </div>

        {/* Cards grid */}
        <div className="flex flex-col gap-4">
          {/* Row 1: small color | large image */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-[394px] h-[351px] shrink-0 rounded bg-orange-50" />
            <div className="flex-1 h-[351px] rounded bg-grey-200 overflow-hidden" />
          </div>

          {/* Row 2: large image | small color */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 h-[351px] rounded bg-grey-200 overflow-hidden" />
            <div className="lg:w-[394px] h-[351px] shrink-0 rounded bg-orange-500" />
          </div>

          {/* Row 3: small color | large image */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-[394px] h-[351px] shrink-0 rounded bg-orange-300" />
            <div className="flex-1 h-[351px] rounded bg-grey-200 overflow-hidden" />
          </div>

          {/* Row 4: large image | small color */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 h-[351px] rounded bg-grey-200 overflow-hidden" />
            <div className="lg:w-[394px] h-[351px] shrink-0 rounded bg-orange-200" />
          </div>
        </div>
      </div>
    </section>
  );
}
