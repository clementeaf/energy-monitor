import { useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../../auth/msalConfig';

export function useMicrosoftAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const login = useCallback(async () => {
    if (inProgress !== InteractionStatus.None) return;
    await instance.loginRedirect(loginRequest);
  }, [instance, inProgress]);

  const logout = useCallback(async () => {
    if (inProgress !== InteractionStatus.None) return;
    await instance.logoutRedirect({ postLogoutRedirectUri: '/login' });
  }, [instance, inProgress]);

  const acquireTokenSilently = useCallback(async (): Promise<string | null> => {
    const account = accounts[0] ?? null;
    if (!account) return null;
    try {
      const result = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return result.idToken ?? null;
    } catch {
      return null;
    }
  }, [instance, accounts]);

  return {
    login,
    logout,
    acquireTokenSilently,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
  };
}
