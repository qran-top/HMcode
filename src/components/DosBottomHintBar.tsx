import React from 'react';
import { useHint } from '../context/HintContext';

export function DosBottomHintBar() {
  const { isHintEnabled, toggleHint, hintText, currentQuery } = useHint();

  if (!isHintEnabled) {
    return null;
  }

  const displayText = hintText || 'مرر المؤشر أو المس أي عنصر بالصفحة لعرض وظيفته وشرحه المباشر هنا...';
  const queryBadge = currentQuery && currentQuery.trim() ? currentQuery.trim() : null;

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
      <div className="w-full mx-auto flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Authentic Pure DOS symbol & searched query badge (NO English text, NO lightbulb emoji) */}
          <span className="bg-[#ffff55] text-black px-1.5 py-0.5 font-black text-xs shrink-0 flex items-center gap-1 shadow-xs border border-white">
            <span className="font-mono text-black font-black">►</span>
            {queryBadge ? <span>{queryBadge}</span> : <span>DOS</span>}
          </span>

          {/* Simple, clean, direct hint text */}
          <p className="text-[#ffff55] font-extrabold text-xs sm:text-sm truncate font-mono tracking-wide leading-normal m-0 p-0 flex-1 min-w-0 select-text">
            {displayText}
          </p>
        </div>

        {/* Far corner close button strictly [✕] */}
        <button
          type="button"
          onClick={toggleHint}
          className="text-xs sm:text-sm text-white bg-[#aa0000] hover:bg-[#ff3333] active:bg-[#660000] font-black px-2.5 py-0.5 border border-white cursor-pointer active:translate-y-0.5 transition-none shadow-xs shrink-0 mr-auto"
          title="إخفاء شريط الهنت (يمكنك إعادة إظهاره من زر [تلميح] بالأعلى)"
          aria-label="إغلاق التلميح"
        >
          ✕
        </button>
      </div>
    </footer>
  );
}

export default DosBottomHintBar;
