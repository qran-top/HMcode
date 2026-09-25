import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl';

interface FontSizeContextType {
  fontSize: FontSizeLevel;
  fontSizePercentage: number;
  label: string;
  setFontSize: (size: FontSizeLevel) => void;
  cycleFontSize: () => void;
}

const FONT_SIZE_MAP: Record<FontSizeLevel, { percent: number; label: string; next: FontSizeLevel }> = {
  sm: { percent: 90, label: 'صغير (90%)', next: 'md' },
  md: { percent: 100, label: 'عادي (100%)', next: 'lg' },
  lg: { percent: 110, label: 'كبير (110%)', next: 'xl' },
  xl: { percent: 122, label: 'كبير جداً (122%)', next: 'sm' },
};

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-font-size') as FontSizeLevel | null;
      if (saved && FONT_SIZE_MAP[saved]) return saved;
    }
    return 'md';
  });

  useEffect(() => {
    const root = document.documentElement;
    const config = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.md;
    root.style.fontSize = `${config.percent}%`;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('app-font-size', fontSize);
  }, [fontSize]);

  const cycleFontSize = () => {
    setFontSizeState((prev) => FONT_SIZE_MAP[prev]?.next || 'md');
  };

  const setFontSize = (size: FontSizeLevel) => {
    if (FONT_SIZE_MAP[size]) {
      setFontSizeState(size);
    }
  };

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        fontSizePercentage: FONT_SIZE_MAP[fontSize]?.percent || 100,
        label: FONT_SIZE_MAP[fontSize]?.label || 'عادي',
        setFontSize,
        cycleFontSize,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize(): FontSizeContextType {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
