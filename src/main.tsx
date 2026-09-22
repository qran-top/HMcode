import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CipherLayersProvider } from './context/CipherLayersContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotebookProvider } from './context/NotebookContext';
import { GematriaProvider } from './context/GematriaContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CipherLayersProvider>
        <GematriaProvider>
          <NotebookProvider>
            <App />
          </NotebookProvider>
        </GematriaProvider>
      </CipherLayersProvider>
    </ThemeProvider>
  </StrictMode>,
);


