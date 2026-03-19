export function Siemens() {
  return (
    <section id="siemens" className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase text-center">Alianza Exclusiva</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-navy text-center">
          Rigor industrial y tecnológico en alianza exclusiva con Siemens
        </h2>
        <p className="mt-4 text-center">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded tracking-wider uppercase">
            Siemens Partner
          </span>
        </p>

        <div className="mt-14 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-base font-semibold text-navy">Hardware de Precisión</h3>
            <p className="mt-1 text-sm font-medium text-accent">SENTRON PAC 4220 & 7KT1661</p>
            <p className="mt-3 text-sm text-gray-500">Precisión &gt;99% — Medición industrial en cada punto</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>&#10003; Medición trifásica de alta precisión</li>
              <li>&#10003; Registro de consumo, potencia, factor de potencia</li>
              <li>&#10003; Conectividad Modbus TCP/RTU</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-navy">Software y Cloud</h3>
            <p className="mt-1 text-sm font-medium text-accent">Power Digital + Powercenter 3000</p>
            <p className="mt-3 text-sm text-gray-500">Análisis predictivo, gestión en tiempo real, reportería avanzada</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>&#10003; Dashboards en tiempo real</li>
              <li>&#10003; AI para detección temprana de anomalías</li>
              <li>&#10003; Integración AWS, Azure, Insights Hub</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
