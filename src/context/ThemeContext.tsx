import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'dos';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isDos: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  setTheme: (theme: Theme) => void;
  dosScanlines: boolean;
  setDosScanlines: (enabled: boolean) => void;
  dosSound: boolean;
  setDosSound: (enabled: boolean) => void;
  playDosBeep: (frequency?: number, durationMs?: number, type?: OscillatorType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-theme') as Theme | null;
      if (saved === 'dark' || saved === 'light' || saved === 'dos') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const [dosScanlines, setDosScanlinesState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-dos-scanlines');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default scanlines enabled in DOS mode for authentic CRT feel
  });

  const [dosSound, setDosSoundState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-dos-sound');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default retro sound enabled
  });

  const isDark = theme === 'dark' || theme === 'dos';
  const isDos = theme === 'dos';

  const setDosScanlines = (enabled: boolean) => {
    setDosScanlinesState(enabled);
    localStorage.setItem('app-dos-scanlines', String(enabled));
  };

  const setDosSound = (enabled: boolean) => {
    setDosSoundState(enabled);
    localStorage.setItem('app-dos-sound', String(enabled));
  };

  // Nostalgic MS-DOS / PC Speaker sound generator via Web Audio API
  const playDosBeep = useCallback((frequency = 880, durationMs = 35, type: OscillatorType = 'square') => {
    if (!dosSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type; // 'square' gives authentic 8-bit IBM PC speaker buzz
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime); // gentle, pleasing volume
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, durationMs + 50);
    } catch {
      // Audio might be blocked by browser autoplay policy before user interaction
    }
  }, [dosSound]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dos') {
      root.classList.add('dark', 'theme-dos');
      if (body) body.classList.add('dark', 'theme-dos');
      root.setAttribute('data-theme', 'dos');
      root.style.colorScheme = 'dark';
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('theme-dos');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('theme-dos');
      }
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark', 'theme-dos');
      if (body) {
        body.classList.remove('dark');
        body.classList.remove('theme-dos');
      }
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // Cycles through all 3 modes: light -> dark -> dos -> light
  const cycleTheme = () => {
    setThemeState((prev) => {
      let next: Theme;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'dos';
      else next = 'light';
      return next;
    });
  };

  const toggleTheme = cycleTheme;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        isDos,
        toggleTheme,
        cycleTheme,
        setTheme,
        dosScanlines,
        setDosScanlines,
        dosSound,
        setDosSound,
        playDosBeep,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

