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
      aria-label="شريط تلميحات دوس السفلي الثابت"
      style={{
        backgroundColor: '#000080',
        borderTop: '2px solid #55ffff',
      }}
      className="fixed bottom-0 left-0 right-0 z-[9999] shadow-[0_-6px_20px_rgba(0,0,0,0.85)] px-2 sm:px-3 py-1.5 font-mono select-none pointer-events-auto transition-none"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs sm:text-sm">
        {/* Right side (RTL Start): Prompt label + Direct Hint text */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="bg-[#ffff55] text-black px-1.5 sm:px-2 py-0.5 text-3xs sm:text-xs font-black shrink-0 tracking-wider font-mono shadow-xs">
            C:\DOS\HINT&gt;
          </span>
          <span className="text-[#ffff55] font-extrabold text-xs sm:text-sm truncate font-mono tracking-wide leading-normal">
            {displayText}
          </span>
        </div>

        {/* Far Left corner (RTL End): Pinned Close Button strictly [✕] in the corner */}
        <div className="flex items-center shrink-0 mr-auto">
          <button
            type="button"
            onClick={toggleHint}
            className="text-xs sm:text-sm text-white bg-[#aa0000] hover:bg-[#ff3333] active:bg-[#660000] font-black px-2.5 py-0.5 border border-white cursor-pointer active:translate-y-0.5 transition-none shadow-xs"
            title="إخفاء شريط الهنت (يمكنك إعادة إظهاره من زر 💡تلميح بالأعلى)"
            aria-label="إغلاق التلميح"
          >
            ✕
          </button>
        </div>
      </div>
    </footer>
  );
}

export default DosBottomHintBar;
