// MUST be first import — captures Google #id_token before MSAL constructor reads the hash
import './auth/captureGoogleHash'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalInstance'
import { validateEnv } from './validateEnv'
import './index.css'
import App from './app/App'

validateEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
)
