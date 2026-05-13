import { useState, useEffect, useCallback, useRef } from 'react';

const STEPS = [
  {
    title: 'Ingeniería y diseño (BIM)',
    description: 'Modelamos el proyecto en 3D para anticipar interferencias, optimizar materiales y entregar planos coordinados antes de fabricar.',
  },
  {
    title: 'Fabricación modular industrializada',
    description: 'Producimos en planta bajo control de calidad, con procesos estandarizados que aseguran consistencia y reducen plazos respecto a la obra tradicional.',
  },
  {
    title: 'Transporte y montaje en terreno',
    description: 'Coordinamos la logística y el montaje incluso en faenas remotas, con cuadrilla propias y procedimientos seguros de izaje e instalación.',
  },
  {
    title: 'Obras civiles y urbanización',
    description: 'Ejecutamos fundaciones, accesos, redes y obras complementarias necesarios para integrar el módulo a su entorno operativo.',
  },
  {
    title: 'Gestión de permisos',
    description: 'Acompañamos los trámites técnicos y regulatorios (DOM, SEC, SISS, MINSAL según corresponda) para que la recepción no retrase la puesta en marcha.',
  },
];

const DURATION = 6000;

export function ModularProcess() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % STEPS.length);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  const selectStep = useCallback((i: number) => {
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
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-10 lg:gap-0">
        {/* Label */}
        <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
          Proceso
        </span>

        {/* Two columns */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-[80px] mt-6 lg:mt-10">
          {/* Left — text */}
          <div className="flex flex-col gap-6 lg:w-[536px] shrink-0">
            <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
              Capacidad integral para proyectos complejos
            </h2>
            <p className="font-body text-[16px] sm:text-[18px] leading-[26px] sm:leading-[30px] text-grey-700">
              Operamos bajo modalidad EPC, cubriendo todas las etapas del proyecto, desde la ingeniería hasta la puesta en marcha.
            </p>
          </div>

          {/* Right — process steps with progress bar */}
          <div className="flex flex-col lg:w-[536px]">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => selectStep(i)}
                  className="flex flex-col w-full text-left py-4 relative"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                      <svg className="w-6 h-5" fill="none" viewBox="0 0 38 20" stroke="#1C1C1C" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
                      </svg>
                    </div>
                    <span
                      className={`transition-colors duration-200 ${
                        isActive
                          ? 'font-heading text-[18px] lg:text-[22px] leading-[26px] lg:leading-[30px] font-extrabold text-[#1C1C1C]'
                          : 'font-body text-[16px] lg:text-[18px] leading-[24px] lg:leading-[26px] text-grey-500 hover:text-grey-700'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {isActive && step.description && (
                    <p className="pl-9 mt-2 font-body text-[14px] sm:text-[15px] leading-[22px] text-grey-700">
                      {step.description}
                    </p>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-grey-200">
                    {isActive && (
                      <div className="h-full bg-[#1C1C1C]" style={{ width: `${progress * 100}%` }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
