const stats = [
  { value: '+430', label: 'Clientes' },
  { value: '+20%', label: 'Ahorro en consumo energético a clientes' },
  { value: '+90.000', label: 'Llamados de emergencia resueltos' },
  { value: '+150.000 m²', label: 'De construcción modular' },
];

export function Stats() {
  return (
    <section className="bg-grey-900 py-[80px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 flex flex-col gap-[60px] text-center">
        {/* Title — Figma: H2 ExtraBold 36px/44px, white */}
        <h2 className="font-heading text-[36px] leading-[44px] font-extrabold text-white">
          Grupo Globe en números
        </h2>

        {/* Stats row — Figma: flex, gap-32, text-left */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 flex flex-col gap-2.5 text-left">
              <p className="font-heading text-[48px] leading-[56px] font-extrabold text-white">
                {s.value}
              </p>
              <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-200">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
