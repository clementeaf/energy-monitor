export function About() {
  return (
    <section id="nosotros" className="py-24 sm:py-32 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
          Quiénes somos
        </span>

        <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          Un partner, toda la operación
        </h2>

        <div className="mt-8 max-w-4xl space-y-6 text-[15px] text-gray-600 leading-[1.8]">
          <p>
            Grupo Globe es un grupo empresarial chileno de origen canadiense, dedicado al desarrollo y operación de
            soluciones integrales de energía, mantenimiento de sistemas críticos e infraestructuras. A través de nuestras
            empresas participamos en minería, retail, hotelería, hospitales, oficinas, residenciales, industria y otras;
            combinando ingeniería, tecnología y ejecución propia en cada proyecto.
          </p>
          <p>
            Operamos con herramientas desarrolladas internamente para monitorear, analizar y gestionar la continuidad de los
            activos de nuestros clientes. Nuestro crecimiento ha sido coherente: no expandimos hacia industrias donde no
            podemos aportar profundidad técnica; crecemos donde identificamos una necesidad real y podemos resolverla
            con estándar.
          </p>
          <p>
            Ese estándar —de origen canadiense— es el que asegura calidad, trazabilidad y confiabilidad en cada servicio, y el
            que hoy nos permite operar en Chile, Perú y Colombia.
          </p>
        </div>

        <a
          href="#industrias"
          className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
        >
          Conocer más sobre Grupo Globe
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
