import React, { useState, useMemo } from 'react';
import { useGematria } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import {
  Calculator,
  BookOpen,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  RotateCcw,
  Layers,
  Settings2,
  TableProperties
} from 'lucide-react';

interface GematriaResultsCardProps {
  word?: string;
  query?: string;
  onNavigateToGematria?: (text: string) => void;
  onSelectWord?: (word: string) => void;
}

export function GematriaResultsCard({ word, query, onNavigateToGematria, onSelectWord }: GematriaResultsCardProps) {
  const {
    activeTable,
    activeTableId,
    tables,
    setActiveTableId,
    calculateWordGematria,
    getLetterBreakdown,
    findQuranicMatches,
  } = useGematria();

  const [quranFilter, setQuranFilter] = useState<'noorani' | 'non_noorani' | 'all'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const cleanWord = useMemo(() => (word || query || '').trim(), [word, query]);
  const isDirectNumber = useMemo(() => /^[0-9]+$/.test(cleanWord), [cleanWord]);

  // Total value based on current Gematria table
  const totalValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord);
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  // Letter breakdown
  const breakdown = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord);
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  // Statistics
  const stats = useMemo(() => {
    const totalLetters = breakdown.length;
    const nooraniCount = breakdown.filter((b) => b.isNoorani).length;
    const nonNooraniCount = totalLetters - nooraniCount;
    const isPureNoorani = totalLetters > 0 && nooraniCount === totalLetters;
    return {
      totalLetters,
      nooraniCount,
      nonNooraniCount,
      isPureNoorani,
    };
  }, [breakdown]);

  // Matching Quranic words
  const allMatches = useMemo(() => {
    if (!totalValue || totalValue <= 0) return [];
    return findQuranicMatches(totalValue, { filterType: 'all', maxResults: 120 });
  }, [totalValue, findQuranicMatches]);

  const nooraniMatches = useMemo(() => allMatches.filter((m) => m.isNooraniOnly), [allMatches]);
  const nonNooraniMatches = useMemo(() => allMatches.filter((m) => !m.isNooraniOnly), [allMatches]);

  const displayedMatches = useMemo(() => {
    if (quranFilter === 'noorani') return nooraniMatches;
    if (quranFilter === 'non_noorani') return nonNooraniMatches;
    return allMatches;
  }, [quranFilter, nooraniMatches, nonNooraniMatches, allMatches]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  return (
    <div
      id="gematria-results-card"
      className="bg-white dark:bg-stone-900 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3 transition-all duration-300 border-2 border-emerald-500/80 dark:border-emerald-500/70 ring-4 ring-emerald-500/10 dark:ring-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/10"
    >
      {/* 1. Header with Model Selector & Details Link */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 font-sans">
            نتائج حساب الجُمَّل والقرآن
          </h3>

          {/* Active Model Indicator / Quick Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-2 py-0.5 rounded-md text-3xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-700"
              title="تغيير نموذج الجُمَّل (المشرقي / المغربي / المخصص)"
            >
              <span>نظام: {activeTable.name.replace(/\(.*\)/, '').trim()}</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95">
                <div className="text-3xs font-bold text-stone-400 px-2 py-1">اختر نظام حساب الجُمَّل:</div>
                {tables.map((tbl) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => {
                      setActiveTableId(tbl.id);
                      setShowModelPicker(false);
                    }}
                    className={`w-full text-right px-2 py-1.5 rounded-lg text-2xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      activeTableId === tbl.id
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="truncate">{tbl.name}</span>
                    {activeTableId === tbl.id && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}

                {onNavigateToGematria && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowModelPicker(false);
                      onNavigateToGematria(cleanWord);
                    }}
                    className="w-full text-center text-3xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1 border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                  >
                    تعديل الجداول والقيم ←
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {onNavigateToGematria && (
          <button
            type="button"
            onClick={() => onNavigateToGematria(cleanWord)}
            className="text-2xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>إدارة الجداول والأبجدية</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Gematria Summary & Letters Equation Card */}
      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Word and Total Sum */}
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
              {cleanWord}
            </span>
            <span className="text-stone-400 font-sans text-xs">الجُمَّل =</span>
            <span className="px-2.5 py-0.5 rounded-lg font-mono font-black text-base sm:text-lg bg-emerald-700 text-white shadow-2xs">
              {totalValue}
            </span>
          </div>

          {/* Letter classification badges */}
          {!isDirectNumber && breakdown.length > 0 && (
            <div className="flex items-center gap-1 text-3xs font-bold">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
                {stats.nooraniCount} أحرف نورانية
              </span>
              {stats.nonNooraniCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                  {stats.nonNooraniCount} غير نورانية
                </span>
              )}
            </div>
          )}
        </div>

        {/* Letter by Letter Breakdown Equation */}
        {!isDirectNumber && breakdown.length > 0 && (
          <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/60 flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="text-stone-500 dark:text-stone-400 font-bold text-3xs">التفكيك:</span>
            {breakdown.map((item, idx) => (
              <span
                key={`gem_char_${idx}`}
                className={`px-1.5 py-0.5 rounded font-sans font-bold inline-flex items-center gap-1 ${
                  item.isNoorani
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
                title={item.isNoorani ? 'حرف نوراني من فواتح السور' : 'حرف عربي عادي'}
              >
                <span className="font-serif font-black">{item.char}</span>
                <span className="font-mono text-3xs opacity-80 font-black">({item.value})</span>
                {idx < breakdown.length - 1 && <span className="text-stone-400 font-normal ms-0.5">+</span>}
              </span>
            ))}
            <span className="text-emerald-700 dark:text-emerald-400 font-black font-mono">
              = {totalValue}
            </span>
          </div>
        )}
      </div>

      {/* 3. Quranic Words Matching Exact Weight with Noorani Filter Tabs */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 font-sans">
              مفردات القرآن بوزن ({totalValue})
            </h4>
            <span className="px-1.5 py-0.2 rounded-full text-3xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {allMatches.length}
            </span>
          </div>

          {/* Filter Tabs: Noorani vs Non-Noorani vs All */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/90 p-0.5 rounded-lg text-3xs font-bold">
            <button
              type="button"
              onClick={() => setQuranFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                quranFilter === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              الكل ({allMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setQuranFilter('noorani')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center gap-0.5 ${
                quranFilter === 'noorani'
                  ? 'bg-amber-500 text-white shadow-2xs font-black'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100/50'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>نورانية ({nooraniMatches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setQuranFilter('non_noorani')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                quranFilter === 'non_noorani'
                  ? 'bg-stone-600 text-white shadow-2xs font-black'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              غير نورانية ({nonNooraniMatches.length})
            </button>
          </div>
        </div>

        {/* Matches List Grid */}
        {displayedMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1.5 rounded-xl bg-stone-50/70 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800">
            {displayedMatches.map((item, idx) => {
              const qMeta = item.quranicMeta;
              const isCopied = copiedText === `gem_m_${idx}`;

              return (
                <div
                  key={`gem_match_${item.text}_${idx}`}
                  className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    item.isNooraniOnly
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 hover:border-amber-400'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:border-stone-300'
                  }`}
                >
                  {/* Word and Surah Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectWord) {
                            onSelectWord(item.text);
                          }
                        }}
                        className="font-serif text-sm sm:text-base font-black hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-right cursor-pointer"
                        title="انقر لفحص هذه المفردة فوراً"
                      >
                        {item.text}
                      </button>

                      {item.isNooraniOnly ? (
                        <span className="px-1 py-0.2 rounded text-3xs font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-sans inline-flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2" />
                          <span>نوراني</span>
                        </span>
                      ) : (
                        <span className="px-1 py-0.2 rounded text-3xs font-medium bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-sans">
                          عادي
                        </span>
                      )}
                    </div>

                    {qMeta && (
                      <div className="text-3xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5 font-sans">
                        <span>سورة {qMeta.surahName}</span>
                        {qMeta.ayahNumber && <span>(آية {qMeta.ayahNumber})</span>}
                        {qMeta.occurrences && qMeta.occurrences > 1 && (
                          <span className="text-stone-400">• وردت {qMeta.occurrences} مرات</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.text, `gem_m_${idx}`)}
                      className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                      title="نسخ المفردة"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <a
                      href={getQuranTopWordUrl(
                        item.text,
                        qMeta?.surahName,
                        qMeta?.ayahNum,
                        qMeta?.occurrences
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                      title={`عرض مفردة "${item.text}" في المصحف على موقع قرآن توب`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <AddToNotebookButton
                      word={cleanWord}
                      cipher={item.text}
                      systemName={`جُمَّل (${activeTable.name.replace(/\(.*\)/, '').trim()})`}
                      surahInfo={qMeta?.surahName}
                      type="quranic"
                      variant="icon-only"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-center rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs">
            لا توجد مفردات قرآنية مطابقة لهذا الوزن في هذا التصنيف.
          </div>
        )}
      </div>
    </div>
  );
}
