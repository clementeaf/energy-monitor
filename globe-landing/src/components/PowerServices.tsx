import { useState } from 'react';
import img1 from '../assets/power/services/img1.jpg';
import img2 from '../assets/power/services/img2.jpg';
import img3 from '../assets/power/services/img3.png';
import img4 from '../assets/power/services/img4.jpg';
import img5 from '../assets/power/services/img5.jpg';
import img6 from '../assets/power/services/img6.jpg';
import img7 from '../assets/power/services/img7.jpg';
import img8 from '../assets/power/services/img8.jpg';
import img9 from '../assets/power/services/img9.jpg';
import img10 from '../assets/power/services/img10.jpg';

const SERVICES = [
  { title: 'Mantenimiento eléctrico', image: img1 },
  { title: 'Climatización', image: img2 },
  { title: 'EMS — Energy Management System', image: img3 },
  { title: 'Subdistribución eléctrica', image: img4 },
  { title: 'Cliente libre', image: img5 },
  { title: 'Calidad de energía', image: img6 },
  { title: 'Eficiencia energética', image: img7 },
  { title: 'Automatización y monitoreo', image: img8 },
  { title: 'Proyectos eléctricos', image: img9 },
  { title: 'Continuidad operacional', image: img10 },
];

export function PowerServices() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 lg:py-[100px] px-5 sm:px-10 lg:px-[60px] bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Header — centered */}
        <div className="flex flex-col items-center text-center gap-4 mb-16 lg:mb-20 max-w-[900px] mx-auto">
          <span className="font-body text-[13px] leading-[20px] font-medium text-grey-500 uppercase tracking-[2px]">
            SERVICIOS
          </span>
          <h2 className="font-heading text-[32px] sm:text-[36px] lg:text-[40px] leading-[1.15] font-extrabold text-grey-900">
            Servicios especializados en energía e infraestructura eléctrica para empresas en Chile
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[26px] text-grey-500">
            Cada servicio de Globe Power resuelve un problema específico: mantener equipos operativos, reducir costos de suministro y obtener visibilidad total del consumo eléctrico.
          </p>
        </div>

        {/* Menu + Content */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* Left menu */}
          <div className="flex flex-col lg:w-[280px] shrink-0">
            {SERVICES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex items-center gap-3 text-left py-3 border-b border-grey-200 transition-colors ${
                  i === active ? 'font-bold text-grey-900' : 'font-normal text-grey-500 hover:text-grey-700'
                }`}
              >
                {i === active && (
                  <svg className="w-5 h-5 shrink-0 text-grey-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18M14 5l7 7-7 7" />
                  </svg>
                )}
                <span className="font-body text-[14px] sm:text-[15px] leading-[22px]">
                  {s.title}
                </span>
                {i === active && (
                  <div className="absolute bottom-0 left-0 w-1/3 h-[2px] bg-grey-900" />
                )}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1">
            <h3 className="font-heading text-[24px] sm:text-[28px] lg:text-[32px] leading-[1.2] font-bold text-grey-900 mb-6">
              {SERVICES[active].title}
            </h3>
            <img
              src={SERVICES[active].image}
              alt={SERVICES[active].title}
              className="w-full rounded-lg object-cover max-h-[450px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
