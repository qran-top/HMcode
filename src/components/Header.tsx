import { BookOpen, Moon, Sun, ArrowLeftRight, Calculator, Sparkles, Type } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt' | 'dual' | 'settings' | 'gematria' | 'matcher';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt' | 'dual' | 'settings' | 'gematria' | 'matcher') => void;
  onOpenInstructions?: () => void;
  onGoHome?: () => void;
}

export function Header({ activeTab, setActiveTab, onGoHome }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { fontSize, label: fontLabel, cycleFontSize } = useFontSize();

  const handleLogoClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveTab('dual');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
        >
          <div className="w-8 h-8 rounded-xl bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-base border border-stone-800 dark:border-stone-700 shadow-xs shrink-0 group-hover:scale-105 group-hover:border-amber-500/50 group-hover:bg-stone-950 dark:group-hover:bg-stone-700 transition-all">
            <span className="font-['Amiri',serif]">ع</span>
          </div>
          <h1 id="app-title" className="text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            التشفير
          </h1>
        </button>

        {/* Primary Tabs (Search, Gematria, Matcher, Table) + Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 overflow-x-auto max-w-[calc(100vw-180px)] sm:max-w-none">
            <button
              id="tab-dual"
              type="button"
              onClick={() => setActiveTab('dual')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'dual' || activeTab === 'encrypt' || activeTab === 'decrypt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs border border-stone-200/80 dark:border-stone-700 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>البحث</span>
            </button>

            <button
              id="tab-gematria"
              type="button"
              onClick={() => setActiveTab('gematria')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'gematria'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs border border-stone-200/80 dark:border-stone-700 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>حساب الجُمَّل</span>
            </button>

            <button
              id="tab-matcher"
              type="button"
              onClick={() => setActiveTab('matcher')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'matcher'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs border border-stone-200/80 dark:border-stone-700 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>مطابق السلاسل</span>
            </button>

            <button
              id="tab-table"
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs border border-stone-200/80 dark:border-stone-700 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>جدول</span>
            </button>
          </div>

          {/* Font Size Adjust Button (Placed next to Dark Mode Toggle) */}
          <button
            type="button"
            id="btn-toggle-font-size"
            onClick={cycleFontSize}
            className="p-1.5 sm:p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
            title={`تغيير حجم الخط: ${fontLabel} (انقر للتبديل)`}
            aria-label={`تغيير حجم الخط: ${fontLabel}`}
          >
            <Type className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            <span className="text-3xs font-mono font-medium px-1 py-0.2 rounded bg-stone-200/70 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200">
              {fontSize === 'sm' ? 'A-' : fontSize === 'md' ? 'A' : fontSize === 'lg' ? 'A+' : 'A++'}
            </span>
          </button>

          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            id="btn-toggle-dark-mode"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
