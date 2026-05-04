import imgMantenimiento from '../assets/services/mantenimiento.jpg';
import imgEmergencia from '../assets/services/emergencia.jpg';
import imgNormalizacion from '../assets/services/normalizacion.jpg';

function TextCard({ title, description, bg, textColor = 'text-grey-900' }: { title: string; description: string; bg: string; textColor?: string }) {
  return (
    <div className={`w-full lg:w-[394px] min-h-[280px] lg:h-[351px] shrink-0 rounded ${bg} flex flex-col justify-between p-8`}>
      <div className="flex flex-col gap-4">
        <h3 className={`font-heading text-h4 font-extrabold ${textColor}`}>{title}</h3>
        <p className={`font-body text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] ${textColor === 'text-white' ? 'text-white/80' : 'text-grey-700'}`}>
          {description}
        </p>
      </div>
      <div className="flex justify-end">
        <button className={`inline-flex items-center gap-3.5 rounded-full border ${textColor === 'text-white' ? 'border-white' : 'border-grey-800'} px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium ${textColor} hover:opacity-70 transition-opacity`}>
          Ver más
          <svg className="w-5 h-3" fill="none" viewBox="0 0 20 12" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 1l5 5m0 0l-5 5M19 6H1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ImageCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full lg:flex-1 h-[250px] lg:h-[351px] rounded overflow-hidden">
      <img src={src} alt={alt} className="size-full object-cover" />
    </div>
  );
}

export function ServicesCards() {
  return (
    <section className="py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-[128px]">
        {/* Header */}
        <div className="flex flex-col gap-[8px] text-center">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Servicios
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Soluciones para una operación continua y eficiente
          </h2>
        </div>

        {/* Cards grid */}
        <div className="flex flex-col gap-4">
          {/* Row 1: text card | image */}
          <div className="flex flex-col lg:flex-row gap-4">
            <TextCard
              bg="bg-orange-50"
              title="Mantenimiento"
              description="Garantizamos el funcionamiento óptimo y seguro de sus equipos, minimizando fallas con un enfoque multimarca (reparaciones planificadas)."
            />
            <ImageCard src={imgMantenimiento} alt="Mantenimiento" />
          </div>

          {/* Row 2: image | text card */}
          <div className="flex flex-col lg:flex-row gap-4">
            <ImageCard src={imgEmergencia} alt="Emergencia" />
            <TextCard
              bg="bg-orange-500"
              textColor="text-white"
              title="Atención a emergencias y averías 24/7"
              description="Un equipo de respuesta rápido, listo para actuar en cualquier momento asegurando la continuidad operacional."
            />
          </div>

          {/* Row 3: text card | image */}
          <div className="flex flex-col lg:flex-row gap-4">
            <TextCard
              bg="bg-orange-300"
              title="Modernización y Remodelación"
              description="Estamos preparados para actuar en cualquier momento y lugar. Contamos con un Servicio de Emergencia 24/7."
            />
            <ImageCard src={imgNormalizacion} alt="Normalización" />
          </div>

          {/* Row 4: image | text card */}
          <div className="flex flex-col lg:flex-row gap-4">
            <ImageCard src={imgNormalizacion} alt="Normalización" />
            <TextCard
              bg="bg-orange-200"
              title="Normalización"
              description="Aseguramos que sus equipos obtengan la certificación requerida. Evitando multas y garantizando el cumplimiento normativo."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
