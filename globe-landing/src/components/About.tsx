export function About() {
  return (
    <section id="nosotros" className="py-20 sm:py-28 px-5 sm:px-8 lg:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Quiénes Somos</p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-navy">
            Convertimos un gasto fijo en un activo estratégico
          </h2>
          <p className="mt-5 text-sm sm:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Cuando se mide, gestiona y optimiza correctamente, la energía deja de ser un costo ciego. Globe Power integra subdistribución, eficiencia energética, software y mantenimiento eléctrico bajo un solo responsable, transformando el gasto operativo en eficiencia, sostenibilidad y rentabilidad.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 gap-6">
          <div className="p-5 rounded-lg border border-gray-100">
            <p className="text-sm font-semibold text-gray-400">Antes</p>
            <p className="mt-1 text-base font-semibold text-navy">Gasto ciego</p>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Facturación por metro cuadrado, sin medición real por operador, costos ocultos y mantenimiento reactivo.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-accent/30 bg-accent/5">
            <p className="text-sm font-semibold text-accent">Después</p>
            <p className="mt-1 text-base font-semibold text-navy">Activo estratégico</p>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Medición real por operador, facturación exacta, mantenimiento predictivo y nueva línea de ingresos recuperados.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <a
            href="#ecosistema"
            className="inline-flex px-6 py-2.5 bg-accent text-white font-medium rounded-md hover:bg-accent-dark transition-colors text-sm"
          >
            Conoce el Ecosistema
          </a>
        </div>
      </div>
    </section>
  );
}
