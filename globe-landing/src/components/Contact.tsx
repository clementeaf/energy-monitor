import { useState, useRef, useEffect } from 'react';

const SERVICES = ['Todos', 'Globe Power', 'Globe Services', 'Globe Modular'];

const INPUT_CLS =
  'w-full min-h-[44px] rounded-lg border border-grey-200 bg-white p-3 font-body text-[16px] leading-[20px] text-grey-700 placeholder-grey-400 outline-none focus:border-grey-400 transition-colors';

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
        className={`${INPUT_CLS} flex items-center justify-between text-left`}
      >
        <span className={selected ? 'text-grey-700' : 'text-grey-400'}>
          {selected || 'Selecciona un servicio'}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-grey-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
                className={`flex w-full px-4 py-2.5 text-left text-[16px] transition-colors hover:bg-grey-100 ${
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
    <section id="contacto" className="bg-[#9a2d29] py-[128px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-y-12 lg:gap-x-[80px]">
        {/* Left column: text */}
        <div>
          {/* Label + Title — pb-60 */}
          <div className="flex flex-col gap-2 pb-[60px] text-white">
            <span className="font-body text-[16px] leading-[20px] font-normal">
              CONTÁCTANOS
            </span>
            <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
              Conversemos
            </h2>
          </div>

          <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-50">
            Cuéntanos sobre tu proyecto u operación. Te contactamos en un máximo de 24 horas hábiles para evaluar cómo podemos ayudar.
          </p>
        </div>

        {/* Right column: form — Figma: gap-20, white inputs, labels grey-100 14px */}
        <form className="flex flex-col gap-5">
          {/* Nombre completo — full width */}
          <div className="flex flex-col gap-2">
            <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Nombre completo</label>
            <input type="text" placeholder="Luis Miranda" className={INPUT_CLS} />
          </div>

          {/* Correo + Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Correo electrónico</label>
              <input type="email" placeholder="luism@empresa.cl" className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Empresa</label>
              <input type="text" placeholder="Administradora de edificios Andes SPA" className={INPUT_CLS} />
            </div>
          </div>

          {/* Teléfono + Servicio de interés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Teléfono</label>
              <input type="tel" placeholder="+56 9 1234 5678" className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Servicio de interés</label>
              <ServiceSelect />
            </div>
          </div>

          {/* Mensaje — textarea h-115 */}
          <div className="flex flex-col gap-2">
            <label className="font-body text-[14px] leading-[18px] font-normal text-grey-100">Mensaje</label>
            <textarea
              placeholder="Cuéntanos brevemente sobre tu requerimiento o proyecto"
              className={`${INPUT_CLS} h-[115px] resize-none items-start`}
            />
          </div>

          {/* Submit — Figma: pill outline white, aligned right, pt-40 */}
          <div className="flex justify-end pt-10">
            <button
              type="submit"
              className="inline-flex items-center gap-3.5 rounded-[100px] border border-white px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Enviar
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
