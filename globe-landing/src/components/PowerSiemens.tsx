import alianza from '../assets/power/alianza.png';

export function PowerSiemens() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[360px] sm:min-h-[420px] lg:min-h-[480px] flex items-end">
        <img
          src={alianza}
          alt="Alianza con Siemens"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0a1628]/70" />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-[60px] py-12 lg:py-16 flex flex-col gap-8">
          <span className="self-start font-body text-[13px] leading-[20px] font-medium text-white bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
            Alianza Siemens
          </span>
          <h2 className="font-heading text-[28px] sm:text-[36px] lg:text-[44px] leading-[1.15] font-extrabold text-white max-w-[700px]">
            Tecnología Siemens integrada en cada proyecto energético
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-white/80 max-w-[700px]">
            Globe Power integra tecnología Siemens en medición inteligente, automatización eléctrica y plataformas de control multi-sitio, garantizando compatibilidad con estándares industriales internacionales, trazabilidad y escalabilidad para proyectos de cualquier tamaño.
          </p>
        </div>
      </div>
    </section>
  );
}
