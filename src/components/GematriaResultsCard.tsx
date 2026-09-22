import React, { useState, useMemo } from 'react';
import { useGematria } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import {
  Calculator,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
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

  if (!cleanWord || totalValue <= 0) {
    return null;
  }

  return (
    <div
      id="gematria-results-card"
      className="bg-white dark:bg-stone-900 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 transition-all duration-300 border border-emerald-500/70 dark:border-emerald-500/60 bg-emerald-50/10 dark:bg-emerald-950/20"
    >
      {/* 1. Standardized Header: Title, Model Selector & Navigation */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-semibold text-xs">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
            الجُمَّل
          </h3>

          {/* Quick Model Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-2 py-0.5 rounded-lg text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-700"
              title="تغيير نظام حساب الجُمَّل"
            >
              <span>نظام: {activeTable.name.replace(/\(.*\)/, '').trim()}</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95">
                <div className="text-2xs font-medium text-stone-400 px-1 py-0.5">اختر نظام حساب الجُمَّل:</div>
                {tables.map((tbl) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => {
                      setActiveTableId(tbl.id);
                      setShowModelPicker(false);
                    }}
                    className={`w-full text-right px-2 py-1 rounded-lg text-2xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      activeTableId === tbl.id
                        ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="truncate">{tbl.name}</span>
                    {activeTableId === tbl.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {onNavigateToGematria && (
          <button
            type="button"
            onClick={() => onNavigateToGematria(cleanWord)}
            className="text-2xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>إدارة الجداول</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Standardized Summary Strip (الكلمة + المجموع + المعادلة بالأرقام فقط) */}
      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-quran font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-tight">
            {cleanWord}
          </span>
          <span className="text-stone-400 font-mono text-xs">=</span>
          <span className="font-mono font-semibold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-300/80 dark:border-emerald-700/80 leading-none">
            {totalValue}
          </span>
        </div>

        {/* المعادلة بالأرقام فقط */}
        {!isDirectNumber && breakdown.length > 0 && (
          <div
            className="font-mono text-xs text-stone-600 dark:text-stone-400 font-medium dir-ltr flex items-center gap-1"
            title={breakdown.map((b) => `${b.char}=${b.value}`).join(' + ') + ` = ${totalValue}`}
          >
            <span>{breakdown.map((b) => b.value).join(' + ')}</span>
            <span>=</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{totalValue}</span>
          </div>
        )}
      </div>

      {/* 3. Quranic Words Matches Filter and Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-sans">
              مفردات القرآن ({displayedMatches.length})
            </h4>
          </div>

          {/* Minimal Filter Tabs (الكل / نورانية / أخرى) */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setQuranFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                quranFilter === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              الكل ({allMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setQuranFilter('noorani')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                quranFilter === 'noorani'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-indigo-600'
              }`}
            >
              نورانية ({nooraniMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setQuranFilter('non_noorani')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                quranFilter === 'non_noorani'
                  ? 'bg-stone-700 text-white shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              أخرى ({nonNooraniMatches.length})
            </button>
          </div>
        </div>

        {/* Standardized Quranic Matches Grid - Matching Decrypt and Encrypt */}
        {displayedMatches.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {displayedMatches.map((item, idx) => {
              const qMeta = item.quranicMeta;
              const isCopied = copiedText === `gem_m_${idx}`;

              return (
                <div
                  key={`gem_match_${item.text}_${idx}`}
                  onClick={() => {
                    if (onSelectWord) {
                      onSelectWord(item.text);
                    } else {
                      handleCopy(item.text, `gem_m_${idx}`);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border-2 flex items-center justify-between gap-1.5 shadow-2xs transition-all cursor-pointer select-none group ${
                    item.isNooraniOnly
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/70 border-emerald-500 dark:border-emerald-400 hover:border-emerald-600'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/80 dark:border-emerald-500/60 hover:border-emerald-600'
                  }`}
                  title={`انقر لفحص [${item.text}]`}
                >
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base font-semibold font-quran text-stone-900 dark:text-stone-100 leading-tight">
                      {item.text}
                    </span>

                    {isCopied ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        تم النسخ
                      </span>
                    ) : qMeta ? (
                      <a
                        href={getQuranTopWordUrl(
                          item.text,
                          qMeta.surahName,
                          qMeta.ayahNum,
                          qMeta.occurrences
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-sans truncate"
                        title={`سورة ${qMeta.surahName} (آية ${qMeta.ayahNum}) - عرض في المصحف`}
                      >
                        {qMeta.surahName}:{qMeta.ayahNum}
                      </a>
                    ) : null}
                  </div>

                  {/* Actions: Copy & Add to Notebook */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.text, `gem_m_${idx}`);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
                      title="نسخ المفردة"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <AddToNotebookButton
                      word={cleanWord}
                      cipher={item.text}
                      systemName={`جُمَّل (${activeTable.name.replace(/\(.*\)/, '').trim()})`}
                      surahInfo={qMeta?.surahName}
                      ayahNum={qMeta?.ayahNum}
                      type="quranic"
                      variant="icon-only"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2.5 px-3 text-center rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs">
            لا توجد مفردات قرآنية مطابقة لهذا الوزن في هذا التصنيف.
          </div>
        )}
      </div>
    </div>
  );
}
