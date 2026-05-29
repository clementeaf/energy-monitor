import { useState, useRef, useEffect } from 'react';
import contactImg from '../assets/power/contacto-cut.png';

const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío',
  'Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

const TIPOS_PROYECTO = [
  'Mantenimiento eléctrico', 'Climatización', 'EMS', 'Subdistribución',
  'Cliente libre', 'Calidad de energía', 'Eficiencia energética',
  'Automatización y monitoreo', 'Proyectos eléctricos', 'Continuidad operacional',
];

const INPUT_CLS =
  'w-full min-h-[44px] rounded-lg border border-grey-200 bg-white p-3 font-body text-[15px] leading-[20px] text-grey-700 placeholder-grey-400 outline-none focus:border-grey-400 transition-colors';

function CustomSelect({ label, placeholder, options }: { label: string; placeholder: string; options: string[] }) {
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
    <div className="flex flex-col gap-2">
      <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${INPUT_CLS} flex items-center justify-between text-left`}
        >
          <span className={selected ? 'text-grey-700' : 'text-grey-400'}>
            {selected || placeholder}
          </span>
          <svg
            className={`h-5 w-5 shrink-0 text-grey-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[200px] overflow-y-auto rounded-lg border border-grey-200 bg-white shadow-lg">
            {options.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => { setSelected(s); setOpen(false); }}
                  className={`flex w-full px-4 py-2.5 text-left text-[15px] transition-colors hover:bg-grey-100 ${
                    selected === s ? 'font-medium text-grey-900' : 'text-grey-700'
                  }`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PowerContact() {
  return (
    <section id="contacto" className="bg-white">
      <div className="flex flex-col lg:flex-row">
        {/* Left: form */}
        <div className="lg:w-[60%] px-5 sm:px-10 lg:px-16 py-16 lg:py-20">
          <div className="max-w-[700px]">
            {/* Header */}
            <div className="flex flex-col gap-2 mb-8">
              <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
                CONTÁCTANOS
              </span>
              <h2 className="font-heading text-[32px] sm:text-[36px] leading-[1.15] font-extrabold text-grey-900">
                Cotiza tu proyecto
              </h2>
              <p className="font-body text-[15px] leading-[24px] text-grey-500 mt-1">
                Junto a nuestro equipo experto te asesoramos en tu próximo proyecto.
              </p>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-5">
              {/* Nombre completo */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Nombre completo</label>
                <input type="text" placeholder="Juan Pérez" className={INPUT_CLS} />
              </div>

              {/* Teléfono + Rut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Teléfono</label>
                  <input type="tel" placeholder="+56 9 1234 5678" className={INPUT_CLS} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Rut</label>
                  <input type="text" placeholder="18.482.493-4" className={INPUT_CLS} />
                </div>
              </div>

              {/* Correo + Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Correo electrónico</label>
                  <input type="email" placeholder="juan.perez@empresa.cl" className={INPUT_CLS} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Empresa</label>
                  <input type="text" placeholder="Constructora Andes Ltda." className={INPUT_CLS} />
                </div>
              </div>

              {/* Región + Tipo proyecto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CustomSelect label="Región del proyecto" placeholder="Metropolitana" options={REGIONES} />
                <CustomSelect label="Tipo de proyecto" placeholder="Selecciona el tipo de proyecto" options={TIPOS_PROYECTO} />
              </div>

              {/* Motivo */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[14px] leading-[18px] font-normal text-grey-500">Motivo</label>
                <textarea
                  placeholder="Cuéntanos brevemente sobre tu proyecto (tipo de infraestructura, plazos, requerimientos)"
                  className={`${INPUT_CLS} h-[120px] resize-none`}
                />
              </div>

              {/* Legal text */}
              <p className="font-body text-[11px] leading-[16px] text-grey-400">
                Autorizo el tratamiento de mis datos personales con la finalidad de prestación de servicio con fines estadísticos, de marketing, comunicar ofertas y promociones y con el objeto de entregar información y/o beneficios de Grupo Globe. Este contacto podrá ser telefónico, mensaje de texto, correo electrónico o WhatsApp. Los referidos datos podrán en casos concretos ser comunicados a terceros, para cumplir con las finalidades recién mencionadas.
              </p>

              {/* Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-grey-300" />
                <span className="font-body text-[13px] leading-[18px] text-grey-600 underline">
                  Acepto términos y condiciones de uso
                </span>
              </label>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-3 rounded-full border border-grey-900 px-6 py-3 font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:bg-grey-100 transition-colors cursor-pointer"
                >
                  Enviar
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: image — fixed height, no stretch, flush right */}
        <div
          className="hidden lg:block lg:w-[40%] lg:min-h-[950px]"
          style={{
            backgroundImage: `url(${contactImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>
    </section>
  );
}
