import { useState } from 'react';
import {
  QuranicWordMeta,
  QuranicNearestMatch,
  getQuranTopAyahUrl,
  getQuranTopWordUrl,
  getQuranTopSearchUrl,
} from '../utils/quranicDictionary';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Search } from 'lucide-react';
import { AddToNotebookButton } from './AddToNotebookButton';

interface QuranicCombinationsLexiconProps {
  isDualMode?: boolean;
  exactMatches: { combo: string; meta: QuranicWordMeta; isReversed?: boolean }[];
  nearestMatches: { combo: string; nearest: QuranicNearestMatch; isReversed?: boolean }[];
  onSelectCombo?: (combo: string) => void;
  onFilterExact?: () => void;
  isOnlyExactActive?: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
  hasGenerated?: boolean;
  totalCombinations?: number;
  mode?: 'encryption' | 'decryption';
  searchedWord?: string;
}

export function QuranicCombinationsLexicon({
  exactMatches,
  nearestMatches,
  onSelectCombo,
  onFilterExact,
  isOnlyExactActive = false,
  onGenerate,
  isGenerating = false,
  hasGenerated = true,
  totalCombinations,
  isDualMode = false,
  mode = 'decryption',
  searchedWord = '',
}: QuranicCombinationsLexiconProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllNearest, setShowAllNearest] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    window.open(`https://qran-top.github.io/dec/?q=${encodeURIComponent(text)}`, "_blank");
  };

  const hasExact = exactMatches.length > 0;
  const displayedNearest = showAllNearest ? nearestMatches.slice(0, 30) : nearestMatches.slice(0, 10);

  return (
    <div
      id="quranic-lexicon-card"
      className="bg-linear-to-b from-amber-50/70 to-emerald-50/50 dark:from-stone-900 dark:to-stone-900 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 shadow-xs overflow-hidden transition-all"
    >
      {/* Header Bar */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-stone-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                قاموس المفردات القرآنية المطابقة للاحتمالات
              </h4>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  hasExact
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : hasGenerated
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                }`}
              >
                {!hasGenerated
                  ? 'بانتظار التوليد والمطابقة'
                  : hasExact
                  ? `${exactMatches.length} مفردة قرآنية متطابقة`
                  : nearestMatches.length > 0
                  ? `${nearestMatches.length} مفردة قريبة`
                  : 'لا توجد مطابقة بعد'}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              مقارنة وتطابق جميع الاحتمالات المولدة لحظياً مع معجم ألفاظ ومفردات القرآن الكريم (20,000+ كلمة)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Generate Button in Header if not generated */}
          {!hasGenerated && !isGenerating && onGenerate && (
            <button
              type="button"
              id="quranic-generate-header-btn"
              onClick={onGenerate}
              className="text-xs font-extrabold px-3.5 py-1.5 rounded-lg bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="توليد وعرض الاحتمالات والتطابق القرآني"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>توليد وعرض الاحتمالات</span>
            </button>
          )}

          {hasExact && onFilterExact && (
            <button
              type="button"
              onClick={onFilterExact}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isOnlyExactActive
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300'
                  : 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isOnlyExactActive ? 'إلغاء حصر المفردات' : 'حصر القائمة بالمفردات القرآنية'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-amber-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title={isExpanded ? 'طي القسم' : 'توسيع القسم'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4">
          {/* Case 1: Waiting to generate with prominent Trigger Button */}
          {!hasGenerated && !isGenerating && onGenerate && (
            <div className="p-4 sm:p-5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-white/90 dark:bg-stone-900/90 text-center space-y-3">
              <div className="space-y-1">
                <h5 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                  فحص ومطابقة ألفاظ القرآن الكريم مع الاحتمالات
                </h5>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
                  اضغط الزر أدناه لتوليد احتمالات التشفير وفحصها فورياً مع معجم القرآن الكريم لاستخراج الكلمات المتطابقة تماماً، وأقرب المفردات القرآنية شبهاً بالاحتمالات الحالية (مع نسبة التقارب).
                </p>
              </div>

              <button
                type="button"
                id="generate-quranic-matching-btn"
                onClick={onGenerate}
                className="inline-flex items-center gap-2 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>توليد وعرض الاحتمالات الخاص بالتطابق القرآني</span>
                {totalCombinations && totalCombinations > 0 && (
                  <span className="bg-amber-800/60 text-amber-100 text-2xs px-2 py-0.5 rounded-md">
                    {totalCombinations.toLocaleString('ar-EG')} احتمال
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Case 2: Generating state */}
          {isGenerating && (
            <div className="p-4 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-amber-200 dark:border-stone-700 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>جاري معالجة وتوليد ومطابقة الاحتمالات مع معجم ألفاظ القرآن الكريم...</span>
              </div>
            </div>
          )}

          {/* Case 3: Generated */}
          {hasGenerated && (
            <>
              {/* Section 1: Exact Quranic Matches */}
              {hasExact ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      <span>المفردات القرآنية المتطابقة نصاً مع التنزيل الحكيم ({exactMatches.length}):</span>
                    </span>
                    <span className="text-2xs text-stone-500 dark:text-stone-400">
                      انقر على أي بطاقة لعرض تفاصيلها ونسخها
                    </span>
                  </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {exactMatches.map(({ combo, meta, isReversed }, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-stone-800 rounded-xl border border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-500 p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-black text-emerald-900 dark:text-emerald-300 tracking-wider">
                                {combo}
                              </span>
                              {meta.originalQuranicWord !== combo && (
                                <span className="text-2xs text-stone-500 dark:text-stone-400 font-medium">
                                  (أصلها: {meta.originalQuranicWord})
                                </span>
                              )}
                            </div>
                            {meta.occurrences > 1 ? (
                              <a
                                href={getQuranTopSearchUrl(meta.originalQuranicWord || combo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 hover:underline mt-0.5 inline-flex items-center gap-1 group/link"
                                title={`بحث عن "${meta.originalQuranicWord || combo}" (${meta.occurrences} مواضع) بمحرك بحث قرآن توب`}
                              >
                                <Search className="w-3 h-3 text-amber-600 dark:text-amber-400 group-hover/link:text-amber-900 transition-colors" />
                                <span>بحث في القرآن ({meta.occurrences} مواضع)</span>
                                <ExternalLink className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 group-hover/link:text-amber-900 transition-colors opacity-70" />
                              </a>
                            ) : (
                              <a
                                href={getQuranTopAyahUrl(meta.surahNumber || meta.surahName, meta.ayahNum)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 hover:underline mt-0.5 inline-flex items-center gap-1 group/link"
                                title={`فتح الآية ${meta.ayahNum} من سورة ${meta.surahName} على موقع قرآن توب (qran-top)`}
                              >
                                <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400 group-hover/link:text-amber-900 transition-colors" />
                                <span>سورة {meta.surahName} - الآية {meta.ayahNum}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 group-hover/link:text-amber-900 transition-colors opacity-70" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(combo, `exact-${idx}`)}
                              className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                              title="نسخ المفردة القرآنية"
                            >
                              {copiedKey === `exact-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <AddToNotebookButton
                              word={
                                mode === 'encryption' && searchedWord
                                  ? searchedWord
                                  : meta.originalQuranicWord || combo
                              }
                              cipher={
                                mode === 'encryption' && searchedWord
                                  ? meta.originalQuranicWord || combo
                                  : combo
                              }
                              surahInfo={meta.surahName}
                              ayahNum={meta.ayahNum}
                              isReversed={isReversed}
                              type="quranic"
                              variant="icon-only"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-2xs pt-1.5 border-t border-emerald-100/80 dark:border-stone-700 text-stone-600 dark:text-stone-400">
                          <span>
                            وردت في التنزيل: <strong className="text-emerald-900 dark:text-emerald-300">{meta.occurrences}</strong>{' '}
                            {meta.occurrences === 1 ? 'موضع' : 'مواضع'}
                          </span>
                          {onSelectCombo && (
                            <button
                              type="button"
                              onClick={() => onSelectCombo(combo)}
                              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-bold hover:underline cursor-pointer"
                            >
                              تحديد كمعتمد
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-center text-xs text-stone-600 dark:text-stone-400 flex flex-col items-center justify-center gap-1">
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    لم ينتج تطابق حرفي تام مع ألفاظ القرآن الكريم في هذه التوليفة الحالية.
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    يمكنك الاطلاع أدناه على أقرب المفردات القرآنية المشابهة لأحرف هذه الاحتمالات مع نسب التقارب.
                  </span>
                </div>
              )}

              {/* Section 2: Closest / Nearest Quranic Vocabulary */}
              {nearestMatches.length > 0 && (
                <div className="pt-3 border-t border-amber-200/60 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>أقرب المفردات القرآنية شبهًا بالاحتمالات الحالية (مع نسبة التقارب):</span>
                      <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 text-2xs font-extrabold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        {nearestMatches.length} مفردة
                      </span>
                    </div>

                    {nearestMatches.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setShowAllNearest(!showAllNearest)}
                        className="text-2xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 underline cursor-pointer"
                      >
                        {showAllNearest ? 'عرض أقل' : `عرض المزيد (${nearestMatches.length})`}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {displayedNearest.map(({ combo, nearest, isReversed }, idx) => {
                      const copyKey = `near-${idx}-${combo}`;
                      const isCopied = copiedKey === copyKey;
                      const simPercent = Math.round(nearest.similarity);

                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-stone-700 hover:border-amber-400 p-2.5 text-xs flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <span className="font-extrabold text-stone-700 dark:text-stone-300 tracking-wider font-mono">
                                {combo}
                              </span>
                              <span className="text-stone-300 dark:text-stone-600">←</span>
                              <span className="font-extrabold text-amber-950 dark:text-amber-300 text-sm">
                                {nearest.originalQuranicWord}
                              </span>
                            </div>

                            <span
                              className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-md ${
                                simPercent >= 80
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              }`}
                              title={`نسبة التشابه: ${simPercent}%`}
                            >
                              {simPercent}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-2xs pt-1.5 border-t border-stone-100 dark:border-stone-700">
                            <a
                              href={getQuranTopSearchUrl(nearest.originalQuranicWord || nearest.word)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-500 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 hover:underline inline-flex items-center gap-1 group/link"
                              title={`بحث عن "${nearest.originalQuranicWord}" في محرك بحث قرآن توب`}
                            >
                              <Search className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>بحث قرآني</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopy(nearest.originalQuranicWord, copyKey)}
                                className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                                title="نسخ الكلمة القرآنية"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <AddToNotebookButton
                                word={
                                  mode === 'encryption' && searchedWord
                                    ? searchedWord
                                    : nearest.originalQuranicWord || nearest.word
                                }
                                cipher={
                                  mode === 'encryption' && searchedWord
                                    ? nearest.originalQuranicWord || nearest.word
                                    : combo
                                }
                                surahInfo={nearest.surahName}
                                ayahNum={nearest.ayahNum}
                                isReversed={isReversed}
                                type="quranic"
                                variant="icon-only"
                              />

                              {onSelectCombo && (
                                <button
                                  type="button"
                                  onClick={() => onSelectCombo(combo)}
                                  className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-bold hover:underline cursor-pointer"
                                  title={`اعتماد الاحتمال ${combo}`}
                                >
                                  اختيار
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
