import {
  QuranicWordMeta,
  QuranicNearestMatch,
  getQuranTopAyahUrl,
  getQuranTopWordUrl,
  getQuranTopSearchUrl,
} from '../utils/quranicDictionary';
import { BookOpen, Sparkles, ExternalLink, Search } from 'lucide-react';

interface QuranicMatchBadgeProps {
  exactMeta: QuranicWordMeta | null;
  nearestMeta?: QuranicNearestMatch | null;
  showNearest?: boolean;
  compact?: boolean;
}

export function QuranicMatchBadge({
  exactMeta,
  nearestMeta,
  showNearest = false,
  compact = false,
}: QuranicMatchBadgeProps) {
  // Case 1: Exact Quranic Word match
  if (exactMeta) {
    const isMultiple = exactMeta.occurrences > 1;
    const quranTopUrl = getQuranTopWordUrl(
      exactMeta.originalQuranicWord || exactMeta.word,
      exactMeta.surahNumber || exactMeta.surahName,
      exactMeta.ayahNum,
      exactMeta.occurrences
    );

    if (compact) {
      return (
        <a
          href={quranTopUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-extrabold bg-amber-500/15 dark:bg-amber-500/25 hover:bg-amber-500/25 dark:hover:bg-amber-500/35 text-amber-900 dark:text-amber-300 border border-amber-400 dark:border-amber-600 transition-colors group cursor-pointer"
          title={
            isMultiple
              ? `بحث عن "${exactMeta.originalQuranicWord}" (${exactMeta.occurrences} نتائج قرآنية) في موقع قرآن توب`
              : `فتح سورة ${exactMeta.surahName} (الآية ${exactMeta.ayahNum}) في موقع قرآن توب`
          }
        >
          {isMultiple ? (
            <Search className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400 shrink-0" />
          ) : (
            <BookOpen className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400 shrink-0" />
          )}
          <span>
            قرآني: {isMultiple ? `بحث (${exactMeta.occurrences})` : `${exactMeta.surahName} (${exactMeta.ayahNum})`}
          </span>
          <ExternalLink className="w-2.5 h-2.5 text-amber-800 dark:text-amber-300 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
      );
    }

    return (
      <a
        href={quranTopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs transition-all group cursor-pointer"
        title={
          isMultiple
            ? `تكررت ${exactMeta.occurrences} مرات - انقر للبحث عن كافة مواضعها بمحرك بحث قرآن توب`
            : `فتح وقراءة الآية ${exactMeta.ayahNum} من سورة ${exactMeta.surahName} على موقع قرآن توب`
        }
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        {isMultiple ? (
          <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
        ) : (
          <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
        )}
        <span>
          لفظ قرآني: <strong>{exactMeta.originalQuranicWord}</strong>{' '}
          {isMultiple ? (
            <span>(بحث في القرآن: {exactMeta.occurrences} مواضع)</span>
          ) : (
            <span>(سورة {exactMeta.surahName} - الآية {exactMeta.ayahNum})</span>
          )}
        </span>
        <ExternalLink className="w-3 h-3 text-amber-700 dark:text-amber-400 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
        <span className="text-2xs bg-amber-200/80 dark:bg-amber-900/80 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200 font-semibold mr-1">
          {exactMeta.occurrences} {exactMeta.occurrences === 1 ? 'موضع' : 'مواضع'}
        </span>
      </a>
    );
  }

  // Case 2: Closest / Nearest Quranic Word match (if enabled and similarity >= 60%)
  if (showNearest && nearestMeta && nearestMeta.similarity >= 60) {
    const quranTopUrl = getQuranTopSearchUrl(nearestMeta.originalQuranicWord || nearestMeta.word);

    if (compact) {
      return (
        <a
          href={quranTopUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors group cursor-pointer"
          title={`بحث عن أقرب لفظ قرآني "${nearestMeta.originalQuranicWord}" على موقع قرآن توب`}
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>أقرب: {nearestMeta.originalQuranicWord} ({nearestMeta.similarity}%)</span>
          <ExternalLink className="w-2.5 h-2.5 text-stone-500 dark:text-stone-400 opacity-60 group-hover:opacity-100 shrink-0" />
        </a>
      );
    }

    return (
      <a
        href={quranTopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-all group cursor-pointer"
        title={`بحث عن أقرب لفظ قرآني "${nearestMeta.originalQuranicWord}" على موقع قرآن توب`}
      >
        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          أقرب لفظ قرآني: <strong className="text-stone-900 dark:text-stone-100 font-bold">{nearestMeta.originalQuranicWord}</strong>
        </span>
        <span className="text-stone-500 dark:text-stone-400 font-mono text-3xs mr-1">
          ({nearestMeta.similarity}% - سورة {nearestMeta.surahName} آية {nearestMeta.ayahNum})
        </span>
        <ExternalLink className="w-2.5 h-2.5 text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 shrink-0" />
      </a>
    );
  }

  return null;
}
