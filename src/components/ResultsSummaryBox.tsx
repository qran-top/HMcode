import { useState } from 'react';
import { QuranicWordMeta, getQuranTopSearchUrl } from '../utils/quranicDictionary';
import { BookOpen, Sparkles, Loader2, RefreshCcw, Check, ExternalLink } from 'lucide-react';

interface ResultsSummaryBoxProps {
  exactQuranicList: { combo: string; meta: QuranicWordMeta; isReversed?: boolean; original?: string }[];
  exactDictList: { word: string; isReversed?: boolean; original?: string }[];
  nooraniMatchesCount: number;
  isGenerating: boolean;
  hasGenerated?: boolean;
  onSelectWord?: (word: string) => void;
}

export function ResultsSummaryBox({
  exactQuranicList,
  exactDictList,
  nooraniMatchesCount,
  isGenerating,
  hasGenerated = false,
  onSelectWord,
}: ResultsSummaryBoxProps) {
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  // Filter out dictionary words that duplicate exact Quranic words
  const uniqueDictList = exactDictList.filter(
    (d) => !exactQuranicList.some((q) => q.meta.word === d.word && !!q.isReversed === !!d.isReversed)
  );

  const totalMeaningful = exactQuranicList.length + uniqueDictList.length;
  const hasResults = totalMeaningful > 0 || nooraniMatchesCount > 0;

  // Don't show if empty and not generating and has not generated yet
  if (!hasResults && !isGenerating && !hasGenerated) {
    return null;
  }

  const handleWordClick = (word: string, original?: string) => {
    onSelectWord?.(original || word);
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => {
      setCopiedWord(null);
    }, 1800);
  };

  return (
    <div
      id="meaningful-accepted-results-box"
      className="bg-white rounded-2xl border-2 border-amber-300/80 shadow-xs p-3.5 sm:p-4 transition-all"
    >
      {/* Header with Title and Badges */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span>النتائج المفهومة والمقبولة</span>
              {hasResults && (
                <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  {totalMeaningful.toLocaleString('ar-EG')} كلمة
                </span>
              )}
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500">
              {isGenerating
                ? 'جاري فحص وتوليد الاحتمالات ومطابقتها مع المعاجم العربية والقرآنية...'
                : hasResults
                ? 'انقر على أي كلمة لنسخها وتحديد خيارات تشفيرها تلقائياً'
                : 'نتائج فحص المعاجم العربية والقرآنية'}
            </p>
          </div>
        </div>

        {isGenerating ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>جارِ البحث في المعاجم...</span>
          </div>
        ) : (
          copiedWord && (
            <div className="flex items-center gap-1 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>تم النسخ: {copiedWord}</span>
            </div>
          )
        )}
      </div>

      {/* Main Results Display */}
      <div className="pt-3">
        {/* State 1: When generating and no results yet */}
        {isGenerating && !hasResults && (
          <div className="py-4 text-center text-xs sm:text-sm text-stone-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>يتم توليد وفحص الاحتمالات في المعجم العربي ومعجم القرآن الكريم...</span>
          </div>
        )}

        {/* State 2: Generated but no meaningful words found */}
        {!isGenerating && hasGenerated && !hasResults && (
          <div className="py-3 px-3.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              تم فحص جميع الاحتمالات، ولم يتم العثور على كلمات مفهومة مباشرة في المعجم العربي أو القرآني ضمن احتمالات هذا النص.
            </p>
          </div>
        )}

        {/* State 3: Display Found Meaningful Words */}
        {hasResults && (
          <div className="space-y-2.5">
            {/* 1. Exact Quranic Words */}
            {exactQuranicList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>مفردات قرآنية موثقة ({exactQuranicList.length.toLocaleString('ar-EG')}):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {exactQuranicList.map((item, idx) => {
                    const isCopied = copiedWord === item.meta.word;
                    return (
                      <div
                        key={`quranic-${idx}`}
                        className={`inline-flex items-center rounded-xl border transition-all shadow-2xs group ${
                          item.isReversed
                            ? 'bg-amber-100 border-amber-400 text-amber-950 border-dashed'
                            : 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-950'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleWordClick(item.meta.word, item.original || item.combo)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95"
                          title={`انقر لاختيار ونسخ: ${item.meta.word}${item.isReversed ? ' (معكوسة)' : ''}`}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${item.isReversed ? 'text-amber-600' : 'text-amber-700'}`} />
                          )}
                          <span className="tracking-wide">{item.meta.word}</span>
                          {item.isReversed && (
                            <span className="flex items-center gap-0.5 text-[10px] bg-amber-200/80 text-amber-800 px-1 py-0.2 rounded">
                              <RefreshCcw className="w-2.5 h-2.5" />
                              معكوس
                            </span>
                          )}
                        </button>
                        <a
                          href={getQuranTopSearchUrl(item.meta.word)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pe-2 ps-1 py-1 text-amber-700 hover:text-amber-900 border-s border-amber-200"
                          title="عرض الشواهد والآيات في القرآن الكريم"
                        >
                          <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Arabic Dictionary Words */}
            {uniqueDictList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>كلمات المعجم العربي ({uniqueDictList.length.toLocaleString('ar-EG')}):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {uniqueDictList.map((item, idx) => {
                    const isCopied = copiedWord === item.word;
                    return (
                      <button
                        key={`dict-${idx}`}
                        type="button"
                        onClick={() => handleWordClick(item.word, item.original || item.word)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-extrabold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                          item.isReversed
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 border-dashed'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                        }`}
                        title={`انقر لاختيار ونسخ: ${item.word}${item.isReversed ? ' (معكوسة)' : ''}`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${item.isReversed ? 'text-emerald-600' : 'text-emerald-700'}`} />
                        )}
                        <span className="tracking-wide">{item.word}</span>
                        {item.isReversed && (
                          <span className="flex items-center gap-0.5 text-[10px] bg-emerald-200/80 text-emerald-800 px-1 py-0.2 rounded">
                            <RefreshCcw className="w-2.5 h-2.5" />
                            معكوس
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Noorani Multi-Letter Opening Matches */}
            {nooraniMatchesCount > 0 && (
              <div className="pt-1">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1 rounded-xl text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{nooraniMatchesCount.toLocaleString('ar-EG')} تركيب نوراني (فواتح السور)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

