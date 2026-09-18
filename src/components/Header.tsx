import { KeyRound, Sparkles, BookOpen, HelpCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt') => void;
  onOpenInstructions?: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenInstructions }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-lg border border-stone-800 dark:border-stone-700 shadow-xs">
              <span className="font-['Amiri',serif]">ع</span>
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                التشفير العربي
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:hidden">
            {/* Mobile Dark Mode Toggle */}
            <button
              type="button"
              id="btn-toggle-dark-mode-mobile"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-700 dark:text-stone-300" />}
            </button>

            {onOpenInstructions && (
              <button
                type="button"
                onClick={onOpenInstructions}
                className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="التعليمات ودليل الاستخدام"
              >
                <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs and Quick Help */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              id="tab-encrypt"
              type="button"
              onClick={() => setActiveTab('encrypt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'encrypt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>التشفير</span>
            </button>

            <button
              id="tab-decrypt"
              type="button"
              onClick={() => setActiveTab('decrypt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'decrypt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>فك التشفير</span>
            </button>

            <button
              id="tab-table"
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>جدول الطبقات</span>
            </button>
          </div>

          {/* Desktop Dark Mode Toggle Button (Icon-only) */}
          <button
            type="button"
            id="btn-toggle-dark-mode"
            onClick={toggleTheme}
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-white dark:bg-stone-800/90 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            )}
          </button>

          {/* Instructions Button (Icon-only) */}
          {onOpenInstructions && (
            <button
              type="button"
              id="btn-instructions"
              onClick={onOpenInstructions}
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl text-stone-600 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs"
              title="دليل الاستخدام"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

