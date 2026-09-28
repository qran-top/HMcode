import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'dos';

export type DosPalette = 
  | 'norton-blue'      // Classic 1995 Norton Commander Navy & Cyan
  | 'green-phosphor'  // IBM 5151 / Matrix Green CRT
  | 'amber-crt'       // Amber Monochrome Gold
  | 'dos-black'       // C:\> Black Command Prompt & White/Yellow
  | 'wordstar-teal';  // Borland / WordStar Deep Teal & Cyan

export interface DosPaletteInfo {
  id: DosPalette;
  name: string;
  nameEn: string;
  description: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
}

export const DOS_PALETTES: DosPaletteInfo[] = [
  {
    id: 'norton-blue',
    name: 'أزرق نورتون كوماندر',
    nameEn: 'Norton Commander Blue',
    description: 'النمط الكلاسيكي الأصلي لعام 1995: خلفية كحلية، إطارات سيان، ونصوص صفراء فاقعة.',
    bgHex: '#000080',
    textHex: '#ffff55',
    borderHex: '#55ffff',
  },
  {
    id: 'green-phosphor',
    name: 'شاشة الفوسفور الأخضر',
    nameEn: 'Green Phosphor (IBM 5151)',
    description: 'شاشة الحواسيب القديمة الخضراء: سواد حالك وتوهج فوسفوري أخضر مريح للعين.',
    bgHex: '#041208',
    textHex: '#33ff33',
    borderHex: '#33ff33',
  },
  {
    id: 'amber-crt',
    name: 'الفوسفور الكهرماني الذهبي',
    nameEn: 'Amber Monochrome CRT',
    description: 'شاشة الكهرمان البرتقالي الكلاسيكية: إضاءة برتقالية ذهبية دافئة.',
    bgHex: '#140a00',
    textHex: '#ffaa00',
    borderHex: '#ff8800',
  },
  {
    id: 'dos-black',
    name: 'موجه أوامر الدوس الأسود',
    nameEn: 'Pure DOS Prompt Black',
    description: 'شاشة موجه الأوامر C:\\> التقليدية: خلفية سوداء حالكة ونصوص ناصعة البياض وصفراء.',
    bgHex: '#000000',
    textHex: '#ffffff',
    borderHex: '#aaaaaa',
  },
  {
    id: 'wordstar-teal',
    name: 'الأخضر المائي بورلاند',
    nameEn: 'Borland / WordStar Teal',
    description: 'بيئة تطوير بورلاند ووردستار: خلفية كحلية مائية داكنة وخطوط تركوازية.',
    bgHex: '#00252e',
    textHex: '#55ffff',
    borderHex: '#00e5ff',
  },
];

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
  dosPalette: DosPalette;
  setDosPalette: (palette: DosPalette) => void;
  cycleDosPalette: () => void;
  activeHint: string;
  setManualHint: (hint: string) => void;
  playDosBeep: (frequency?: number, durationMs?: number, type?: OscillatorType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_DOS_HINT = 'C:\\QURAN\\GEMATRIA> النظام جاهز للعمل | [F1: مساعدة] [F8: تغيير لون الدوس] [F9: تبديل الثيم]';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 1. Theme state: Permanently DOS!
  const [theme, setThemeState] = useState<Theme>('dos');

  // 2. DOS CRT Scanlines state
  const [dosScanlines, setDosScanlinesState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-dos-scanlines');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default scanlines enabled in DOS mode
  });

  // 3. DOS Sound Effects state
  const [dosSound, setDosSoundState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-dos-sound');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default retro sound enabled
  });

  // 4. DOS Palette State (F8 Switcher)
  const [dosPalette, setDosPaletteState] = useState<DosPalette>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-dos-palette') as DosPalette | null;
      if (saved && DOS_PALETTES.some((p) => p.id === saved)) return saved;
    }
    return 'norton-blue';
  });

  // 5. Global Real-Time Hint System (Top/Status Hint Display)
  const [activeHint, setActiveHint] = useState<string>(DEFAULT_DOS_HINT);

  const isDark = true;
  const isDos = true;

  const setDosScanlines = (enabled: boolean) => {
    setDosScanlinesState(enabled);
    localStorage.setItem('app-dos-scanlines', String(enabled));
  };

  const setDosSound = (enabled: boolean) => {
    setDosSoundState(enabled);
    localStorage.setItem('app-dos-sound', String(enabled));
  };

  const setDosPalette = (palette: DosPalette) => {
    setDosPaletteState(palette);
    localStorage.setItem('app-dos-palette', palette);
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

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
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

  // Cycle through DOS Palettes: Norton Blue -> Green Phosphor -> Amber CRT -> Pure Black -> WordStar Teal
  const cycleDosPalette = useCallback(() => {
    setDosPaletteState((prev) => {
      const currentIndex = DOS_PALETTES.findIndex((p) => p.id === prev);
      const nextIndex = (currentIndex + 1) % DOS_PALETTES.length;
      const nextPalette = DOS_PALETTES[nextIndex].id;
      localStorage.setItem('app-dos-palette', nextPalette);
      playDosBeep(750 + nextIndex * 120, 40);
      setActiveHint(`[باليتة الألوان F8]: تم التبديل إلى «${DOS_PALETTES[nextIndex].name}» (${DOS_PALETTES[nextIndex].nameEn})`);
      return nextPalette;
    });
  }, [playDosBeep]);

  // Set Manual Hint
  const setManualHint = useCallback((hint: string) => {
    setActiveHint(hint || DEFAULT_DOS_HINT);
  }, []);

  // Sync DOM classes, attributes and theme variables
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dos') {
      root.classList.add('dark', 'theme-dos');
      if (body) body.classList.add('dark', 'theme-dos');
      root.setAttribute('data-theme', 'dos');
      root.setAttribute('data-dos-palette', dosPalette);
      root.style.colorScheme = 'dark';
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('theme-dos');
      root.removeAttribute('data-dos-palette');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('theme-dos');
      }
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark', 'theme-dos');
      root.removeAttribute('data-dos-palette');
      if (body) {
        body.classList.remove('dark');
        body.classList.remove('theme-dos');
      }
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('app-theme', theme);
  }, [theme, dosPalette]);

  // Global Mouseover & Focusin Event Listener for Real-Time Hint Detection
  useEffect(() => {
    if (!isDos) return;

    let resetTimer: NodeJS.Timeout | null = null;

    const extractHintFromElement = (el: HTMLElement | null): string | null => {
      let current: HTMLElement | null = el;
      let depth = 0;
      while (current && current !== document.body && depth < 6) {
        // 1. data-dos-hint attribute (highest priority)
        const dosHint = current.getAttribute('data-dos-hint');
        if (dosHint && dosHint.trim()) return dosHint.trim();

        // 2. data-dos-title (suppressed title)
        const dosTitle = current.getAttribute('data-dos-title');
        if (dosTitle && dosTitle.trim()) return dosTitle.trim();

        // 3. title attribute
        const titleHint = current.getAttribute('title');
        if (titleHint && titleHint.trim()) return titleHint.trim();

        // 4. aria-label attribute
        const ariaHint = current.getAttribute('aria-label');
        if (ariaHint && ariaHint.trim()) return ariaHint.trim();

        current = current.parentElement;
        depth++;
      }
      return null;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      // Suppress native browser tooltips by moving 'title' to 'data-dos-title'
      let current: HTMLElement | null = target;
      while (current && current !== document.body) {
        if (current.hasAttribute('title')) {
          const t = current.getAttribute('title');
          if (t) {
            current.setAttribute('data-dos-title', t);
            current.removeAttribute('title');
          }
        }
        current = current.parentElement;
      }

      const hint = extractHintFromElement(target);
      if (hint) {
        if (resetTimer) clearTimeout(resetTimer);
        setActiveHint(`[مساعدة]: ${hint}`);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      const hint = extractHintFromElement(related);
      if (!hint) {
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          setActiveHint(DEFAULT_DOS_HINT);
        }, 120);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      const hint = extractHintFromElement(target);
      if (hint) {
        setActiveHint(`[مساعدة]: ${hint}`);
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });
    document.addEventListener('focusin', handleFocusIn, { passive: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('focusin', handleFocusIn);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isDos]);

  // Global F8 / F9 / F1 Key handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F8: Cycle DOS Color Palettes
      if (e.key === 'F8') {
        e.preventDefault();
        cycleDosPalette();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cycleDosPalette]);

  // Cycles through all 3 modes: dos -> dark -> light -> dos
  const cycleTheme = () => {
    setThemeState((prev) => {
      let next: Theme;
      if (prev === 'dos') next = 'light';
      else if (prev === 'light') next = 'dark';
      else next = 'dos';
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
        dosPalette,
        setDosPalette,
        cycleDosPalette,
        activeHint,
        setManualHint,
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
