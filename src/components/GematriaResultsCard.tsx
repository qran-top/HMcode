import React, { useState, useMemo } from 'react';
import { useGematria } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
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

          {/* Quick Model Selector: سمبل وخفيف (شرقي / غربي) بدون إطالة */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-1.5 py-0.5 rounded-md text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer border border-emerald-200/80 dark:border-emerald-700/80"
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
              <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95">
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
                      className={`w-full text-right px-2 py-1 rounded text-2xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        activeTableId === tbl.id
                          ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{shortName}</span>
                      {activeTableId === tbl.id && <Check className="w-3 h-3 shrink-0" />}
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
            className="text-2xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>التفاصيل</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Standardized Summary Strip: Letter Cards with Numbers, +, =, and Highlighted Total */}
      <div className="px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Word badge */}
          <span className="font-quran font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-200 shrink-0">
            {cleanWord}
          </span>
          <span className="text-stone-400 font-mono font-bold select-none">:</span>

          {/* Letter Breakdown Cards: [حرف ملون] [رقم رمادي] + ... = [المجموع] */}
          {!isDirectNumber && breakdown.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
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
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                      title={`الحرف [${item.char}] = ${item.value}`}
                    >
                      {/* Colored box containing the letter with high clarity */}
                      <span
                        className={`w-6.5 h-6.5 rounded-md font-bold text-xs sm:text-sm font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                      >
                        {item.char}
                      </span>
                      {/* Gray box with the number */}
                      <span
                        className="h-6.5 min-w-[28px] px-1.5 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs"
                        title={`قيمة الجُمَّل: ${item.value}`}
                      >
                        {item.value}
                      </span>
                    </div>

                    {idx < breakdown.length - 1 && (
                      <span className="text-stone-400 dark:text-stone-500 font-bold font-mono text-xs sm:text-sm px-0.5 select-none">
                        +
                      </span>
                    )}
                  </React.Fragment>
                );
              })}

              <span className="text-stone-400 dark:text-stone-500 font-bold font-mono text-xs sm:text-sm px-0.5 select-none">
                =
              </span>

              {/* Distinctive highlighted box for total result */}
              <div
                className="h-7 min-w-[38px] px-2.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-2xs border border-emerald-700 dark:border-emerald-400"
                title={`المجموع الكلي للجُمَّل: ${totalValue}`}
              >
                {totalValue}
              </div>
            </div>
          ) : (
            <div
              className="h-7 min-w-[38px] px-2.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-2xs border border-emerald-700 dark:border-emerald-400"
              title={`القيمة: ${totalValue}`}
            >
              {totalValue}
            </div>
          )}
        </div>
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
