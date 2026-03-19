export function EmsBms() {
  return (
    <section id="services" className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10 bg-surface">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">EMS</p>
            <h3 className="mt-2 text-base font-semibold text-navy">Energy Management System</h3>
            <p className="mt-2 text-sm text-gray-500">Analiza y optimiza consumo energético</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">BMS</p>
            <h3 className="mt-2 text-base font-semibold text-navy">Building Management System</h3>
            <p className="mt-2 text-sm text-gray-500">Ejecuta y automatiza infraestructura edilicia</p>
          </div>
        </div>

        <div className="text-center border-t border-gray-200 pt-10">
          <p className="text-sm text-navy font-medium">
            Gestor energético integrado. Eficiencia + mejora continua + cumplimiento ISO 50.001
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-center text-sm">
              Solicita una Demo Técnica
            </a>
            <a href="#contacto" className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-navy font-medium rounded-md hover:bg-gray-50 transition-colors text-center text-sm">
              Descargar Especificaciones Técnicas
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-400">Presentación personalizada — 30 minutos</p>
        </div>
      </div>
    </section>
  );
}
