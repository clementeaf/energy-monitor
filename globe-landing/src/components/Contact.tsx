const SERVICES = [
  'Gestión energética',
  'Transporte vertical',
  'Infraestructura modular',
  'Mantenimiento eléctrico',
  'Consultoría técnica',
];

export function Contact() {
  return (
    <section id="contacto" className="bg-brand py-20 sm:py-28 px-5 sm:px-10 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Left column: text */}
        <div className="flex flex-col justify-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Contáctanos
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white leading-tight">
            Conversemos
          </h2>

          <p className="mt-6 text-[15px] text-white/70 leading-[1.8] max-w-md">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>

        {/* Right column: form */}
        <form className="space-y-5">
          {/* Nombre — full width */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Nombre</label>
            <input
              type="text"
              placeholder="Juan Pérez"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
            />
          </div>

          {/* Correo + Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                placeholder="juan.perez@empresa.cl"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Empresa</label>
              <input
                type="text"
                placeholder="Constructora Andes Ltda."
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
              />
            </div>
          </div>

          {/* Teléfono + Servicio de interés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Teléfono</label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Servicio de interés</label>
              <select
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 outline-none focus:border-white/50 focus:bg-white/15 transition-colors appearance-none"
                defaultValue=""
              >
                <option value="" disabled className="text-grey-900">Selecciona un servicio</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s} className="text-grey-900">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mensaje — textarea */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Mensaje</label>
            <textarea
              rows={4}
              placeholder="Cuéntanos brevemente sobre tu requerimiento o proyecto"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-white px-8 py-3 text-sm font-semibold text-brand hover:bg-white/90 transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
