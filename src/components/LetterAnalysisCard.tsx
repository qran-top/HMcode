import { EncryptedLetterDetail, LAYER_RAINBOW_COLORS } from '../cipherData';

interface LetterAnalysisCardProps {
  details: EncryptedLetterDetail[];
  selectedProbabilities: number[]; // 0 for prob1, 1 for prob2 for each character
  onToggleProbability: (index: number, probIndex: number) => void;
}

export function LetterAnalysisCard({
  details,
  selectedProbabilities,
  onToggleProbability,
}: LetterAnalysisCardProps) {
  if (details.length === 0) return null;

  // Group letters into lines/rows based on spaces and newlines
  const lines: { originalIndex: number; detail: EncryptedLetterDetail }[][] = [];
  let currentLine: { originalIndex: number; detail: EncryptedLetterDetail }[] = [];

  details.forEach((item, index) => {
    if (item.originalChar === ' ' || item.originalChar === '\n') {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
      }
    } else {
      currentLine.push({ originalIndex: index, detail: item });
    }
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100">
        <h3 id="letter-breakdown-title" className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
          <span>تحليل الحروف والطبقات</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
            {details.filter((d) => !d.isSpecialOrSpace).length} حرفاً
          </span>
        </h3>
        <span className="text-xs text-stone-400">
          انقر على أي احتمال لتبديله
        </span>
      </div>

      {/* Render line by line: spaces create a new line */}
      <div className="space-y-4">
        {lines.map((lineItems, lineIdx) => (
          <div
            key={lineIdx}
            className="flex flex-wrap items-stretch gap-2.5 sm:gap-3 p-2 rounded-xl bg-stone-50/50 border border-stone-100"
          >
            {lineItems.map(({ originalIndex, detail: item }) => {
              const currentChoice = selectedProbabilities[originalIndex] ?? 0;
              const layerNum = item.layer?.layer ?? 0;
              const color = LAYER_RAINBOW_COLORS[layerNum] || {
                activeBg: 'bg-stone-800',
                activeText: 'text-white',
                activeBorder: 'border-stone-900',
                lightBg: 'bg-stone-50',
                lightBorder: 'border-stone-200',
              };

              return (
                <div
                  key={originalIndex}
                  id={`char-card-${originalIndex}`}
                  className="w-[calc(50%-0.35rem)] sm:w-44 p-2.5 rounded-xl border border-stone-200 bg-white shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between gap-2"
                >
                  {/* Top: Letter and Layer Number with rainbow color */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center shadow-xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                    >
                      {item.originalChar}
                    </span>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                    >
                      الطبقة {layerNum}
                    </span>
                  </div>

                  {/* Probability options buttons (dynamic for up to 9 slots) */}
                  <div className="pt-1">
                    {(() => {
                      const options = item.cipherOptions && item.cipherOptions.length > 0
                        ? item.cipherOptions
                        : [item.prob1, item.prob2];

                      return (
                        <div
                          className={`grid gap-1.5 ${
                            options.length <= 2
                              ? 'grid-cols-2'
                              : options.length <= 4
                              ? 'grid-cols-2 sm:grid-cols-4'
                              : 'grid-cols-3'
                          }`}
                        >
                          {options.map((optChar, optIdx) => {
                            const isSelected = currentChoice === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => onToggleProbability(originalIndex, optIdx)}
                                className={`py-1 px-1 rounded-lg border text-center font-bold text-sm sm:text-base font-['Amiri',serif] transition-all cursor-pointer ${
                                  isSelected
                                    ? `${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-xs font-black scale-105`
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                }`}
                                title={`الخيار ${optIdx + 1}: ${optChar}`}
                              >
                                {optChar}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
