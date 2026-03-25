import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-expect-error — font package has no type declarations
import '@fontsource-variable/inter';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
