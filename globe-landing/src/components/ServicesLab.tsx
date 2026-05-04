export function ServicesLab() {
  return (
    <section className="relative w-full h-[670px] overflow-hidden">
      {/* Background image placeholder */}
      <div className="absolute inset-0 bg-grey-800" />
      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(0deg, rgba(28,28,28,0.7) 0%, transparent 60%)' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-5 sm:px-10 lg:px-[60px]">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-4">
          <span className="font-body text-[14px] leading-[20px] font-medium text-white/70 uppercase tracking-wide">
            Globe Services Lab
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-white max-w-[700px]">
            Diagnóstico avanzado desde nuestro laboratorio técnico
          </h2>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-white/80 max-w-[700px]">
            Nuestro laboratorio nos permite evaluar, reparar y optimizar placas electrónicas de ascensores y sistemas de transporte vertical, mejorando la precisión en cada intervención.
          </p>
        </div>
      </div>
    </section>
  );
}
