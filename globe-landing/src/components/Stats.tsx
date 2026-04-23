const stats = [
  { value: '+430', label: 'Clientes' },
  { value: '+20%', label: 'Ahorro en consumo energético a clientes' },
  { value: '+90.000', label: 'Llamados de emergencia resueltos' },
  { value: '+150.000 m²', label: 'De construcción modular' },
];

export function Stats() {
  return (
    <section className="bg-grey-900 py-16 sm:py-20 px-5 sm:px-10 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">
          Grupo Globe en números
        </h2>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl sm:text-4xl font-bold text-white">{s.value}</p>
              <p className="mt-2 text-base sm:text-sm text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
