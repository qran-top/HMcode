import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotebook } from '../context/NotebookContext';
import { AppTabType } from './MobileBottomNav';

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
  const { isDos, cycleTheme, playDosBeep, dosSound, setDosSound, dosScanlines, setDosScanlines } =
    useTheme();
  const { openDrawer } = useNotebook();

  if (!isDos) return null;

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
      label: 'معلومات',
      active: activeTab === 'info',
      action: () => setActiveTab('info'),
    },
    {
      num: 9,
      key: 'F9',
      label: 'ثيم',
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
      aria-label="شريط أزرار دوس السفلية F1-F10"
    >
      {/* Function keys grid - strictly zero horizontal scroll */}
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

        {/* Status Indicators in DOS Bar */}
        <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-[#aaaaaa] border-t border-[#333333] mt-0.5">
          <div className="flex items-center gap-3">
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
