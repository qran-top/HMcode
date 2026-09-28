import React from 'react';
import { useTheme, DOS_PALETTES } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';
import { useNotebook } from '../context/NotebookContext';
import { useHint } from '../context/HintContext';

export type HeaderTabType = 'gematria' | 'search' | 'settings' | 'info';

interface HeaderProps {
  activeTab: HeaderTabType;
  setActiveTab: (tab: HeaderTabType) => void;
  onOpenInstructions?: () => void;
  onGoHome?: () => void;
  onOpenHelp?: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenHelp }: HeaderProps) {
  const {
    dosPalette,
    cycleDosPalette,
    dosSound,
    setDosSound,
    dosScanlines,
    setDosScanlines,
    playDosBeep,
  } = useTheme();

  const { label: fontLabel, cycleFontSize } = useFontSize();
  const { openDrawer, entries, savedSystems } = useNotebook();
  const { isHintEnabled, toggleHint, hintText, setHintText, clearHint } = useHint();

  const currentPalette = DOS_PALETTES.find((p) => p.id === dosPalette) || DOS_PALETTES[0];
  const totalSavedCount = (entries?.length || 0) + (savedSystems?.length || 0);

  const handleTabClick = (tab: HeaderTabType) => {
    setActiveTab(tab);
    playDosBeep(880, 25);
  };

  const toggleSound = () => {
    const next = !dosSound;
    setDosSound(next);
    if (next) {
      playDosBeep(980, 40);
    }
  };

  const toggleScanlines = () => {
    setDosScanlines(!dosScanlines);
    playDosBeep(650, 30);
  };

  const handleToggleHint = () => {
    toggleHint();
    playDosBeep(900, 30);
  };

  return (
    <header
      style={{ backgroundColor: 'var(--dos-bg)', borderColor: 'var(--dos-border)' }}
      className="border-b-2 font-mono select-none sticky top-0 z-30 shadow-md w-full"
      dir="rtl"
      aria-label="شريط أوامر ونظام دوس MS-DOS"
    >
      {/* 1. Top DOS Window Title Bar with Quick Action Utilities */}
      <div
        style={{ backgroundColor: 'var(--dos-header)', borderColor: 'var(--dos-border)' }}
        className="text-[#ffffff] px-2 py-1 border-b flex items-center justify-between gap-1 flex-wrap text-xs font-bold"
      >
        {/* System Title */}
        <div
          className="flex items-center gap-1.5 shrink-0 cursor-default"
          onMouseEnter={() => setHintText('نظام التشفير وحساب الجُمّل القرآني الشامل (MS-DOS 6.22 Retro Edition)')}
          onMouseLeave={clearHint}
        >
          <span className="bg-[#00aaaa] text-black px-1 font-black text-2xs shadow-xs">[■]</span>
          <span className="text-[#ffff55] tracking-wide font-black text-xs sm:text-sm">
            C:\QURAN\CIPHER.EXE
          </span>
          <span className="text-[#55ffff] text-3xs hidden md:inline border-r border-[#55ffff]/50 pr-1.5 mr-1">
            MS-DOS 6.22 [UTF-8 ARABIC]
          </span>
        </div>

        {/* Top Control Buttons (Palette, Sound, CRT, Hint, Font, Notebook, Help) */}
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          {/* F8: Color Palette Switcher */}
          <button
            type="button"
            onClick={cycleDosPalette}
            onMouseEnter={() => setHintText(`تبديل باليتة ألوان الدوس (F8): النمط الحالي [${currentPalette.name}]`)}
            onMouseLeave={clearHint}
            style={{ backgroundColor: 'var(--dos-panel)', borderColor: 'var(--dos-accent)', color: 'var(--dos-accent)' }}
            className="px-1.5 py-0.5 text-2xs font-bold hover:bg-[#ffff55] hover:text-black border cursor-pointer active:translate-y-0.5 transition-none"
            title="تبديل باليتة ألوان الدوس (F8)"
          >
            [F8 لون:{currentPalette.name.split(' ')[0]}]
          </button>

          {/* F9: Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            onMouseEnter={() => setHintText(`مؤثرات بيب نظام دوس الصوتية التفاعلية: ${dosSound ? 'مفعلة' : 'مكتومة'}`)}
            onMouseLeave={clearHint}
            className={`px-1.5 py-0.5 text-2xs font-bold border cursor-pointer active:translate-y-0.5 transition-none ${
              dosSound
                ? 'bg-[#003300] text-[#55ff55] border-[#55ff55]'
                : 'bg-[#330000] text-[#ff8888] border-[#ff5555]'
            }`}
            title="تشغيل/كتم صوت بيب الدوس التفاعلي (F9)"
          >
            [F9 صوت:{dosSound ? 'ON 🔊' : 'MUTE 🔇'}]
          </button>

          {/* CRT Scanline Toggle */}
          <button
            type="button"
            onClick={toggleScanlines}
            onMouseEnter={() => setHintText(`تأثير خطوط مسح أنبوب الأشعة المهبطية CRT: ${dosScanlines ? 'مفعل' : 'معطل'}`)}
            onMouseLeave={clearHint}
            style={{ borderColor: 'var(--dos-border)' }}
            className={`px-1.5 py-0.5 text-2xs font-bold border cursor-pointer active:translate-y-0.5 transition-none hidden sm:inline-block ${
              dosScanlines
                ? 'bg-[#002233] text-[#55ffff]'
                : 'bg-[#111111] text-[#888888]'
            }`}
            title="تفعيل/تعطيل خطوط شاشة أنبوب الأشعة المهبطية CRT"
          >
            [CRT:{dosScanlines ? 'ON' : 'OFF'}]
          </button>

          {/* HINT: Show / Hide Toggle Button */}
          <button
            type="button"
            onClick={handleToggleHint}
            onMouseEnter={() => setHintText('زر إظهار أو إخفاء شريط التلميحات الفورية DOS HINT BAR')}
            onMouseLeave={clearHint}
            className={`px-1.5 py-0.5 text-2xs font-bold border cursor-pointer active:translate-y-0.5 transition-none ${
              isHintEnabled
                ? 'bg-[#002b20] text-[#55ff55] border-[#55ff55]'
                : 'bg-[#222222] text-[#aaaaaa] border-[#666666]'
            }`}
            title="إظهار / إخفاء شريط التلميحات وشرح العناصر"
          >
            [💡تلميح:{isHintEnabled ? 'ON' : 'OFF'}]
          </button>

          {/* Font Size Cycle */}
          <button
            type="button"
            onClick={() => {
              cycleFontSize();
              playDosBeep(700, 20);
            }}
            onMouseEnter={() => setHintText(`تغيير مقاس الخط العام: المقاس الحالي [${fontLabel}]`)}
            onMouseLeave={clearHint}
            style={{ backgroundColor: 'var(--dos-panel)', borderColor: 'var(--dos-border)', color: 'var(--dos-border)' }}
            className="px-1.5 py-0.5 text-2xs font-bold hover:bg-[#00aaaa] hover:text-black border cursor-pointer active:translate-y-0.5 transition-none"
            title="تغيير مقاس الخط"
          >
            خط:[{fontLabel}]
          </button>

          {/* Notebook Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              openDrawer('entries');
              playDosBeep(850, 30);
            }}
            onMouseEnter={() => setHintText(`فتح المفكرة: تحتوي على ${totalSavedCount} عنصر محفوظ`)}
            onMouseLeave={clearHint}
            style={{ backgroundColor: 'var(--dos-panel)', borderColor: 'var(--dos-text)', color: 'var(--dos-text)' }}
            className="px-1.5 py-0.5 text-2xs font-bold hover:bg-[#ffff55] hover:text-black border cursor-pointer active:translate-y-0.5 transition-none"
            title="فتح مفكرة التشفير والجُمّل المحفوظة"
          >
            [المفكرة:{totalSavedCount}]
          </button>

          {/* Help Trigger */}
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              onMouseEnter={() => setHintText('عرض دليل اختصارات لوحة المفاتيح F1-F10 ونظام DOS')}
              onMouseLeave={clearHint}
              className="px-1.5 py-0.5 text-2xs font-bold bg-[#ffff55] text-black hover:bg-white border border-white cursor-pointer active:translate-y-0.5 transition-none font-black"
              title="دليل اختصارات لوحة المفاتيح ونظام DOS (F1)"
            >
              [F1 مساعدة]
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary Tabs Menu Bar (F1-F4 Navigation Ribbon) */}
      <div
        style={{ backgroundColor: 'var(--dos-bg)', borderColor: 'var(--dos-header)' }}
        className="px-1.5 py-1 flex items-center justify-between gap-1 flex-wrap border-b"
      >
        <nav className="flex items-center gap-1 flex-wrap w-full sm:w-auto" aria-label="أقسام نظام DOS">
          <button
            type="button"
            onClick={() => handleTabClick('gematria')}
            onMouseEnter={() => setHintText('مطابق السلاسل القرآنية المدمج: مسح المصحف كاملاً وحساب الجُمّل المشرقي والمغربي وتوليد الفواتح')}
            onMouseLeave={clearHint}
            style={
              activeTab === 'gematria'
                ? { backgroundColor: '#ffff55', color: '#000000', borderColor: '#ffffff' }
                : { backgroundColor: 'var(--dos-panel)', color: 'var(--dos-text)', borderColor: 'var(--dos-border)' }
            }
            className="flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold cursor-pointer transition-none border shadow-xs"
            title="مطابق السلاسل القرآنية وحساب الجُمّل المدمج (F1)"
          >
            [<span className={activeTab === 'gematria' ? 'text-black' : 'text-[#ffff55] font-black'}>F1</span>] مطابق السلاسل القرآنية
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('search')}
            onMouseEnter={() => setHintText('باحث الأوامر والمترجم المزدوج: تشفير وفك تشفير النصوص بحساب الجُمّل')}
            onMouseLeave={clearHint}
            style={
              activeTab === 'search'
                ? { backgroundColor: '#ffff55', color: '#000000', borderColor: '#ffffff' }
                : { backgroundColor: 'var(--dos-panel)', color: 'var(--dos-text)', borderColor: 'var(--dos-border)' }
            }
            className="flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold cursor-pointer transition-none border shadow-xs"
            title="باحث الأوامر والمترجم المزدوج والتشفير (F2)"
          >
            [<span className={activeTab === 'search' ? 'text-black' : 'text-[#ffff55] font-black'}>F2</span>] باحث الأوامر والتشفير
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('settings')}
            onMouseEnter={() => setHintText('الجداول والتخصيص: إدارة قواعد رسم المصحف وقيم الأبجديات الشرقية والغربية')}
            onMouseLeave={clearHint}
            style={
              activeTab === 'settings'
                ? { backgroundColor: '#ffff55', color: '#000000', borderColor: '#ffffff' }
                : { backgroundColor: 'var(--dos-panel)', color: 'var(--dos-text)', borderColor: 'var(--dos-border)' }
            }
            className="flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold cursor-pointer transition-none border shadow-xs"
            title="تخصيص قواعد الحساب والجداول المرجعية (F3)"
          >
            [<span className={activeTab === 'settings' ? 'text-black' : 'text-[#ffff55] font-black'}>F3</span>] الجداول والتخصيص
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('info')}
            onMouseEnter={() => setHintText('الدليل والتوثيق: مراجع حساب الجُمّل والفواتح الـ 14 وتاريخ المنهجيتين')}
            onMouseLeave={clearHint}
            style={
              activeTab === 'info'
                ? { backgroundColor: '#ffff55', color: '#000000', borderColor: '#ffffff' }
                : { backgroundColor: 'var(--dos-panel)', color: 'var(--dos-text)', borderColor: 'var(--dos-border)' }
            }
            className="flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold cursor-pointer transition-none border shadow-xs"
            title="دليل النظام وتوثيق حساب الجمل القرآني (F4)"
          >
            [<span className={activeTab === 'info' ? 'text-black' : 'text-[#ffff55] font-black'}>F4</span>] الدليل والتوثيق
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
