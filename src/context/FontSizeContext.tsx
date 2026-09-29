import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type ArabicFontFamily = 'alyamama' | 'markazi' | 'handjet';

export interface ArabicFontInfo {
  id: ArabicFontFamily;
  name: string;
  nameEn: string;
  description: string;
  next: ArabicFontFamily;
  cssFamily: string;
}

export const ARABIC_FONTS: Record<ArabicFontFamily, ArabicFontInfo> = {
  alyamama: {
    id: 'alyamama',
    name: 'اليمامة',
    nameEn: 'Alyamama',
    description: 'خط نسخي نقي عالي التباين وشديد الوضوح',
    next: 'markazi',
    cssFamily: "'Alyamama', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  markazi: {
    id: 'markazi',
    name: 'مركزي',
    nameEn: 'Markazi',
    description: 'خط مقروء أنيق مستوحى من خطوط النشر والطباعة الكلاسيكية',
    next: 'handjet',
    cssFamily: "'Markazi Text', Georgia, serif",
  },
  handjet: {
    id: 'handjet',
    name: 'هاندجت',
    nameEn: 'Handjet',
    description: 'خط مصفوفي نقطي متناسق مع شاشات دوس وريترو',
    next: 'alyamama',
    cssFamily: "'Handjet', 'Courier New', monospace",
  },
};

interface FontSizeContextType {
  fontSize: FontSizeLevel;
  fontSizePercentage: number;
  label: string;
  setFontSize: (size: FontSizeLevel) => void;
  cycleFontSize: () => void;
  fontFamily: ArabicFontFamily;
  fontFamilyInfo: ArabicFontInfo;
  setFontFamily: (family: ArabicFontFamily) => void;
  cycleFontFamily: () => void;
}

const FONT_SIZE_MAP: Record<FontSizeLevel, { percent: number; label: string; next: FontSizeLevel }> = {
  sm: { percent: 85, label: '85%', next: 'md' },
  md: { percent: 100, label: '100%', next: 'lg' },
  lg: { percent: 115, label: '115%', next: 'xl' },
  xl: { percent: 130, label: '130%', next: '2xl' },
  '2xl': { percent: 150, label: '150%', next: 'sm' },
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

  const [fontFamily, setFontFamilyState] = useState<ArabicFontFamily>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-font-family') as ArabicFontFamily | null;
      if (saved && ARABIC_FONTS[saved]) return saved;
    }
    return 'alyamama';
  });

  useEffect(() => {
    const root = document.documentElement;
    const config = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.md;
    root.style.fontSize = `${config.percent}%`;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('app-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-family', fontFamily);
    localStorage.setItem('app-font-family', fontFamily);
  }, [fontFamily]);

  const cycleFontSize = () => {
    setFontSizeState((prev) => FONT_SIZE_MAP[prev]?.next || 'md');
  };

  const setFontSize = (size: FontSizeLevel) => {
    if (FONT_SIZE_MAP[size]) {
      setFontSizeState(size);
    }
  };

  const cycleFontFamily = () => {
    setFontFamilyState((prev) => ARABIC_FONTS[prev]?.next || 'alyamama');
  };

  const setFontFamily = (family: ArabicFontFamily) => {
    if (ARABIC_FONTS[family]) {
      setFontFamilyState(family);
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
        fontFamily,
        fontFamilyInfo: ARABIC_FONTS[fontFamily] || ARABIC_FONTS.alyamama,
        setFontFamily,
        cycleFontFamily,
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
