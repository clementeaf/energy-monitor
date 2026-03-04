import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginWithMicrosoft, logoutMicrosoft, getMicrosoftUser } from '../../auth/microsoftAuth';
import type { AuthUser } from '../../types/auth';

export function useMicrosoftAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const account = accounts[0] ?? null;

  const user: AuthUser | null = account ? getMicrosoftUser(account) : null;

  async function login() {
    if (inProgress !== InteractionStatus.None) return;
    await loginWithMicrosoft(instance);
  }

  async function logout() {
    if (inProgress !== InteractionStatus.None) return;
    await logoutMicrosoft(instance);
  }

  return {
    login,
    logout,
    user,
    account,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
  };
}
