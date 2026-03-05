import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginWithMicrosoft, logoutMicrosoft, getMicrosoftUser } from '../../auth/microsoftAuth';
import { loginRequest } from '../../auth/msalConfig';
import type { AuthUser } from '../../types/auth';

export function useMicrosoftAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const account = accounts[0] ?? null;

  const user: AuthUser | null = account ? getMicrosoftUser(account) : null;

  async function login() {
    if (inProgress !== InteractionStatus.None) return;
    const result = await loginWithMicrosoft(instance);
    if (result?.idToken) {
      sessionStorage.setItem('access_token', result.idToken);
    }
  }

  async function logout() {
    if (inProgress !== InteractionStatus.None) return;
    await logoutMicrosoft(instance);
  }

  /** Get idToken from MSAL cache (handles redirect flow where login() never ran) */
  async function acquireTokenSilently(): Promise<string | null> {
    if (!account) return null;
    try {
      const result = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      if (result.idToken) {
        sessionStorage.setItem('access_token', result.idToken);
      }
      return result.idToken ?? null;
    } catch {
      return null;
    }
  }

  return {
    login,
    logout,
    acquireTokenSilently,
    user,
    account,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
  };
}
