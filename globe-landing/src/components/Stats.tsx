const stats = [
  { value: '+70', label: 'ACTIVOS GESTIONADOS' },
  { value: '99%', label: 'UPTIME CONTINUO' },
  { value: '15%', label: 'REDUCCIÓN CONSUMO' },
];

export function Stats() {
  return (
    <section className="py-14 sm:py-20 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl sm:text-5xl font-bold text-navy">{s.value}</p>
              <p className="mt-2 text-xs font-semibold text-gray-400 tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
