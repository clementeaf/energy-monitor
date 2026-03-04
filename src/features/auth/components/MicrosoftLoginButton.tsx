import { useAuth } from '../../../hooks/auth/useAuth';

export function MicrosoftLoginButton() {
  const { login, isLoading } = useAuth();

  return (
    <button
      onClick={login}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 border border-[#e0e0e0] px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
    >
      {/* Microsoft icon (simplified SVG) */}
      <svg width="16" height="16" viewBox="0 0 21 21">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      {isLoading ? 'Conectando...' : 'Continuar con Microsoft'}
    </button>
  );
}
