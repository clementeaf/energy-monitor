import { BrowserCacheLocation, type Configuration } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;
const redirectUri = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin;

/**
 * Cache MSAL en sessionStorage (por pestaña). El JWT de la app va en cookie httpOnly
 * (`/api/auth`); este cache solo cubre el flujo OAuth con Microsoft.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: '/login',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
