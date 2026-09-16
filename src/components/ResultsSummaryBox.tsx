import { QuranicWordMeta } from '../utils/quranicDictionary';
import { QuranicSegmentationResult } from '../cipherData';
import { BookOpen, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface ResultsSummaryBoxProps {
  exactQuranicList: { combo: string; meta: QuranicWordMeta }[];
  exactDictList: string[];
  nooraniMatchesCount: number;
  isGenerating: boolean;
  onSelectWord?: (word: string) => void;
}

export function ResultsSummaryBox({
  exactQuranicList,
  exactDictList,
  nooraniMatchesCount,
  isGenerating,
  onSelectWord,
}: ResultsSummaryBoxProps) {
  // If no results and not generating, we might want to hide or show "no results"
  const hasResults =
    exactQuranicList.length > 0 || exactDictList.length > 0 || nooraniMatchesCount > 0;

  if (!hasResults && !isGenerating) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs sm:text-sm font-bold text-stone-900">
          النتائج المفهومة والمقبولة
        </h3>
        {isGenerating && (
          <div className="flex items-center gap-1.5 ms-auto text-xs text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>جارِ البحث...</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {exactQuranicList.length === 0 &&
          exactDictList.length === 0 &&
          nooraniMatchesCount === 0 &&
          !isGenerating && (
            <span className="text-xs text-stone-400">لا توجد كلمات ذات معنى مباشر.</span>
          )}

        {exactQuranicList.map((item, idx) => (
          <button
            key={`quranic-${idx}`}
            onClick={() => onSelectWord?.(item.combo)}
            className="flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs"
            title={`مفردة قرآنية: ${item.meta.word}`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>{item.meta.word}</span>
          </button>
        ))}

        {exactDictList.map((word, idx) => {
          // Avoid duplicating words that are already in Quranic list
          if (exactQuranicList.some((q) => q.meta.word === word)) return null;

          return (
            <button
              key={`dict-${idx}`}
              onClick={() => onSelectWord?.(word)}
              className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
              title={`كلمة قاموسية: ${word}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>{word}</span>
            </button>
          );
        })}

        {nooraniMatchesCount > 0 && (
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-300 text-indigo-900 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>{nooraniMatchesCount} تركيب نوراني</span>
          </div>
        )}
      </div>
    </div>
  );
}
