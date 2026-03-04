import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../store/useAuthStore';
import { parseGoogleCredential } from '../../auth/googleAuth';

export function useGoogleAuth() {
  const { setUser, clearUser, setError } = useAuthStore();

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        // Fetch user info using the access token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        setUser({
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          role: 'OPERATOR', // Default — resolved from backend later
          provider: 'google',
          avatar: userInfo.picture,
          siteIds: ['*'],
        });
      } catch {
        setError('Error al obtener datos del usuario de Google');
      }
    },
    onError: () => {
      setError('Error al iniciar sesión con Google');
    },
  });

  function login() {
    googleLogin();
  }

  function logout() {
    clearUser();
  }

  return { login, logout };
}
