import React from 'react';
import { useTheme, DOS_PALETTES } from '../context/ThemeContext';
import { useNotebook } from '../context/NotebookContext';
import { AppTabType } from './MobileBottomNav';
import { Palette, HelpCircle } from 'lucide-react';

interface DosBottomBarProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  onOpenHelp: () => void;
  onRefresh?: () => void;
}

export function DosBottomBar({
  activeTab,
  setActiveTab,
  onOpenHelp,
  onRefresh,
}: DosBottomBarProps) {
  const {
    isDos,
    cycleTheme,
    playDosBeep,
    dosSound,
    setDosSound,
    dosScanlines,
    setDosScanlines,
    dosPalette,
    cycleDosPalette,
    activeHint,
  } = useTheme();
  const { openDrawer } = useNotebook();

  if (!isDos) return null;

  const currentPalette = DOS_PALETTES.find((p) => p.id === dosPalette) || DOS_PALETTES[0];

  const handleAction = (num: number, action: () => void) => {
    playDosBeep(700 + num * 40, 30);
    action();
  };

  const fKeys = [
    { num: 1, key: 'F1', label: 'مساعدة', action: () => onOpenHelp() },
    {
      num: 2,
      key: 'F2',
      label: 'حفظ',
      action: () => {
        const saveBtn = document.querySelector<HTMLButtonElement>(
          '#btn-save-analysis, [data-action="save"], button:has(.lucide-bookmark), button:has(.lucide-save)'
        );
        if (saveBtn) saveBtn.click();
        else openDrawer('entries');
      },
    },
    {
      num: 3,
      key: 'F3',
      label: 'جُمّل',
      active: activeTab === 'gematria',
      action: () => setActiveTab('gematria'),
    },
    {
      num: 4,
      key: 'F4',
      label: 'أوامر',
      active: activeTab === 'search',
      action: () => setActiveTab('search'),
    },
    {
      num: 5,
      key: 'F5',
      label: 'تحديث',
      action: () => {
        if (onRefresh) onRefresh();
      },
    },
    {
      num: 6,
      key: 'F6',
      label: 'المفكرة',
      action: () => openDrawer('entries'),
    },
    {
      num: 7,
      key: 'F7',
      label: 'إعدادات',
      active: activeTab === 'settings',
      action: () => setActiveTab('settings'),
    },
    {
      num: 8,
      key: 'F8',
      label: 'ألوان الدوس',
      action: () => cycleDosPalette(),
    },
    {
      num: 9,
      key: 'F9',
      label: 'تبديل الثيم',
      action: () => cycleTheme(),
    },
    {
      num: 10,
      key: 'ESC',
      label: 'رئيسية',
      action: () => {
        setActiveTab('gematria');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
  ];

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#000000] border-t-2 border-[#55ffff] font-mono select-none text-xs shadow-2xl overflow-hidden"
      dir="rtl"
      aria-label="شريط أوامر وتلميحات نظام دوس"
    >
      {/* 1. Real-Time High-Visibility DOS Hint / Status Line (سطر التلميحات الفوري) */}
      <div className="bg-[#000033] px-2.5 py-1 border-b border-[#000066] flex items-center justify-between gap-2 overflow-hidden text-xs">
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          <span className="bg-[#ffff55] text-black px-1.5 py-0.2 font-black text-[10px] tracking-wide shrink-0">
            [ HINT ]
          </span>
          <span className="text-[#ffff55] font-bold truncate text-[11px] sm:text-xs">
            {activeHint}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 text-[10px] text-[#55ffff]">
          <span className="text-[#aaaaaa]">F8: تبديل ألوان الخلفية</span>
          <span>|</span>
          <span className="text-[#55ff55] font-bold">DOS 6.22</span>
        </div>
      </div>

      {/* 2. Function keys grid F1-F10 */}
      <div className="p-0.5 bg-[#000000]">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-0.5 w-full">
          {fKeys.map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => handleAction(item.num, item.action)}
              className={`flex items-center justify-center border text-[11px] font-bold transition-none cursor-pointer w-full py-0.5 ${
                item.active
                  ? 'bg-[#ffff55] text-[#000000] border-[#ffffff]'
                  : 'bg-[#0000aa] text-[#ffffff] hover:bg-[#00aaaa] hover:text-black border-[#555555]'
              }`}
              title={`اضغط مفتاح ${item.key} على لوحة المفاتيح`}
            >
              <span className="bg-[#000000] text-[#55ffff] px-1 py-0.2 border-l border-[#555555] font-mono font-black text-[10px]">
                {item.key}
              </span>
              <span className="px-1 tracking-tight truncate text-center">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 3. Status Controls & Active Palette Indicator */}
        <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-[#aaaaaa] border-t border-[#333333] mt-0.5">
          <div className="flex items-center gap-3">
            {/* Quick Palette Switcher Button */}
            <button
              type="button"
              onClick={() => cycleDosPalette()}
              className="text-[#ffff55] hover:underline flex items-center gap-1 font-bold cursor-pointer"
              title="اضغط للتبديل بين ألوان خلفيات الدوس (أزرق نورتون، فوسفور أخضر، كهرمان ذهبي، أسود، تركواز)"
            >
              <Palette className="w-3 h-3 text-[#55ffff]" />
              <span>[لون الدوس F8: {currentPalette.name}]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDosSound(!dosSound);
                playDosBeep(880, 25);
              }}
              className="hover:text-[#ffff55] cursor-pointer"
              title="تبديل مؤثرات الصوت لمكبر DOS"
            >
              [صوت:{dosSound ? 'ON' : 'OFF'}]
            </button>

            <button
              type="button"
              onClick={() => {
                setDosScanlines(!dosScanlines);
                playDosBeep(980, 25);
              }}
              className="hover:text-[#ffff55] cursor-pointer"
              title="تبديل خطوط المسح CRT"
            >
              [CRT:{dosScanlines ? 'ON' : 'OFF'}]
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#55ffff] hidden md:inline">
              C:\QURAN\GEMATRIA.EXE
            </span>
            <span className="text-[#55ff55] font-bold">
              MS-DOS 6.22
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
