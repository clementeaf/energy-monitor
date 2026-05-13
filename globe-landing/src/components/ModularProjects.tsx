import { useState, useCallback, useEffect, useRef } from 'react';
import destacado1 from '../assets/modular/destacado1.jpg';
import destacado2 from '../assets/modular/destacado2.jpg';
import destacado3 from '../assets/modular/destacado3.jpg';

const PROJECTS = [
  {
    image: destacado1,
    alt: 'Alianza Francesa',
    category: 'Educación',
    subtitle: 'Viña del Mar',
    title: 'Alianza Francesa',
    description: 'Proyecto de Sala de Motricidad de Prebásica para la Corporación Educacional Francesa de Valparaíso, desarrollado bajo modalidad EPC y sistema "llave en mano" de infraestructura modular educacional.',
    videoId: undefined as string | undefined,
    cta: undefined as string | undefined,
  },
  {
    image: destacado2,
    alt: 'Municipalidad de Las Condes',
    category: 'Edificación',
    subtitle: 'Sistema Modular de Seguridad Plaza Caracas',
    title: 'Municipalidad de Las Condes',
    description: 'Proyecto modular de seguridad para la Municipalidad de Las Condes, incorporando monitoreo urbano, CCTV, telecomunicaciones y tecnología especializada para gestión municipal.',
    videoId: undefined as string | undefined,
    cta: undefined as string | undefined,
  },
  {
    image: destacado3,
    alt: 'EDF Laberintos',
    category: 'Minería',
    subtitle: 'Construcción y Operación de Campamento',
    title: 'EDF Laberintos',
    description: 'Proyecto de campamento modular para EDF Laberintos, contemplando infraestructura para alojamiento, oficinas y áreas operativas, además de la habilitación y gestión integral del campamento para faenas en terreno.',
    videoId: 's-cjIj1QZLg',
    cta: 'Conoce más',
  },
];

function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-[90vw] max-w-[900px] aspect-video">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-grey-300 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <iframe
          className="w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&start=9`}
          title="Video proyecto"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function ModularProjects() {
  const [current, setCurrent] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const goTo = useCallback((idx: number) => {
    setCurrent((idx + PROJECTS.length) % PROJECTS.length);
  }, []);

  const card = (p: typeof PROJECTS[number]) => (
    <div className="relative w-full h-[420px] sm:h-[480px] rounded overflow-hidden">
      <img src={p.image} alt={p.alt} className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <span className="self-start font-body text-[13px] leading-[20px] font-medium text-white bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          {p.category}
        </span>
        <div className="flex flex-col gap-2">
          <span className="font-body text-[12px] leading-[18px] text-white/70">
            {p.subtitle}
          </span>
          <h3 className="font-heading text-[22px] sm:text-[26px] leading-[1.2] font-extrabold text-white">
            {p.title}
          </h3>
          <p className="font-body text-[13px] sm:text-[14px] leading-[20px] text-white/80">
            {p.description}
          </p>
          {p.cta && p.videoId && (
            <button
              type="button"
              onClick={() => setVideoId(p.videoId!)}
              className="inline-flex items-center gap-3 self-end mt-2 rounded-full border border-white px-5 py-2.5 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-white/10 transition-colors"
            >
              {p.cta}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center gap-6">
        <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
          Proyectos destacados
        </span>
        <h2 className="font-heading text-h3 lg:text-h2 text-grey-900 max-w-[800px]">
          Infraestructura modular en operación
        </h2>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid max-w-[1200px] mx-auto grid-cols-3 gap-4 mt-16 lg:mt-[80px]">
        {PROJECTS.map((p, i) => (
          <div key={i}>{card(p)}</div>
        ))}
      </div>

      {/* Mobile: carousel */}
      <div className="sm:hidden mt-10">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {PROJECTS.map((p, i) => (
              <div key={i} className="w-full shrink-0 px-1">
                {card(p)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6">
          <button type="button" onClick={() => goTo(current - 1)} aria-label="Anterior" className="text-grey-900">
            <svg className="w-[38px] h-5" fill="none" viewBox="0 0 38 20" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 1L1 10m0 0l9 9M1 10h36" />
            </svg>
          </button>
          <button type="button" onClick={() => goTo(current + 1)} aria-label="Siguiente" className="text-grey-900">
            <svg className="w-[38px] h-5" fill="none" viewBox="0 0 38 20" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M28 1l9 9m0 0l-9 9M37 10H1" />
            </svg>
          </button>
        </div>
      </div>
      {videoId && <VideoModal videoId={videoId} onClose={() => setVideoId(null)} />}
    </section>
  );
}
