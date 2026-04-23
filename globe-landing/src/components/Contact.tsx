import { useState, useRef, useEffect } from 'react';

const SERVICES = ['Globe Power', 'Globe Services', 'Globe Modular'];

function ServiceSelect() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-left text-sm outline-none transition-colors focus:border-white/50 focus:bg-white/15"
      >
        <span className={selected ? 'text-white' : 'text-white/40'}>
          {selected || 'Selecciona un servicio'}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-grey-200 bg-white shadow-lg">
          {SERVICES.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => { setSelected(s); setOpen(false); }}
                className={`flex w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-grey-100 ${
                  selected === s ? 'font-medium text-grey-900' : 'text-grey-700'
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="service" value={selected} />
    </div>
  );
}

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
          Cuéntanos sobre tu proyecto u operación. Te contactamos en un máximo de 24 horas hábiles para evaluar cómo podemos ayudar.           </p>
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
              <ServiceSelect />
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
