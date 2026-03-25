import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../auth/msalConfig';

export function useMicrosoftAuth() {
  const { instance } = useMsal();

  const login = useCallback(async (): Promise<string> => {
    const result = await instance.loginPopup(loginRequest);
    return result.idToken;
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutRedirect({ postLogoutRedirectUri: '/login' });
  }, [instance]);

  return { login, logout };
}
