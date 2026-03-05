// Capture Google id_token from the URL hash BEFORE any other module runs.
// This module MUST be imported before msalInstance.ts because MSAL's
// PublicClientApplication constructor may read/consume the hash fragment.

const hashParams = new URLSearchParams(globalThis.location.hash.slice(1));
const googleIdToken = hashParams.get('id_token');

if (googleIdToken) {
  sessionStorage.setItem('access_token', googleIdToken);
  sessionStorage.setItem('google_pending_login', '1');
  history.replaceState(null, '', globalThis.location.pathname);
}
