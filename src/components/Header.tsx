import React from 'react';
import { Moon, Sun, Type, Search, Sparkles, Layers, BookMarked, AlertCircle, Settings, Terminal } from 'lucide-react';
import { useTheme, DOS_PALETTES } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';
import { useNotebook } from '../context/NotebookContext';

export type HeaderTabType = 'gematria' | 'search' | 'settings' | 'info';

interface HeaderProps {
  activeTab: HeaderTabType;
  setActiveTab: (tab: HeaderTabType) => void;
  onOpenInstructions?: () => void;
  onGoHome?: () => void;
}

export function Header({ activeTab, setActiveTab, onGoHome }: HeaderProps) {
  const { theme, isDark, isDos, toggleTheme, dosPalette, cycleDosPalette } = useTheme();
  const { fontSize, label: fontLabel, cycleFontSize } = useFontSize();
  const { openDrawer, entries, savedSystems } = useNotebook();

  const currentPalette = DOS_PALETTES.find((p) => p.id === dosPalette) || DOS_PALETTES[0];

  const totalSavedCount = (entries?.length || 0) + (savedSystems?.length || 0);

  const handleLogoClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveTab('gematria');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems: { id: HeaderTabType; label: string; icon: React.ElementType }[] = [
    { id: 'gematria', label: 'البحث بالجمل', icon: Sparkles },
    { id: 'search', label: 'البحث بالأوامر', icon: Search },
  ];

  if (isDos) {
    return (
      <header
        className="bg-[#000080] border-b-2 border-[#55ffff] font-mono select-none sticky top-0 z-30 shadow-none overflow-hidden"
        dir="rtl"
        aria-label="قوائم نظام دوس MS-DOS"
      >
        {/* DOS Window Title Bar with Status */}
        <div className="bg-[#0000aa] text-[#ffffff] px-2 py-0.5 border-b border-[#55ffff] flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="bg-[#00aaaa] text-black px-1.5 font-black">[■]</span>
            <span className="text-[#ffff55] tracking-wide">
              C:\QURAN\GEMATRIA.EXE - MS-DOS 6.22 [{currentPalette.name}]
            </span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-[#55ffff]">
            <span className="hidden sm:inline">640K BASE RAM OK</span>
          </div>
        </div>

        {/* DOS Menu Bar Row */}
        <div className="px-1 py-0.5 flex items-center justify-between gap-1 flex-wrap bg-[#000080]">
          <nav className="flex items-center gap-1 flex-wrap" aria-label="أوامر وقوائم دوس">
            <button
              type="button"
              onClick={() => setActiveTab('gematria')}
              className={`px-2 py-0.5 text-xs font-bold cursor-pointer transition-none border ${
                activeTab === 'gematria'
                  ? 'bg-[#ffff55] text-black border-[#ffffff]'
                  : 'bg-[#000080] text-white border-transparent hover:bg-[#00aaaa] hover:text-black'
              }`}
            >
              [<span className="text-red-500 font-black">1</span>] البحث بالجُمّل
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`px-2 py-0.5 text-xs font-bold cursor-pointer transition-none border ${
                activeTab === 'search'
                  ? 'bg-[#ffff55] text-black border-[#ffffff]'
                  : 'bg-[#000080] text-white border-transparent hover:bg-[#00aaaa] hover:text-black'
              }`}
            >
              [<span className="text-red-500 font-black">2</span>] البحث بالأوامر
            </button>
            <button
              type="button"
              onClick={() => openDrawer('entries')}
              className="px-2 py-0.5 text-xs font-bold bg-[#000080] text-white border border-transparent hover:bg-[#00aaaa] hover:text-black cursor-pointer transition-none"
            >
              [<span className="text-red-500 font-black">3</span>] المفكرة ({totalSavedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-2 py-0.5 text-xs font-bold cursor-pointer transition-none border ${
                activeTab === 'settings'
                  ? 'bg-[#ffff55] text-black border-[#ffffff]'
                  : 'bg-[#000080] text-white border-transparent hover:bg-[#00aaaa] hover:text-black'
              }`}
            >
              [<span className="text-red-500 font-black">4</span>] الإعدادات
            </button>
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cycleDosPalette}
              className="px-1.5 py-0.5 text-2xs font-bold bg-[#0000aa] text-[#ffff55] hover:bg-[#ffff55] hover:text-black border border-[#ffff55] cursor-pointer"
              title="تبديل ألوان الدوس (F8): أزرق نورتون، فوسفور أخضر، كهرمان ذهبي، أسود، تركواز"
            >
              [F8 لون:{currentPalette.name.split(' ')[0]}]
            </button>
            <button
              type="button"
              onClick={cycleFontSize}
              className="px-1.5 py-0.5 text-2xs font-bold bg-[#0000aa] text-[#55ffff] hover:bg-[#00aaaa] hover:text-black border border-[#55ffff] cursor-pointer"
              title="تغيير مقاس الخط"
            >
              خط:[{fontLabel}]
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-1.5 py-0.5 text-2xs font-bold bg-[#ffff55] text-black border border-white cursor-pointer hover:bg-white"
              title="تبديل الثيم دورياً"
            >
              ثيم:[DOS]
            </button>
          </div>
        </div>
      </header>
    );
  }

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

          {/* Font Size Adjust Button (Enhanced) */}
          <button
            type="button"
            id="btn-toggle-font-size"
            onClick={cycleFontSize}
            className="px-2 py-1.5 rounded-xl text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
            title={`تغيير حجم الخط (الآن: ${fontLabel}) - انقر للتبديل`}
            aria-label={`تغيير حجم الخط: ${fontLabel}`}
          >
            <Type className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
            <span className="text-[11px] font-mono font-bold px-1 py-0.2 rounded bg-stone-200/80 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
              {fontLabel}
            </span>
          </button>

          {/* 3-Way Theme Toggle Button (Light -> Dark -> DOS) */}
          <button
            type="button"
            id="btn-toggle-dark-mode"
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 ${
              isDos
                ? 'bg-[#0000a8] text-[#55ff55] border-2 border-[#55ffff]'
                : isDark
                ? 'bg-stone-800 text-amber-400 border-stone-700 hover:bg-stone-750'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
            }`}
            title={
              theme === 'dos'
                ? 'الثيم الحالي: دوس التسعينات MS-DOS (انقر للتبديل للنهاري)'
                : theme === 'dark'
                ? 'الثيم الحالي: الليلي (انقر للتبديل لدوس التسعينات)'
                : 'الثيم الحالي: النهاري (انقر للتبديل لليلي)'
            }
            aria-label={
              theme === 'dos'
                ? 'ثيم دوس القديم'
                : isDark
                ? 'الوضع الليلي'
                : 'الوضع النهاري'
            }
          >
            {theme === 'dos' ? (
              <div className="flex items-center gap-1">
                <Terminal className="w-4 h-4 text-[#55ff55] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#ffff55]">DOS</span>
              </div>
            ) : isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600" />
            )}
          </button>

          {/* Settings Button (Desktop quick shortcut & mobile accessibility) */}
          <button
            type="button"
            id="btn-header-settings"
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
              activeTab === 'settings'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700'
            }`}
            title="لوحة الإعدادات وتعديل الجداول وقواعد الحساب"
            aria-label="لوحة الإعدادات والجداول"
          >
            <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-stone-600 dark:text-stone-300'}`} />
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
