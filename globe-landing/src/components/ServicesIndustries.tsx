import { useState, useEffect, useCallback, useRef } from 'react';
import imgOficinas from '../assets/services/oficinas.jpg';
import imgHoteleria from '../assets/services/hoteleria.jpg';
import imgHabitacionales from '../assets/services/habitacionales.jpg';
import imgRetail from '../assets/services/retail.jpg';
import imgEstatal from '../assets/services/estatal.jpg';
import imgClinicas from '../assets/services/clinicas-hospitales.jpg';
import imgTransporte from '../assets/services/transporte-infraestructura.jpg';
import imgIndustrias from '../assets/services/industrias.jpg';
import imgEntretenimiento from '../assets/services/entretenimiento.jpg';
import imgEducativos from '../assets/services/centros-educativos.jpg';

const INDUSTRIES = [
  { label: 'Oficinas', description: 'Sabemos que cada espacio de trabajo debe funcionar sin interrupciones. Nos encargamos de que todo opere como corresponde, para que las personas puedan enfocarse en lo realmente importante: su trabajo.', img: imgOficinas },
  { label: 'Hotelería', description: 'En hotelería, cada detalle importa. Aseguramos que las instalaciones funcionen de manera impecable, para que la experiencia de tus huéspedes sea continua, segura y sin interrupciones.', img: imgHoteleria },
  { label: 'Habitacionales', description: 'Trabajamos para que cada edificio funcione de forma segura y confiable, entregando tranquilidad tanto a administradores como a quienes viven en él.', img: imgHabitacionales },
  { label: 'Retail', description: 'En el retail, cada minuto cuenta. Nos aseguramos de que tus instalaciones estén siempre operativas, para que nada interfiera en la experiencia de tus clientes ni en tus ventas.', img: imgRetail },
  { label: 'Estatal', description: 'Entendemos la importancia de los servicios públicos. Ejecutamos soluciones que garantizan continuidad, seguridad y eficiencia en espacios donde detenerse no es una opción.', img: imgEstatal },
  { label: 'Clínicas y hospitales', description: 'En entornos donde cada segundo importa, aseguramos el funcionamiento continuo de las instalaciones, acompañando la labor de quienes trabajan por el bienestar de las personas.', img: imgClinicas },
  { label: 'Transporte e infraestructura', description: 'Participamos en la operación de infraestructuras clave, asegurando su funcionamiento continuo para que las personas y los procesos sigan en movimiento.', img: imgTransporte },
  { label: 'Industrias', description: 'Sabemos que la operación no puede detenerse. Trabajamos para mantener la continuidad de los procesos productivos, anticipando fallas y respondiendo con rapidez cuando es necesario.', img: imgIndustrias },
  { label: 'Entretenimiento', description: 'En espacios de alto flujo, la experiencia y la seguridad son fundamentales. Nos aseguramos de que todo funcione correctamente para que las personas disfruten con tranquilidad.', img: imgEntretenimiento },
  { label: 'Centros educativos', description: 'Creamos entornos seguros y confiables para estudiantes, docentes y equipos de trabajo, asegurando que todo funcione correctamente día a día.', img: imgEducativos },
];

const DURATION = 6000; // ms per industry

export function ServicesIndustries() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % INDUSTRIES.length);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  const selectIndustry = useCallback((i: number) => {
    setActive(i);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        advance();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, advance]);

  return (
    <section className="bg-grey-50 py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-10 lg:gap-[128px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px] text-center lg:text-left">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Industrias
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Experiencia comprobada en adaptarnos a tus necesidades
          </h2>
        </div>

        {/* Two columns — mobile: active item + vertical list, desktop: side-by-side */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-[80px]">
          {/* Left — industry list */}
          {/* Mobile: accordion */}
          <div className="flex lg:hidden flex-col">
            {INDUSTRIES.map((item, i) => {
              const isActive = i === active;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => selectIndustry(i)}
                    className="flex items-center gap-3 w-full text-left py-4 relative"
                  >
                    {isActive && (
                      <svg className="w-6 h-5 shrink-0" fill="none" viewBox="0 0 38 20" stroke="#1C1C1C" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
                      </svg>
                    )}
                    <span className={isActive
                      ? 'font-heading text-[18px] leading-[26px] font-extrabold text-[#1C1C1C]'
                      : 'font-body text-[16px] leading-[24px] text-grey-500'
                    }>
                      {item.label}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-grey-200">
                      {isActive && (
                        <div className="h-full bg-[#1C1C1C]" style={{ width: `${progress * 100}%` }} />
                      )}
                    </div>
                  </button>

                  {isActive && (
                    <div className="flex flex-col gap-6 py-6">
                      <h3 className="font-heading text-h4 text-grey-900">{item.label}</h3>
                      {item.description && (
                        <p className="font-body text-[16px] leading-[26px] text-grey-700">
                          {item.description}
                        </p>
                      )}
                      <div className="w-full h-[250px] sm:h-[300px] rounded overflow-hidden">
                        <img src={item.img} alt={item.label} className="size-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: vertical list */}
          <div className="hidden lg:flex flex-col lg:w-[400px] shrink-0">
            {INDUSTRIES.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(i)}
                  className="flex items-center gap-3 w-full text-left py-4 relative"
                >
                  <div className={`w-6 shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    <svg className="w-6 h-5" fill="none" viewBox="0 0 38 20" stroke="#1C1C1C" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
                    </svg>
                  </div>
                  <span
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'font-heading text-[22px] leading-[30px] font-extrabold text-[#1C1C1C]'
                        : 'font-body text-[18px] leading-[26px] text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-px">
                    {isActive ? (
                      <div className="w-full h-full" style={{ background: 'linear-gradient(to right, #1C1C1C 30%, #E4E4E4 30%)' }} />
                    ) : (
                      <div className="w-full h-full bg-grey-200" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop: detail panel */}
          <div className="hidden lg:flex flex-1 flex-col gap-6">
            <h3 className="font-heading text-h3 text-grey-900">
              {INDUSTRIES[active].label}
            </h3>
            {INDUSTRIES[active].description && (
              <p className="font-body text-[18px] leading-[30px] text-grey-700">
                {INDUSTRIES[active].description}
              </p>
            )}
            <div className="w-full h-[380px] rounded overflow-hidden">
              <img
                src={INDUSTRIES[active].img}
                alt={INDUSTRIES[active].label}
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
