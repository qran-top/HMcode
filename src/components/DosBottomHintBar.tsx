import React from 'react';
import { useHint } from '../context/HintContext';

export function DosBottomHintBar() {
  const { isHintEnabled, toggleHint, hintText } = useHint();

  if (!isHintEnabled) {
    return null;
  }

  const displayText = hintText || 'مرر المؤشر أو المس أي زر بالصفحة لعرض وظيفته وشرحه المباشر هنا...';

  return (
    <footer
      aria-label="شريط تلميحات دوس السفلي"
      style={{
        backgroundColor: '#000080',
        borderTop: '2px solid #55ffff',
      }}
      className="fixed bottom-0 left-0 right-0 z-[9999] shadow-[0_-6px_20px_rgba(0,0,0,0.85)] px-2 sm:px-4 py-1.5 font-mono select-none pointer-events-auto transition-none"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs sm:text-sm">
        {/* Simple, clean, direct hint text without C:\DOS\HINT prefix */}
        <p className="text-[#ffff55] font-extrabold text-xs sm:text-sm truncate font-mono tracking-wide leading-normal m-0 p-0 flex-1 min-w-0 select-text">
          {displayText}
        </p>

        {/* Far corner close button strictly [✕] */}
        <button
          type="button"
          onClick={toggleHint}
          className="text-xs sm:text-sm text-white bg-[#aa0000] hover:bg-[#ff3333] active:bg-[#660000] font-black px-2.5 py-0.5 border border-white cursor-pointer active:translate-y-0.5 transition-none shadow-xs shrink-0 mr-auto"
          title="إخفاء شريط الهنت (يمكنك إعادة إظهاره من زر 💡تلميح بالأعلى)"
          aria-label="إغلاق التلميح"
        >
          ✕
        </button>
      </div>
    </footer>
  );
}

export default DosBottomHintBar;
