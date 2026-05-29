const STEPS = [
  {
    num: '01',
    color: '#b8b8a0',
    title: 'Captura de datos en terreno',
    description: 'Medidores inteligentes y sensores industriales registran el consumo en tiempo real desde tableros y equipos, transmitiendo datos de forma segura a la plataforma central sin intervención manual.',
  },
  {
    num: '02',
    color: '#8a9a6a',
    title: 'Integración y consolidación operacional',
    description: 'Todos los puntos de medición se unifican en una arquitectura escalable que muestra el consumo global y desagregado por sede, área o equipo en una sola pantalla.',
  },
  {
    num: '03',
    color: '#556b3a',
    title: 'Analítica, alarmas y KPIs',
    description: 'La plataforma genera KPIs de consumo, activa alarmas ante desviaciones y produce reportes automáticos para detectar problemas antes de que generen sobrecostos o fallas.',
  },
  {
    num: '04',
    color: '#2e3a1c',
    title: 'Gestión de subdistribución y facturación interna',
    description: 'Para edificios, malls o parques industriales con múltiples arrendatarios, el EMS genera reportes de consumo por unidad con trazabilidad completa, eliminando estimaciones y simplificando el cobro interno.',
  },
];

export function PowerProcess() {
  return (
    <section className="py-20 lg:py-[100px] px-5 sm:px-10 lg:px-[60px] bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-16 lg:mb-20 max-w-[900px]">
          <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
            EMS ENERGY MANAGEMENT SYSTEM
          </span>
          <h2 className="font-heading text-[32px] sm:text-[36px] lg:text-[40px] leading-[1.15] font-extrabold text-grey-900">
            ¿Qué es un EMS y para qué sirve en una empresa chilena?
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500 mt-2">
            Un Energy Management System (EMS) mide, centraliza y analiza el consumo eléctrico en tiempo real, permitiendo detectar ineficiencias, generar reportes de trazabilidad y gestionar la distribución interna del gasto entre distintas unidades o sedes.
          </p>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500">
            El EMS de Globe Power conecta medidores inteligentes con una plataforma centralizada multi-usuario: ideal para empresas multi-sede, propietarios de edificios con arrendatarios y organizaciones con compromisos de reporte de eficiencia.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6 lg:gap-10">
          {/* Connector line — desktop only */}
          <div className="hidden sm:block absolute top-[40px] left-0 right-0 h-[2px] bg-grey-200 z-0" />

          {STEPS.map((s) => (
            <div key={s.num} className="relative z-10 flex flex-col items-center gap-4 text-center">
              <div
                className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: s.color }}
              >
                <span className="font-heading text-[28px] sm:text-[32px] font-extrabold text-white">
                  {s.num}
                </span>
              </div>
              <h3 className="font-heading text-[16px] sm:text-[17px] lg:text-[18px] leading-[1.3] font-bold text-grey-900">
                {s.title}
              </h3>
              <p className="font-body text-[13px] sm:text-[14px] leading-[20px] text-grey-500">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
