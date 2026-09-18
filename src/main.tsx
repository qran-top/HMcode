import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CipherLayersProvider } from './context/CipherLayersContext';
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CipherLayersProvider>
        <App />
      </CipherLayersProvider>
    </ThemeProvider>
  </StrictMode>,
);

