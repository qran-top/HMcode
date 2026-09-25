import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CipherLayersProvider } from './context/CipherLayersContext';
import { ThemeProvider } from './context/ThemeContext';
import { FontSizeProvider } from './context/FontSizeContext';
import { NotebookProvider } from './context/NotebookContext';
import { GematriaProvider } from './context/GematriaContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FontSizeProvider>
        <CipherLayersProvider>
          <GematriaProvider>
            <NotebookProvider>
              <App />
            </NotebookProvider>
          </GematriaProvider>
        </CipherLayersProvider>
      </FontSizeProvider>
    </ThemeProvider>
  </StrictMode>,
);


