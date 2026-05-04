import { Link } from 'react-router-dom';

export function Breadcrumb() {
  return (
    <div className="w-full border-b border-grey-200">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-[60px] flex items-center h-[50px]">
        <Link
          to="/"
          className="font-body text-[14px] leading-[18px] text-grey-500 hover:text-grey-700 transition-colors"
        >
          Inicio
        </Link>
        <svg
          className="w-4 h-4 mx-2 text-grey-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-body text-[14px] leading-[18px] text-grey-900 font-medium">
          Globe Services
        </span>
      </div>
    </div>
  );
}
