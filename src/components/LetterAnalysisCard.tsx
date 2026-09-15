import { EncryptedLetterDetail } from '../cipherData';
import { Sparkles, Check, ArrowDown } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
        <div>
          <h3 id="letter-breakdown-title" className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span>تحليل الحروف وطبقاتها واحتمالاتها</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-normal">
              {details.filter(d => !d.isSpecialOrSpace).length} أحرف
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            لكل حرف طبقة خاصة واحتمالان للتشفير. يمكنك النقر على أي احتمال لاختياره في التشفير المخصص.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {details.map((item, index) => {
          if (item.isSpecialOrSpace) {
            return (
              <div
                key={index}
                id={`char-card-special-${index}`}
                className="p-3.5 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 flex items-center justify-between text-stone-400"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center font-mono text-xs text-stone-500">
                    {item.originalChar === ' ' ? 'مسافة' : item.originalChar}
                  </span>
                  <span className="text-xs">فاصل / غير مشفر</span>
                </div>
                <span className="text-xs font-mono">{item.originalChar === ' ' ? '␣' : item.originalChar}</span>
              </div>
            );
          }

          const currentChoice = selectedProbabilities[index] ?? 0;
          const layerNum = item.layer?.layer ?? '?';

          return (
            <div
              key={index}
              id={`char-card-${index}`}
              className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-stone-50/80 transition-all duration-150 flex flex-col gap-2.5"
            >
              {/* Header: Original Letter & Layer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-stone-900 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                    {item.originalChar}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      الطبقة {layerNum}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      ({item.layer?.arabicLetters.join(' ')})
                    </div>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                  الحرف {index + 1}
                </span>
              </div>

              {/* Probabilities 1 & 2 */}
              <div className="mt-1 pt-2 border-t border-stone-200/60">
                <div className="text-[11px] font-semibold text-stone-500 mb-1.5 flex items-center justify-between">
                  <span>الاحتمالان المتاحان:</span>
                  <span className="text-stone-400">انقر للاختيار</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Probability 1 */}
                  <button
                    type="button"
                    onClick={() => onToggleProbability(index, 0)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      currentChoice === 0
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100/50'
                    }`}
                  >
                    <span className="text-[10px] font-medium opacity-80">
                      الاحتمال الأول
                    </span>
                    <span className="text-lg font-extrabold leading-none">
                      {item.prob1}
                    </span>
                  </button>

                  {/* Probability 2 */}
                  <button
                    type="button"
                    onClick={() => onToggleProbability(index, 1)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      currentChoice === 1
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100/50'
                    }`}
                  >
                    <span className="text-[10px] font-medium opacity-80">
                      الاحتمال الثاني
                    </span>
                    <span className="text-lg font-extrabold leading-none">
                      {item.prob2}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
