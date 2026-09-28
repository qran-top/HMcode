import React from 'react';
import { useHint } from '../context/HintContext';

export function DosBottomHintBar() {
  const { isHintEnabled, toggleHint, hintText } = useHint();

  if (!isHintEnabled) {
    return null;
  }

  const displayText = hintText || 'نظام التلميحات الفورية: مرر مؤشر الفأرة فوق أي زر أو نتيجة بالصفحة لعرض شرح تفصيلي مباشر هنا...';

  return (
    <footer
      aria-label="شريط تلميحات دوس السفلي الثابت"
      style={{
        backgroundColor: '#000080',
        borderTop: '2px solid #55ffff',
      }}
      className="fixed bottom-0 left-0 right-0 z-[9999] shadow-[0_-6px_20px_rgba(0,0,0,0.85)] px-2 sm:px-4 py-2 font-mono select-none pointer-events-auto transition-none"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Prompt label + Hint text */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="bg-[#ffff55] text-black px-2 py-0.5 text-xs font-black shrink-0 tracking-wider font-mono shadow-xs">
            C:\DOS\HINT&gt;
          </span>
          <p className="text-white font-bold text-xs sm:text-sm truncate font-mono tracking-wide leading-normal m-0 p-0 flex items-center gap-1.5">
            <span className="text-[#55ffff] font-black shrink-0">💡</span>
            <span className="text-[#ffff55] font-extrabold truncate">{displayText}</span>
          </p>
        </div>

        {/* Action Controls: Strictly close button without caption (only '✕') as requested */}
        <div className="flex items-center gap-1.5 shrink-0">
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
