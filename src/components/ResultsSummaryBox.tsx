import { useState } from 'react';
import { QuranicWordMeta, QuranicNearestMatch, getQuranTopSearchUrl } from '../utils/quranicDictionary';
import { BookOpen, Sparkles, Loader2, RefreshCcw, Check, ExternalLink, Search } from 'lucide-react';

interface ResultsSummaryBoxProps {
  exactQuranicList: { combo: string; meta: QuranicWordMeta; isReversed?: boolean; original?: string }[];
  exactDictList: { word: string; isReversed?: boolean; original?: string }[];
  nooraniMatchesCount: number;
  nearestQuranicList?: { combo: string; nearest: QuranicNearestMatch; isReversed?: boolean; original?: string }[];
  isGenerating: boolean;
  hasGenerated?: boolean;
  onSelectWord?: (word: string) => void;
  onGenerate?: () => void;
  totalCombinations?: number;
}

export function ResultsSummaryBox({
  exactQuranicList,
  exactDictList,
  nooraniMatchesCount,
  nearestQuranicList = [],
  isGenerating,
  hasGenerated = false,
  onSelectWord,
  onGenerate,
  totalCombinations,
}: ResultsSummaryBoxProps) {
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  // Filter out dictionary words that duplicate exact Quranic words
  const uniqueDictList = exactDictList.filter(
    (d) => !exactQuranicList.some((q) => q.meta.word === d.word && !!q.isReversed === !!d.isReversed)
  );

  const topNearest = nearestQuranicList.slice(0, 10);
  const totalMeaningful = exactQuranicList.length + uniqueDictList.length;
  const hasResults = totalMeaningful > 0 || nooraniMatchesCount > 0 || topNearest.length > 0;

  // Don't show if empty and not generating and has not generated yet and no onGenerate
  if (!hasResults && !isGenerating && !hasGenerated && !onGenerate) {
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
      className="bg-white dark:bg-stone-900 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 shadow-xs p-3.5 sm:p-4 transition-all"
    >
      {/* Header with Title and Badges */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100 dark:border-stone-800 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>النتائج المفهومة والمقبولة والتطابق القرآني</span>
              {hasResults && (
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-full">
                  {totalMeaningful > 0 ? `${totalMeaningful.toLocaleString('ar-EG')} كلمة مطابقة` : `${topNearest.length} مفردة مقاربة`}
                </span>
              )}
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
              {isGenerating
                ? 'جاري فحص وتوليد الاحتمالات ومطابقتها مع المعاجم العربية والقرآنية...'
                : hasResults
                ? 'انقر على أي كلمة لنسخها وتحديد خيارات تشفيرها تلقائياً'
                : 'فحص المعاجم العربية ومعجم ألفاظ القرآن الكريم'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasGenerated && !isGenerating && onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>توليد وعرض الاحتمالات</span>
            </button>
          )}

          {isGenerating ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              <span>جارِ البحث في المعاجم...</span>
            </div>
          ) : (
            copiedWord && (
              <div className="flex items-center gap-1 text-xs text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-md animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>تم النسخ: {copiedWord}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Main Results Display */}
      <div className="pt-3">
        {/* State 0: Not generated yet */}
        {!isGenerating && !hasGenerated && onGenerate && (
          <div className="p-3 sm:p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
            <div>
              <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                {totalCombinations ? `يوجد ${totalCombinations.toLocaleString('ar-EG')} احتمال تشفيري ممكن لهذا النص` : 'جاهز لتوليد ومطابقة الاحتمالات'}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                اضغط الزر لتوليد قائمة الاحتمالات وفحص المفردات القرآنية المتطابقة وأقرب المفردات القرآنية شبهاً بالاحتمالات الحالية (مع نسبة التقارب).
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>توليد وعرض الاحتمالات والتطابق القرآني</span>
            </button>
          </div>
        )}

        {/* State 1: When generating and no results yet */}
        {isGenerating && !hasResults && (
          <div className="py-4 text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
            <span>يتم توليد وفحص الاحتمالات في المعجم العربي ومعجم القرآن الكريم...</span>
          </div>
        )}

        {/* State 2: Generated but no meaningful words found */}
        {!isGenerating && hasGenerated && !hasResults && (
          <div className="py-3 px-3.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-medium">
              تم فحص جميع الاحتمالات، ولم يتم العثور على كلمات مفهومة مباشرة في المعجم العربي أو القرآني ضمن احتمالات هذا النص.
            </p>
          </div>
        )}

        {/* State 3: Display Found Meaningful Words */}
        {hasResults && (
          <div className="space-y-3">
            {/* 1. Exact Quranic Words */}
            {exactQuranicList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
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
                            ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 border-dashed'
                            : 'bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleWordClick(item.meta.word, item.original || item.combo)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95"
                          title={`انقر لاختيار ونسخ: ${item.meta.word}${item.isReversed ? ' (معكوسة)' : ''}`}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${item.isReversed ? 'text-amber-600 dark:text-amber-400' : 'text-amber-700 dark:text-amber-300'}`} />
                          )}
                          <span className="tracking-wide">{item.meta.word}</span>
                          {item.isReversed && (
                            <span className="flex items-center gap-0.5 text-[10px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded">
                              <RefreshCcw className="w-2.5 h-2.5" />
                              معكوس
                            </span>
                          )}
                        </button>
                        <a
                          href={getQuranTopSearchUrl(item.meta.word)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pe-2 ps-1 py-1 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 border-s border-amber-200 dark:border-amber-800"
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

            {/* 2. Nearest Quranic Vocabulary with Similarity Percentage */}
            {topNearest.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-amber-100 dark:border-stone-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>أقرب المفردات القرآنية شبهًا بالاحتمالات الحالية (مع نسبة التقارب):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {topNearest.map(({ combo, nearest }, idx) => {
                    const sim = Math.round(nearest.similarity);
                    const isCopied = copiedWord === nearest.originalQuranicWord;
                    return (
                      <div
                        key={`nearest-${idx}`}
                        className="inline-flex items-center bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 rounded-xl px-2.5 py-1 text-xs gap-2 shadow-2xs transition-all"
                      >
                        <span className="font-bold text-stone-600 dark:text-stone-300 font-mono">{combo}</span>
                        <span className="text-stone-300 dark:text-stone-600">←</span>
                        <button
                          type="button"
                          onClick={() => handleWordClick(nearest.originalQuranicWord, combo)}
                          className="font-extrabold text-amber-950 dark:text-amber-300 hover:underline cursor-pointer inline-flex items-center gap-1"
                          title={`انقر لنسخ: ${nearest.originalQuranicWord}`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : null}
                          <span>{nearest.originalQuranicWord}</span>
                        </button>
                        <span
                          className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-md ${
                            sim >= 80 ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {sim}%
                        </span>
                        <a
                          href={getQuranTopSearchUrl(nearest.originalQuranicWord || nearest.word)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-400 dark:text-stone-500 hover:text-amber-800 dark:hover:text-amber-400"
                          title="بحث قرآني"
                        >
                          <Search className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Arabic Dictionary Words */}
            {uniqueDictList.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
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
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 border-dashed'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-200'
                        }`}
                        title={`انقر لاختيار ونسخ: ${item.word}${item.isReversed ? ' (معكوسة)' : ''}`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${item.isReversed ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-300'}`} />
                        )}
                        <span className="tracking-wide">{item.word}</span>
                        {item.isReversed && (
                          <span className="flex items-center gap-0.5 text-[10px] bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded">
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

            {/* 4. Noorani Multi-Letter Opening Matches */}
            {nooraniMatchesCount > 0 && (
              <div className="pt-1">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-300 px-3 py-1 rounded-xl text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
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

