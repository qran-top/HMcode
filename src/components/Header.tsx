import React from 'react';
import { Moon, Sun, Type, Search, Sparkles, Calculator, Layers, BookMarked, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';
import { useNotebook } from '../context/NotebookContext';

export type HeaderTabType = 'search' | 'matcher' | 'gematria' | 'table' | 'info';

interface HeaderProps {
  activeTab: HeaderTabType;
  setActiveTab: (tab: HeaderTabType) => void;
  onOpenInstructions?: () => void;
  onGoHome?: () => void;
}

export function Header({ activeTab, setActiveTab, onGoHome }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { fontSize, label: fontLabel, cycleFontSize } = useFontSize();
  const { openDrawer, entries, savedSystems } = useNotebook();

  const totalSavedCount = (entries?.length || 0) + (savedSystems?.length || 0);

  const handleLogoClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveTab('search');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems: { id: HeaderTabType; label: string; icon: React.ElementType }[] = [
    { id: 'search', label: 'البحث الموحد', icon: Search },
    { id: 'matcher', label: 'مطابق السلاسل', icon: Sparkles },
    { id: 'gematria', label: 'محرك الجُمَّل', icon: Calculator },
    { id: 'table', label: 'جدول الطبقات', icon: Layers },
  ];

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Brand with 1-word title */}
        <button
          type="button"
          id="header-title-home-btn"
          onClick={handleLogoClick}
          className="flex items-center gap-2 group cursor-pointer text-right hover:opacity-90 transition-all active:scale-98 border-0 bg-transparent p-0 m-0 focus:outline-none shrink-0"
          title="العودة إلى الواجهة الرئيسية"
          aria-label="التشفير العربي - الرئيسية"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-base border border-stone-800 dark:border-stone-700 shadow-xs shrink-0 group-hover:scale-105 group-hover:border-amber-500/50 group-hover:bg-stone-950 dark:group-hover:bg-stone-700 transition-all">
            <span>ع</span>
          </div>
          <h1 id="app-title" className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            التشفير
          </h1>
        </button>

        {/* Desktop Primary Tabs (Hidden on mobile to eliminate any horizontal overflow) */}
        <nav
          className="hidden sm:flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700"
          aria-label="تبويبات سطح المكتب"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`desktop-tab-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs border border-stone-200/80 dark:border-stone-700 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Global Action Icons (Notebook, Font Size, Dark Mode) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Notebook Quick Trigger */}
          <button
            type="button"
            id="btn-header-notebook"
            onClick={() => openDrawer('entries')}
            className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0 relative"
            title="فتح المفكرة المحفوظة"
            aria-label="فتح المفكرة المحفوظة"
          >
            <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            {totalSavedCount > 0 && (
              <span className="absolute -top-1 -right-1 font-mono text-[9px] font-bold px-1 py-0.2 rounded-full bg-amber-600 text-white min-w-[15px] text-center leading-tight shadow-xs">
                {totalSavedCount}
              </span>
            )}
          </button>

          {/* Font Size Adjust Button */}
          <button
            type="button"
            id="btn-toggle-font-size"
            onClick={cycleFontSize}
            className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
            title={`تغيير حجم الخط: ${fontLabel}`}
            aria-label={`تغيير حجم الخط: ${fontLabel}`}
          >
            <Type className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            <span className="text-[10px] font-mono font-bold px-0.5 rounded text-stone-800 dark:text-stone-200">
              {fontSize === 'sm' ? 'A-' : fontSize === 'md' ? 'A' : fontSize === 'lg' ? 'A+' : 'A++'}
            </span>
          </button>

          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            id="btn-toggle-dark-mode"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            )}
          </button>

          {/* Info & Legal Page Button (رمز تعجب صغير يشير لصفحة الفوتر والمعلومات) */}
          <button
            type="button"
            id="btn-header-info"
            onClick={() => setActiveTab('info')}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center ${
              activeTab === 'info'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700'
            }`}
            title="دليل الاستخدام، سياسات الخصوصية، والبيانات القانونية"
            aria-label="دليل الاستخدام والسياسات القانونية"
          >
            <AlertCircle className={`w-4 h-4 ${activeTab === 'info' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
