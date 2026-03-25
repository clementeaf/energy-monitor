import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-expect-error — font package has no type declarations
import '@fontsource-variable/inter';
import './index.css';
import { msalReady } from './auth/msalInstance';
import { App } from './app/App';

msalReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
