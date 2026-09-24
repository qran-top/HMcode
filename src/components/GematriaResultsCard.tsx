import React, { useState, useMemo } from 'react';
import { useGematria } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import { findNooraniCombinations, NooraniFormulaMatch } from '../utils/gematriaEngine';
import {
  Calculator,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Repeat,
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
  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isFoldOpen, setIsFoldOpen] = useState(false);

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

  // Noorani combinations of letters only ordered close to Fawatih
  const nooraniFormulas = useMemo(() => {
    if (!totalValue || totalValue <= 0) return [];
    return findNooraniCombinations(totalValue, activeTable.values, {
      maxResults: 60,
      uniqueLettersOnly: uniqueNooraniOnly,
    });
  }, [totalValue, activeTable.values, uniqueNooraniOnly]);

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
      className="bg-white dark:bg-stone-900 rounded-xl p-3 shadow-2xs space-y-2 transition-all duration-300 border border-emerald-500/80 shadow-xs ring-2 ring-emerald-500/10 dark:ring-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/10"
    >
      {/* 1. Standardized Header: Title, Model Selector & Navigation */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-4.5 h-4.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs">
            <Calculator className="w-3 h-3" />
          </div>
          <h3 className="text-xs font-medium text-stone-900 dark:text-stone-100 font-sans">
            الجُمَّل
          </h3>

          {/* Quick Model Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-1.5 py-0.5 rounded text-3xs font-normal bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors inline-flex items-center gap-0.5 cursor-pointer border border-emerald-200/80 dark:border-emerald-700/80"
              title="تغيير نظام الجُمَّل"
            >
              <span>
                {activeTable.id === 'mashriqi'
                  ? 'شرقي'
                  : activeTable.id === 'maghribi'
                  ? 'غربي'
                  : activeTable.name.replace(/\(.*\)/, '').replace('النموذج', '').trim()}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95">
                {tables.map((tbl) => {
                  const shortName =
                    tbl.id === 'mashriqi'
                      ? 'شرقي'
                      : tbl.id === 'maghribi'
                      ? 'غربي'
                      : tbl.name.replace(/\(.*\)/, '').replace('النموذج', '').trim();
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setActiveTableId(tbl.id);
                        setShowModelPicker(false);
                      }}
                      className={`w-full text-right px-1.5 py-0.5 rounded text-3xs font-normal transition-all flex items-center justify-between cursor-pointer ${
                        activeTableId === tbl.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{shortName}</span>
                      {activeTableId === tbl.id && <Check className="w-2.5 h-2.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {onNavigateToGematria && (
          <button
            type="button"
            onClick={() => onNavigateToGematria(cleanWord)}
            className="p-0.5 rounded text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
            title="الانتقال إلى واجهة الجُمَّل"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Standardized Summary Strip: Letter Cards with Numbers, +, =, and Highlighted Total */}
      <div className="px-2 py-1 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between gap-1.5 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Word badge */}
          <span className="font-quran font-normal text-xs text-emerald-950 dark:text-emerald-200 shrink-0">
            {cleanWord}
          </span>
          <span className="text-stone-400 font-mono font-normal select-none">:</span>

          {/* Letter Breakdown Cards */}
          {!isDirectNumber && breakdown.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {breakdown.map((item, idx) => {
                const layer = findLayerForChar(item.char);
                const layerNum = layer ? layer.layer : 0;
                const color = LAYER_RAINBOW_COLORS[layerNum] || {
                  name: 'زمردي',
                  activeBg: 'bg-emerald-600',
                  activeText: 'text-white',
                  activeBorder: 'border-emerald-700',
                };

                return (
                  <React.Fragment key={`breakdown_${idx}`}>
                    <div
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                      title={`الحرف [${item.char}] = ${item.value}`}
                    >
                      <span
                        className={`w-5.5 h-5.5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                      >
                        {item.char}
                      </span>
                      <span
                        className="h-5.5 min-w-[20px] px-1 rounded font-mono font-normal text-xs flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs"
                        title={`قيمة الجُمَّل: ${item.value}`}
                      >
                        {item.value}
                      </span>
                    </div>

                    {idx < breakdown.length - 1 && (
                      <span className="text-stone-400 dark:text-stone-500 font-normal font-mono text-xs px-0.5 select-none">
                        +
                      </span>
                    )}
                  </React.Fragment>
                );
              })}

              <span className="text-stone-400 dark:text-stone-500 font-normal font-mono text-xs px-0.5 select-none">
                =
              </span>

              {/* Total result button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const query = encodeURIComponent(`ما هي قواسم العدد ${totalValue}`);
                  window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
                }}
                className="h-5.5 min-w-[30px] px-1.5 rounded bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-mono font-normal text-xs flex items-center justify-center gap-0.5 shrink-0 shadow-2xs border border-emerald-700 dark:border-emerald-400 cursor-pointer transition-colors"
                title={`انقر للبحث عن قواسم العدد ${totalValue} في جوجل`}
              >
                <span>{totalValue}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const query = encodeURIComponent(`ما هي قواسم العدد ${totalValue}`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
              }}
              className="h-5.5 min-w-[30px] px-1.5 rounded bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-mono font-normal text-xs flex items-center justify-center gap-0.5 shrink-0 shadow-2xs border border-emerald-700 dark:border-emerald-400 cursor-pointer transition-colors"
              title={`انقر للبحث عن قواسم العدد ${totalValue} في جوجل`}
            >
              <span>{totalValue}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </button>
          )}
        </div>
      </div>

      {/* 2.5 Noorani Formulas Preview Row */}
      {nooraniFormulas.length > 0 && (
        <div className="p-1.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
          <div className="flex items-center justify-between text-2xs font-normal text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-3xs text-stone-500 dark:text-stone-400">(= {totalValue})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUniqueNooraniOnly(!uniqueNooraniOnly)}
                className={`p-1 rounded text-3xs font-normal transition-colors cursor-pointer border ${
                  uniqueNooraniOnly
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
                title={uniqueNooraniOnly ? 'تصفية دون تكرار (مفعل)' : 'السماح بالتكرار'}
              >
                <Repeat className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap max-h-28 overflow-y-auto pr-0.5">
            {nooraniFormulas.map((n, i) => (
              <button
                key={`noorani_mini_${i}`}
                type="button"
                onClick={() => {
                  if (onSelectWord) {
                    onSelectWord(n.formula);
                  } else {
                    handleCopy(n.formula, `noorani_${i}`);
                  }
                }}
                className={`px-1.5 py-0.5 rounded text-xs font-quran font-normal flex items-center gap-0.5 cursor-pointer transition-all shadow-2xs ${
                  n.isAuthenticQuranicFawatih
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-emerald-200/80 dark:border-emerald-800/80 hover:border-emerald-400'
                }`}
                title={`الصيغة: ${n.formula} | تفكيك: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} = ${n.sum} ${n.description ? `(${n.description})` : ''}`}
              >
                <span>{n.formula}</span>
                {n.isAuthenticQuranicFawatih && <span className="text-3xs">⭐</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Quranic Words Matches Filter and Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-2xs font-normal text-stone-600 dark:text-stone-400 font-sans">
              مفردات قرآنية ({displayedMatches.length})
            </h4>
          </div>

          {/* Minimal Filter Tabs (الكل / نورانية / أخرى) */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded text-3xs font-normal">
              <button
                type="button"
                onClick={() => setQuranFilter('all')}
                className={`px-1.5 py-0.2 rounded cursor-pointer transition-all ${
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
                className={`px-1.5 py-0.2 rounded cursor-pointer transition-all ${
                  quranFilter === 'noorani'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-emerald-600'
                }`}
              >
                نورانية ({nooraniMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setQuranFilter('non_noorani')}
                className={`px-1.5 py-0.2 rounded cursor-pointer transition-all ${
                  quranFilter === 'non_noorani'
                    ? 'bg-stone-700 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                أخرى ({nonNooraniMatches.length})
              </button>
            </div>
          </div>
        </div>

        {/* Standardized Quranic Matches Grid - Full Scrollable Display */}
        {displayedMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-0.5">
            {displayedMatches.map((item, idx) => {
              const qMeta = item.quranicMeta;
              const isCopied = copiedText === `gem_m_${idx}`;
              const quranUrl = getQuranTopWordUrl(
                item.text,
                qMeta?.surahName || '',
                qMeta?.ayahNum || 1,
                qMeta?.occurrences || 1
              );

              return (
                <div
                  key={`gem_match_${item.text}_${idx}`}
                  className="px-2 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-1 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all select-none group"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <a
                      href={quranUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-normal font-quran text-emerald-950 dark:text-emerald-100 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline leading-tight"
                      title={`البحث عن [${item.text}] في المصحف`}
                    >
                      {item.text}
                    </a>

                    {isCopied && (
                      <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                        تم
                      </span>
                    )}
                  </div>

                  {/* Actions: Copy & Add to Notebook */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.text, `gem_m_${idx}`)}
                      className="p-0.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                      title="نسخ الكلمة"
                    >
                      {isCopied ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
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
          <div className="py-2 px-2 text-center rounded-md bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-3xs font-normal">
            لا توجد مفردات قرآنية مطابقة لهذا الوزن في هذا التصنيف.
          </div>
        )}
      </div>
    </div>
  );
}
