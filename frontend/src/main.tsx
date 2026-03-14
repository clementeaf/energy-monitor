// TODO: restore auth wrappers when re-enabling login
// import './auth/captureGoogleHash'
// import { MsalProvider } from '@azure/msal-react'
// import { msalInstance } from './auth/msalInstance'
// import { validateEnv } from './validateEnv'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

// validateEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
