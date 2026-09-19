import { EncryptedLetterDetail, LAYER_RAINBOW_COLORS, QuranicSegmentationResult } from '../cipherData';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import { Shuffle, RefreshCw, Copy, Check, Sparkles } from 'lucide-react';

interface LetterAnalysisCardProps {
  details: EncryptedLetterDetail[];
  selectedProbabilities: number[]; // 0 for prob1, 1 for prob2 for each character
  onToggleProbability: (index: number, probIndex: number) => void;
  displaySelectedCipher?: string;
  onRandomize?: () => void;
  onInvert?: () => void;
  onCopyCipher?: () => void;
  isCopiedCipher?: boolean;
  segmentation?: QuranicSegmentationResult;
}

export function LetterAnalysisCard({
  details,
  selectedProbabilities,
  onToggleProbability,
  displaySelectedCipher,
  onRandomize,
  onInvert,
  onCopyCipher,
  isCopiedCipher,
  segmentation,
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
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs p-3 sm:p-4 transition-colors space-y-3">
      {/* Top Header: Title, Output Preview & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-stone-100 dark:border-stone-800">
        
        {/* Output String & Inline Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
            النص المشفر المعتمد:
          </span>
          {displaySelectedCipher ? (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-lg">
              <span className="font-extrabold text-sm sm:text-base text-amber-900 dark:text-amber-200 tracking-wider">
                {displaySelectedCipher}
              </span>
              {segmentation && segmentation.multiWordCount > 0 && (
                <span className="inline-flex items-center gap-1 text-3xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                  <Sparkles className="w-2.5 h-2.5" />
                  فواتح
                </span>
              )}
            </div>
          ) : null}

          {segmentation && segmentation.segments.length > 0 && (
            <div className="hidden md:flex items-center">
              <NooraniSegmentsBadge segmentation={segmentation} />
            </div>
          )}
        </div>

        {/* Action Buttons (Randomize, Invert, Copy) */}
        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
          {onRandomize && (
            <button
              type="button"
              id="randomize-cipher-btn"
              onClick={onRandomize}
              className="inline-flex items-center gap-1 text-2xs sm:text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="توليف عشوائي بين الاحتمالات"
            >
              <Shuffle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>توليف عشوائي</span>
            </button>
          )}

          {onInvert && (
            <button
              type="button"
              id="invert-cipher-btn"
              onClick={onInvert}
              className="inline-flex items-center gap-1 text-2xs sm:text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="عكس الاختيارات"
            >
              <RefreshCw className="w-3 h-3 text-stone-500 dark:text-stone-400" />
              <span>عكس الاختيارات</span>
            </button>
          )}

          {onCopyCipher && displaySelectedCipher && (
            <button
              type="button"
              id="copy-custom-cipher-btn"
              onClick={onCopyCipher}
              className="inline-flex items-center gap-1 text-2xs sm:text-xs font-bold text-white bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="نسخ المشفر المعتمد"
            >
              {isCopiedCipher ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>نسخ المشفر</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Render line by line: spaces create a new line */}
      <div className="space-y-2.5">
        {lines.map((lineItems, lineIdx) => (
          <div
            key={lineIdx}
            className="flex flex-wrap items-stretch gap-2 p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800"
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
                  className="w-[calc(50%-0.25rem)] sm:w-40 p-2 rounded-lg border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800 shadow-2xs hover:border-stone-300 dark:hover:border-stone-600 transition-all flex flex-col justify-between gap-1.5"
                >
                  {/* Top: Letter and Layer Number with rainbow color */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-7 h-7 rounded-md font-bold text-sm flex items-center justify-center ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                    >
                      {item.originalChar}
                    </span>

                    <span
                      className={`text-2xs font-bold px-1.5 py-0.5 rounded ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                    >
                      الطبقة {layerNum}
                    </span>
                  </div>

                  {/* Probability options buttons */}
                  <div className="pt-0.5">
                    {(() => {
                      const options = item.cipherOptions && item.cipherOptions.length > 0
                        ? item.cipherOptions
                        : [item.prob1, item.prob2];

                      return (
                        <div
                          className={`grid gap-1 ${
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
                                className={`py-1 px-1 rounded border text-center font-bold text-sm font-['Amiri',serif] transition-all cursor-pointer ${
                                  isSelected
                                    ? `${color.activeBg} ${color.activeText} ${color.activeBorder} font-black scale-105 shadow-2xs`
                                    : 'bg-stone-50 dark:bg-stone-700/60 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700'
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
