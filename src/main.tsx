import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CipherLayersProvider } from './context/CipherLayersContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CipherLayersProvider>
      <App />
    </CipherLayersProvider>
  </StrictMode>,
);
