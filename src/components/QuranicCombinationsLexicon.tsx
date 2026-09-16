import { useState } from 'react';
import {
  QuranicWordMeta,
  QuranicNearestMatch,
  getQuranTopAyahUrl,
  getQuranTopWordUrl,
  getQuranTopSearchUrl,
} from '../utils/quranicDictionary';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Search } from 'lucide-react';

interface QuranicCombinationsLexiconProps {
  exactMatches: { combo: string; meta: QuranicWordMeta }[];
  nearestMatches: { combo: string; nearest: QuranicNearestMatch }[];
  onSelectCombo?: (combo: string) => void;
  onFilterExact?: () => void;
  isOnlyExactActive?: boolean;
}

export function QuranicCombinationsLexicon({
  exactMatches,
  nearestMatches,
  onSelectCombo,
  onFilterExact,
  isOnlyExactActive = false,
}: QuranicCombinationsLexiconProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const hasExact = exactMatches.length > 0;
  const topNearest = nearestMatches.slice(0, 8);

  return (
    <div className="bg-linear-to-b from-amber-50/70 to-emerald-50/50 rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-extrabold text-stone-900">
                قاموس المفردات القرآنية المطابقة للاحتمالات
              </h4>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  hasExact
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {hasExact ? `${exactMatches.length} مفردة قرآنية متطابقة` : 'لا توجد مطابقة تامة بعد'}
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              مقارنة وتطابق جميع الاحتمالات المولدة لحظياً مع معجم ألفاظ ومفردات القرآن الكريم (20,000+ كلمة)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {hasExact && onFilterExact && (
            <button
              type="button"
              onClick={onFilterExact}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isOnlyExactActive
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300'
                  : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isOnlyExactActive ? 'إلغاء حصر المفردات' : 'حصر القائمة بالمفردات القرآنية'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-amber-200/50 transition-colors cursor-pointer"
            title={isExpanded ? 'طي القسم' : 'توسيع القسم'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4">
          {/* Section 1: Exact Quranic Matches */}
          {hasExact ? (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>المفردات القرآنية المتطابقة نصاً مع التنزيل الحكيم ({exactMatches.length}):</span>
                </span>
                <span className="text-2xs text-stone-500">
                  انقر على أي بطاقة لعرض تفاصيلها ونسخها
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {exactMatches.map(({ combo, meta }, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-emerald-300 hover:border-emerald-500 p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-black text-emerald-900 tracking-wider">
                            {combo}
                          </span>
                          {meta.originalQuranicWord !== combo && (
                            <span className="text-2xs text-stone-500 font-medium">
                              (أصلها: {meta.originalQuranicWord})
                            </span>
                          )}
                        </div>
                        {meta.occurrences > 1 ? (
                          <a
                            href={getQuranTopSearchUrl(meta.originalQuranicWord || combo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline mt-0.5 inline-flex items-center gap-1 group/link"
                            title={`بحث عن "${meta.originalQuranicWord || combo}" (${meta.occurrences} مواضع) بمحرك بحث قرآن توب`}
                          >
                            <Search className="w-3 h-3 text-amber-600 group-hover/link:text-amber-900 transition-colors" />
                            <span>بحث في القرآن ({meta.occurrences} مواضع)</span>
                            <ExternalLink className="w-2.5 h-2.5 text-amber-600 group-hover/link:text-amber-900 transition-colors opacity-70" />
                          </a>
                        ) : (
                          <a
                            href={getQuranTopAyahUrl(meta.surahNumber || meta.surahName, meta.ayahNum)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline mt-0.5 inline-flex items-center gap-1 group/link"
                            title={`فتح الآية ${meta.ayahNum} من سورة ${meta.surahName} على موقع قرآن توب (qran-top)`}
                          >
                            <BookOpen className="w-3 h-3 text-amber-600 group-hover/link:text-amber-900 transition-colors" />
                            <span>سورة {meta.surahName} - الآية {meta.ayahNum}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-amber-600 group-hover/link:text-amber-900 transition-colors opacity-70" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(combo, `exact-${idx}`)}
                        className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="نسخ المفردة القرآنية"
                      >
                        {copiedKey === `exact-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-2xs pt-1.5 border-t border-emerald-100/80 text-stone-600">
                      <span>
                        وردت في التنزيل: <strong className="text-emerald-900">{meta.occurrences}</strong>{' '}
                        {meta.occurrences === 1 ? 'موضع' : 'مواضع'}
                      </span>
                      {onSelectCombo && (
                        <button
                          type="button"
                          onClick={() => onSelectCombo(combo)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
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
            <div className="bg-white/80 rounded-xl border border-stone-200 p-3 text-center text-xs text-stone-600 flex flex-col items-center justify-center gap-1">
              <span className="font-bold text-stone-800">
                لم ينتج تطابق حرفي تام مع ألفاظ القرآن الكريم في هذه التوليفة الحالية.
              </span>
              <span className="text-stone-500">
                يمكنك الاطلاع أدناه على أقرب المفردات القرآنية المشابهة لأحرف هذه الاحتمالات مع نسب التقارب.
              </span>
            </div>
          )}

          {/* Section 2: Closest / Nearest Quranic Vocabulary */}
          {topNearest.length > 0 && (
            <div className="pt-2 border-t border-amber-200/50">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-stone-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>أقرب المفردات القرآنية شبهًا بالاحتمالات الحالية (مع نسبة التقارب):</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {topNearest.map(({ combo, nearest }, idx) => (
                  <div
                    key={idx}
                    className="bg-white/90 rounded-lg border border-stone-200 hover:border-amber-300 p-2 text-xs shrink-0 flex items-center gap-2 shadow-2xs"
                  >
                    <span className="font-extrabold text-stone-800 tracking-wider">{combo}</span>
                    <span className="text-stone-300">←</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-amber-900">
                        {nearest.originalQuranicWord}
                      </span>
                      <a
                        href={getQuranTopSearchUrl(nearest.originalQuranicWord || nearest.word)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-3xs text-stone-500 hover:text-amber-800 hover:underline font-mono inline-flex items-center gap-0.5"
                        title={`بحث عن "${nearest.originalQuranicWord}" في محرك بحث قرآن توب`}
                      >
                        <span>بحث قرآني ({nearest.similarity}%)</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
