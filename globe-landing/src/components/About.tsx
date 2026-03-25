export function About() {
  return (
    <section id="nosotros" className="py-24 sm:py-32 px-5 sm:px-10 lg:px-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <p className="section-label">Quiénes Somos</p>
          <h2 className="section-title">
            Convertimos un gasto fijo en un activo estratégico
          </h2>
          <p className="mt-5 text-sm sm:text-base text-text-body leading-relaxed max-w-2xl mx-auto font-light">
            Cuando se mide, gestiona y optimiza correctamente, la energía deja de ser un costo ciego.
            Globe Power integra subdistribución, eficiencia energética, software y mantenimiento eléctrico
            bajo un solo responsable, transformando el gasto operativo en eficiencia, sostenibilidad y rentabilidad.
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-gp-200 card-hover bg-white">
            <p className="text-sm font-semibold text-text-muted">Antes</p>
            <p className="mt-1 text-lg font-semibold text-gp-800">Gasto ciego</p>
            <p className="mt-3 text-sm text-text-body leading-relaxed font-light">
              Facturación por metro cuadrado, sin medición real por operador, costos ocultos y mantenimiento reactivo.
            </p>
          </div>
          <div className="p-6 rounded-lg border-2 border-gp-400/30 bg-gp-50 card-hover">
            <p className="text-sm font-semibold text-gp-500">Después</p>
            <p className="mt-1 text-lg font-semibold text-gp-800">Activo estratégico</p>
            <p className="mt-3 text-sm text-text-body leading-relaxed font-light">
              Medición real por operador, facturación exacta, mantenimiento predictivo y nueva línea de ingresos recuperados.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a href="#ecosistema" className="btn-primary">
            Conoce el Ecosistema
          </a>
        </div>
      </div>
    </section>
  );
}
