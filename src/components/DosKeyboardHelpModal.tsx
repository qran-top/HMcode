import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Terminal, Keyboard, X, Volume2, VolumeX, Monitor } from 'lucide-react';

interface DosKeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DosKeyboardHelpModal({ isOpen, onClose }: DosKeyboardHelpModalProps) {
  const { isDos, dosSound, setDosSound, dosScanlines, setDosScanlines, playDosBeep } = useTheme();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'F1') {
        e.preventDefault();
        playDosBeep(450, 30);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, playDosBeep]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-mono select-none"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl bg-[#0000a8] text-[#ffffff] border-4 border-[#aaaaaa] shadow-[8px_8px_0px_#000000] p-0 overflow-hidden text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DOS Window Title Bar */}
        <div className="bg-[#aaaaaa] text-[#000080] px-3 py-1.5 flex items-center justify-between font-bold border-b-2 border-[#555555]">
          <div className="flex items-center gap-2">
            <span className="bg-[#000080] text-[#ffffff] px-1 text-xs font-mono">≡</span>
            <span className="tracking-wide">MS-DOS 6.22 - نظام التحكم واختصارات لوحة المفاتيح</span>
          </div>
          <button
            onClick={() => {
              playDosBeep(450, 30);
              onClose();
            }}
            className="bg-[#aa0000] text-white hover:bg-[#ff5555] px-2 py-0.5 text-xs font-bold transition-none cursor-pointer"
            title="إغلاق [Esc]"
          >
            [X]
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto bg-[#0000a8]">
          {/* Header Banner */}
          <div className="border-2 border-[#55ffff] bg-[#000055] p-3 text-center space-y-1">
            <div className="text-[#ffff55] font-bold text-base">
              ╔══════════ [ خريطة مفاتيح DOS للتحكم الكامل ] ══════════╗
            </div>
            <p className="text-xs text-[#55ffff]">
              يمكنك تشغيل واستخدام كافة وظائف التطبيق بالكامل من لوحة المفاتيح بدون الحاجة إلى الفأرة
            </p>
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F1</span>
              <span className="text-[#ffffff]">فتح / إغلاق دليل الاختصارات</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F2</span>
              <span className="text-[#ffffff]">حفظ التحليل الحالي بالمفكرة</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F3</span>
              <span className="text-[#ffffff]">الانتقال: البحث بالجُمّل والقرآن</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F4</span>
              <span className="text-[#ffffff]">الانتقال: البحث بالأوامر والتشفير</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F5</span>
              <span className="text-[#ffffff]">تحديث الحساب وإعادة المعالجة</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F6</span>
              <span className="text-[#ffffff]">فتح سجل المفكرة والمنظومات</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F7</span>
              <span className="text-[#ffffff]">فتح شاشة إعدادات الجداول</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F8</span>
              <span className="text-[#ffffff]">تبديل ألوان الدوس (أزرق، فوسفور، كهرمان، أسود، تركواز)</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">F9</span>
              <span className="text-[#ffffff]">تبديل الثيم (نهاري / ليلي / DOS)</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">Ctrl+K أو /</span>
              <span className="text-[#ffffff]">القفز الفوري لحقل الكتابة</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">Tab</span>
              <span className="text-[#ffffff]">التنقل للعنصر التالي</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">Shift+Tab</span>
              <span className="text-[#ffffff]">التنقل للعنصر السابق</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">Alt + 1..4</span>
              <span className="text-[#ffffff]">التبديل المباشر بين الشاشات</span>
            </div>

            <div className="bg-[#000080] border border-[#55ffff] p-2 flex items-center justify-between">
              <span className="bg-[#ffff55] text-[#000000] font-bold px-1.5 py-0.5">Esc</span>
              <span className="text-[#ffffff]">إغلاق القوائم والعودة للرئيسية</span>
            </div>
          </div>

          {/* Quick DOS Toggles */}
          <div className="bg-[#000055] border border-[#aaaaaa] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDosSound(!dosSound);
                  playDosBeep(880, 40);
                }}
                className={`px-3 py-1 border font-bold flex items-center gap-1.5 cursor-pointer ${
                  dosSound
                    ? 'bg-[#00aa00] text-black border-[#55ff55]'
                    : 'bg-[#555555] text-[#aaaaaa] border-[#888888]'
                }`}
              >
                {dosSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>صوت مكبر DOS الداخلي: {dosSound ? 'مُفعّل' : 'صامت'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDosScanlines(!dosScanlines);
                  playDosBeep(980, 40);
                }}
                className={`px-3 py-1 border font-bold flex items-center gap-1.5 cursor-pointer ${
                  dosScanlines
                    ? 'bg-[#00aaaa] text-black border-[#55ffff]'
                    : 'bg-[#555555] text-[#aaaaaa] border-[#888888]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>خطوط شاشة CRT: {dosScanlines ? 'مُفعّلة' : 'معطلة'}</span>
              </button>
            </div>

            <div className="text-[#55ffff] font-mono text-3xs">
              <span>DOS 6.22 COMPATIBLE</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#aaaaaa] text-[#000080] px-4 py-2 flex items-center justify-between border-t-2 border-[#555555]">
          <span className="text-xs text-[#000000]">اضغط [Enter] أو [Esc] للمتابعة والعودة للنظام</span>
          <button
            onClick={() => {
              playDosBeep(450, 30);
              onClose();
            }}
            className="bg-[#000080] text-white hover:bg-[#0000aa] active:bg-[#ffff55] active:text-black px-4 py-1 text-xs font-bold border border-white cursor-pointer"
          >
            [ موافق Enter ]
          </button>
        </div>
      </div>
    </div>
  );
}
