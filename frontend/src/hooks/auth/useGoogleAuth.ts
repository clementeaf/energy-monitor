import { useAuthStore } from '../../store/useAuthStore';

export function useGoogleAuth() {
  const { clearUser, setError } = useAuthStore();

  function onGoogleSuccess(credential: string) {
    sessionStorage.setItem('access_token', credential);
  }

  function onGoogleError() {
    setError('Error al iniciar sesión con Google');
  }

  function logout() {
    clearUser();
  }

  return { onGoogleSuccess, onGoogleError, logout };
}
