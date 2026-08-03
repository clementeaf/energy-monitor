import { BrowserCacheLocation, type Configuration } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const redirectUri = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/organizations',
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
