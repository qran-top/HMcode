import { KeyRound, Sparkles, BookOpen, HelpCircle, Moon, Sun, ExternalLink, Settings, ArrowLeftRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt' | 'dual' | 'settings';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt' | 'dual' | 'settings') => void;
  onOpenInstructions?: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenInstructions }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-lg border border-stone-800 dark:border-stone-700 shadow-xs shrink-0">
              <span className="font-['Amiri',serif]">ع</span>
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                التشفير العربي
              </h1>
            </div>

            {/* Platform Cross-Links: Google & Github */}
            <div className="flex items-center gap-1.5 ms-1 sm:ms-2.5">
              <a
                id="header-link-google"
                href="https://hmcode7.ai.studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100/90 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-amber-300/80 dark:border-stone-700 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                title="منصة Google (AI Studio): https://hmcode7.ai.studio/"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>

              <a
                id="header-link-github"
                href="https://qran-top.github.io/HMcode/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 hover:bg-stone-200/90 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                title="منصة GitHub: https://qran-top.github.io/HMcode/"
              >
                <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>Github</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
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
              id="tab-dual"
              type="button"
              onClick={() => setActiveTab('dual')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'dual' || activeTab === 'encrypt' || activeTab === 'decrypt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>المترجم الذكي</span>
            </button>

            <button
              id="tab-table"
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>جدول ومحرر الطبقات</span>
            </button>

            <button
              id="tab-settings"
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>المكتبة والإعدادات</span>
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

