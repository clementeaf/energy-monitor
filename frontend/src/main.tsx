import './auth/captureGoogleHash';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { msalInstance } from './auth/msalInstance';
import { googleClientId } from './auth/googleConfig';
import { validateEnv } from './validateEnv';
import './index.css';
import App from './app/App';

validateEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
