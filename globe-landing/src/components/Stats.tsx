const stats = [
  { value: '+70', label: 'Activos Gestionados' },
  { value: '99%', label: 'Uptime Continuo' },
  { value: '15%', label: 'Reducción Consumo' },
];

export function Stats() {
  return (
    <section className="py-16 sm:py-20 bg-gp-900">
      <div className="max-w-4xl mx-auto px-5 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-5xl sm:text-6xl font-bold text-white">{s.value}</p>
              <p className="mt-3 text-xs font-semibold text-gp-300 tracking-widest uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
