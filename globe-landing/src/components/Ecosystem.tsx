import { useState } from 'react';
import val1 from '../assets/values/image1.png';
import val2 from '../assets/values/image2.png';
import val3 from '../assets/values/image3.png';
import val4 from '../assets/values/image4.png';

const VALUES = [
  { src: val1, label: 'Integridad', desc: 'Actuamos con transparencia y coherencia en cada decisión. Cumplimos lo que comprometemos, documentamos lo que hacemos y sostenemos estándares que generan confianza de largo plazo con clientes, equipos y partners.' },
  { src: val2, label: 'Cliente en el centro', desc: 'Entendemos el negocio antes de proponer la solución. Nos involucramos más allá del servicio contratado y actuamos como socios operacionales: el éxito de nuestros clientes es la métrica que usamos para medir el nuestro.' },
  { src: val3, label: 'Excelencia operacional', desc: 'Ejecutamos con rigor técnico, procesos trazables y mejora continua. La seguridad de las personas y los activos es parte intransable de esta excelencia.' },
  { src: val4, label: 'Impacto positivo', desc: 'Desarrollamos soluciones que generan valor tangible: eficiencia operacional, ahorro energético, menor huella y mejores condiciones para los usuarios finales de los espacios que operamos.' },
];

/* Figma hover gradient: rojizo */
const HOVER_GRADIENT =
  'linear-gradient(-0.07deg, rgba(91, 25, 27, 0.6) 38.1%, rgba(91, 25, 27, 0) 110.7%), linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%)';

export function Ecosystem() {
  const [pressed, setPressed] = useState<number | null>(null);

  return (
    <section id="valores" className="bg-grey-50">
      {/* Header — Figma: 2-col grid, pt-128 pb-84, max-w-1200 */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 pt-[128px] pb-[84px]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: label + title */}
          <div className="flex flex-col gap-2 pr-0 lg:pr-[80px] text-grey-900">
            <span className="font-body text-[16px] leading-[20px] font-normal">
              VALORES
            </span>
            <h2 className="font-heading text-[36px] leading-[44px] font-extrabold">
              Los principios que sostienen cada operación
            </h2>
          </div>

          {/* Right: description */}
          <div className="flex items-start pt-6 lg:pt-6">
            <p className="font-heading text-[22px] leading-[30px] font-medium text-grey-700 max-w-[600px]">
              No son declaraciones. Son los criterios que usamos para tomar decisiones técnicas, operacionales y comerciales todos los días.
            </p>
          </div>
        </div>
      </div>

      {/* Cards — Figma: full-width, 4 cards, gap-1, h-380, 3 states */}
      <div className="flex gap-1">
        {VALUES.map((v, i) => (
          <div key={v.label} className="group relative flex-1 h-[380px] overflow-hidden rounded-[4px] cursor-pointer">
            {/* Pressed state: white bg, text content, close button */}
            {pressed === i ? (
              <div className="bg-white flex flex-col gap-5 h-full p-6 rounded-[4px]">
                <div className="flex-1 flex flex-col gap-7">
                  <h3 className="font-heading text-[28px] leading-[36px] font-extrabold text-grey-900">
                    {v.label}
                  </h3>
                  <p className="font-body text-[18px] leading-[28px] font-normal text-grey-700">
                    {v.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPressed(null)}
                  className="absolute top-2 right-2 flex items-center justify-center w-12 h-12 rounded-full text-grey-700 hover:bg-grey-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                {/* Background image (baked title+gradient) */}
                <img
                  src={v.src}
                  alt={v.label}
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover: rojizo gradient overlay */}
                <div
                  className="absolute inset-0 rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundImage: HOVER_GRADIENT }}
                />

                {/* Default: arrow icon button — bottom-right */}
                <button
                  type="button"
                  onClick={() => setPressed(i)}
                  className="absolute bottom-6 right-6 z-10 flex items-center justify-center w-12 h-12 rounded-full border border-white text-white opacity-0 group-hover:opacity-0 transition-all duration-300"
                  aria-label={`Ver ${v.label}`}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                  </svg>
                </button>

                {/* Hover: "Ver más" pill button — bottom-right */}
                <button
                  type="button"
                  onClick={() => setPressed(i)}
                  className="absolute bottom-6 right-6 z-10 inline-flex items-center gap-3.5 rounded-[100px] border border-white px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-white/10"
                >
                  Ver más
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
