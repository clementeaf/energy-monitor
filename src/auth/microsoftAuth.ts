import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import type { AuthUser } from '../types/auth';
import { loginRequest } from './msalConfig';

export async function loginWithMicrosoft(instance: IPublicClientApplication) {
  return instance.loginPopup(loginRequest);
}

export async function logoutMicrosoft(instance: IPublicClientApplication) {
  return instance.logoutPopup();
}

export function getMicrosoftUser(account: AccountInfo): AuthUser {
  return {
    id: account.localAccountId,
    email: account.username,
    name: account.name ?? account.username,
    role: 'OPERATOR', // Default role — will be resolved from backend later
    provider: 'microsoft',
    avatar: undefined,
    siteIds: ['*'],
  };
}
