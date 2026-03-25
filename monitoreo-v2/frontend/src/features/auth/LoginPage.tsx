import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/auth/useAuth';

export function LoginPage() {
  const { loginMicrosoft, loginGoogle, error, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Energy Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">Inicia sesion para continuar</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={loginMicrosoft}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continuar con Microsoft
          </button>

          <div className="flex items-center justify-center">
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  loginGoogle(response.credential);
                }
              }}
              onError={() => {
                // Handled by useAuth error state
              }}
              text="continue_with"
              width="352"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
