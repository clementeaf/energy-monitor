import { useState } from 'react';

const ITEMS = [
  {
    title: 'Mantenimiento eléctrico',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    title: 'Subdistribución',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    title: 'Software de gestión energética',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    title: 'Eficiencia energética',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
];

export function PowerArchitecture() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-16 lg:py-[128px] px-5 sm:px-10 lg:px-[60px]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-16">
        {/* Left: text */}
        <div className="flex flex-col gap-4 lg:max-w-[45%]">
          <span className="font-body text-[14px] leading-[20px] font-medium text-grey-500 uppercase tracking-wide">
            Arquitectura completa
          </span>
          <h2 className="font-heading text-h3 lg:text-h2 text-grey-900">
            Un ecosistema integral bajo un solo responsable
          </h2>
          <p className="font-body text-[15px] sm:text-[16px] leading-[24px] text-grey-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>

        {/* Right: accordion */}
        <div className="flex flex-col lg:w-[50%]">
          {ITEMS.map((item, i) => (
            <div key={item.title} className="border-b border-grey-200">
              <button
                type="button"
                onClick={() => setActive(active === i ? -1 : i)}
                className="w-full flex items-center gap-3 py-5 text-left"
              >
                <svg
                  className={`w-5 h-5 shrink-0 text-grey-900 transition-transform duration-300 ${active === i ? 'rotate-90' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
                <span className="font-heading text-[16px] sm:text-[18px] leading-[24px] font-bold text-grey-900">
                  {item.title}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  active === i ? 'max-h-[200px] pb-5' : 'max-h-0'
                }`}
              >
                {active === i && (
                  <>
                    <div className="w-12 h-[2px] bg-grey-900 mb-4" />
                    <p className="font-body text-[14px] sm:text-[15px] leading-[22px] text-grey-600 pl-8">
                      {item.description}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
