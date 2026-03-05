import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { msalInstance } from './auth/msalInstance'
import { googleClientId } from './auth/googleConfig'
import { enableMockInterceptor } from './mocks/mockInterceptor'
import './index.css'
import App from './app/App'

enableMockInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </MsalProvider>
  </StrictMode>,
)
