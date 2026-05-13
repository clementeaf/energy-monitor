import { useState, useRef, useEffect } from 'react';
import contactImg from '../assets/modular/contact.jpg';

const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío',
  'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

const PROJECT_TYPES = ['Minería', 'Educación', 'Edificación'];

function RegionSelect() {
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
        className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] outline-none focus:border-grey-500 transition-colors bg-white flex items-center justify-between text-left"
      >
        <span className={selected ? 'text-grey-900' : 'text-grey-400'}>
          {selected || 'Metropolitana'}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-grey-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-grey-300 bg-white shadow-lg max-h-[240px] overflow-y-auto">
          {REGIONES.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => { setSelected(r); setOpen(false); }}
                className={`flex w-full px-4 py-2.5 text-left font-body text-[16px] transition-colors hover:bg-grey-100 ${
                  selected === r ? 'font-medium text-grey-900' : 'text-grey-700'
                }`}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="region" value={selected} />
    </div>
  );
}

function ProjectTypeSelect() {
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
        className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] outline-none focus:border-grey-500 transition-colors bg-white flex items-center justify-between text-left"
      >
        <span className={selected ? 'text-grey-900' : 'text-grey-400'}>
          {selected || 'Tipo de proyecto'}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-grey-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-grey-300 bg-white shadow-lg">
          {PROJECT_TYPES.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => { setSelected(t); setOpen(false); }}
                className={`flex w-full px-4 py-2.5 text-left font-body text-[16px] transition-colors hover:bg-grey-100 ${
                  selected === t ? 'font-medium text-grey-900' : 'text-grey-700'
                }`}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="project_type" value={selected} />
    </div>
  );
}

export function ModularContact() {
  return (
    <section id="contacto" className="min-h-[600px] lg:h-[1129px] bg-[#F9F9F9] flex flex-col lg:flex-row">
      {/* Left — text */}
      <div className="flex flex-col justify-center items-center px-5 sm:px-10 lg:px-[72px] w-full lg:flex-1 py-16 lg:py-0">
        <div className="flex flex-col gap-6 w-full max-w-[760px]">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Conversemos
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Cuéntanos sobre tu proyecto
          </h2>
          <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
            Completa la información y nuestro equipo te contactará para evaluar una solución modular adaptada a tus necesidades.
          </p>

          <div className="flex flex-col gap-2 mt-4">
            <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
              Nombre completo
            </label>
            <input
              type="text"
              placeholder="Juan Pérez"
              className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Teléfono
              </label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Rut
              </label>
              <input
                type="text"
                placeholder="18.482.493-4"
                className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="juan.perez@empresa.cl"
                className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Empresa
              </label>
              <input
                type="text"
                placeholder="Constructora Andes Ltda."
                className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Región del proyecto
              </label>
              <RegionSelect />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
                Tipo de proyecto
              </label>
              <ProjectTypeSelect />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-body text-[14px] leading-[20px] font-medium text-grey-700">
              Motivo
            </label>
            <textarea
              placeholder="Cuéntanos brevemente sobre tu proyecto (tipo de infraestructura, plazos, requerimientos)"
              rows={4}
              className="w-full rounded-lg border border-grey-300 px-4 py-3 font-body text-[16px] leading-[24px] text-grey-900 placeholder:text-grey-400 outline-none focus:border-grey-500 transition-colors bg-white resize-none"
            />
          </div>

          <p className="font-body text-[12px] leading-[18px] text-grey-500">
            Autorizo el tratamiento de mis datos personales con la finalidad de prestación de servicio con fines estadísticos, de marketing, comunicar ofertas y promociones y con el objeto de entregar información y/o beneficios de Grupo Globe. Este contacto podrá ser telefónico, mensaje de texto, correo electrónico o WhatsApp. Los referidos datos podrán en casos concretos ser comunicados a terceros, para cumplir con las finalidades recién mencionadas.
          </p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-grey-400 text-grey-900 focus:ring-grey-500 shrink-0"
            />
            <span className="font-body text-[13px] leading-[20px] text-grey-700">
              Acepto <a href="#" className="underline hover:text-grey-900">términos y condiciones de uso</a>
            </span>
          </label>

          <button
            type="button"
            className="inline-flex items-center gap-3 rounded-[100px] border border-grey-800 px-5 py-2.5 font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:bg-grey-100 transition-colors self-center lg:self-end"
          >
            Enviar
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right — image */}
      <div className="hidden lg:block w-[480px] shrink-0 h-full overflow-hidden ml-auto">
        <img
          src={contactImg}
          alt="Contacto Globe Modular"
          className="size-full object-cover object-left"
        />
      </div>
    </section>
  );
}
