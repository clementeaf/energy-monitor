import { useState } from 'react';
import val1 from '../assets/values/image1.png';
import val2 from '../assets/values/image2.png';
import val3 from '../assets/values/image3.png';
import val4 from '../assets/values/image4.png';

const VALUES = [
  {
    src: val1,
    label: 'Integridad',
    description: 'Actuamos con transparencia y coherencia en cada decisión. Cumplimos lo que comprometemos, documentamos lo que hacemos y sostenemos estándares que generan confianza de largo plazo con clientes, equipos y partners.',
  },
  {
    src: val2,
    label: 'Cliente en el centro',
    description: 'Entendemos el negocio antes de proponer la solución. Nos involucramos más allá del servicio contratado y actuamos como socios operacionales: el éxito de nuestros clientes es la métrica que usamos para medir el nuestro.',
  },
  {
    src: val3,
    label: 'Excelencia operacional',
    description: 'Ejecutamos con rigor técnico, procesos trazables y mejora continua. La seguridad de las personas y los activos es parte intransable de esta excelencia: protegemos mediante prevención, normativa y estándares internos que no se negocian.',
  },
  {
    src: val4,
    label: 'Impacto positivo',
    description: 'Desarrollamos soluciones que generan valor tangible: eficiencia operacional, ahorro energético, menor huella y mejores condiciones para los usuarios finales de los espacios que operamos.',
  },
];

export function Ecosystem() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section id="valores" className="py-20 sm:py-28 px-5 sm:px-10 lg:px-12 bg-grey-50">
      <div className="max-w-7xl mx-auto">
        {/* Top row: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left column */}
          <div>
            <span className="text-xs font-normal uppercase tracking-[0.2em] text-grey-900">
              Valores
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-grey-900 leading-tight">
              Los principios que sostienen cada operación
            </h2>
          </div>

          {/* Right column */}
          <div className="flex items-end">
            <p className="text-[15px] text-grey-700 leading-[1.8]">
              No son declaraciones. Son los criterios que usamos para tomar decisiones técnicas, operacionales y comerciales todos los días.
            </p>
          </div>
        </div>

        {/* Bottom row: 4 value cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          {VALUES.map((v, i) => (
            <div key={v.label} className="group relative overflow-hidden rounded-md cursor-pointer bg-grey-200">
              <img
                src={v.src}
                alt={v.label}
                className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
              />
              {/* Expanded description overlay */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center text-justify bg-white p-6 transition-opacity duration-300 ${
                  expanded === i ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <h3 className="w-full whitespace-nowrap text-left font-heading text-[clamp(13px,1.6vw,24px)] font-extrabold leading-[1.22] text-[#1C1C1C] mb-3">{v.label}</h3>
                <p className="text-[13px] leading-[1.7] text-grey-700">{v.description}</p>
                <button
                  type="button"
                  onClick={() => setExpanded(null)}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-grey-500 hover:text-grey-900 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
              {/* Hover: "Ver más" button slides in from right */}
              <div
                className={`absolute bottom-4 right-0 translate-x-0 sm:translate-x-full sm:group-hover:translate-x-[-1rem] sm:right-0 right-4 transition-transform duration-500 ease-out ${
                  expanded === i ? 'hidden' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(i)}
                  className="inline-flex items-center gap-2 rounded-full border border-white px-4 py-2 text-[13px] font-medium text-white"
                >
                  Ver más
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
