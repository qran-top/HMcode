import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type ArabicFontFamily = 'tajawal' | 'amiri' | 'cairo' | 'dos_arabic' | 'arial';

export interface ArabicFontInfo {
  id: ArabicFontFamily;
  name: string;
  nameEn: string;
  description: string;
  next: ArabicFontFamily;
  cssFamily: string;
}

export const ARABIC_FONTS: Record<ArabicFontFamily, ArabicFontInfo> = {
  tajawal: {
    id: 'tajawal',
    name: 'تجوال',
    nameEn: 'Tajawal',
    description: 'خط عربي حديث فائق الوضوح والتناسق',
    next: 'amiri',
    cssFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  amiri: {
    id: 'amiri',
    name: 'أميري',
    nameEn: 'Amiri',
    description: 'خط المصحف الشريف العثماني التراثي الأصيل',
    next: 'cairo',
    cssFamily: "'Amiri', 'Amiri Quran', serif",
  },
  cairo: {
    id: 'cairo',
    name: 'كايرو',
    nameEn: 'Cairo',
    description: 'خط هندسي عريض كوفي الطابع واضح المعالم',
    next: 'dos_arabic',
    cssFamily: "'Cairo', sans-serif",
  },
  dos_arabic: {
    id: 'dos_arabic',
    name: 'دوس 95 العربي',
    nameEn: 'MS-DOS Arabic 1995',
    description: 'خط نظام دوس العربي الكلاسيكي الأصلي لعام 1995 (VGA Monospace)',
    next: 'arial',
    cssFamily: "'Courier New', Courier, Consolas, Monaco, 'Simplified Arabic Fixed', monospace",
  },
  arial: {
    id: 'arial',
    name: 'إريال',
    nameEn: 'Arial',
    description: 'خط إريال القياسي الواضح والشائع في كافة الأنظمة',
    next: 'tajawal',
    cssFamily: "Arial, 'Segoe UI', Tahoma, sans-serif",
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
    return 'tajawal';
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
    setFontFamilyState((prev) => ARABIC_FONTS[prev]?.next || 'tajawal');
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
        fontFamilyInfo: ARABIC_FONTS[fontFamily] || ARABIC_FONTS.tajawal,
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
