import React, { useState, useMemo } from 'react';
import { useGematria, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import {
  findNooraniCombinations,
  classifyAndMergeNooraniFormulas,
  NOORANI_ALGORITHMS,
  NooraniAlgorithmId,
  QURANIC_29_SURAH_FAWATIH,
} from '../utils/gematriaEngine';
import { useNooraniClassifier } from '../hooks/useNooraniClassifier';
import { NooraniProcessingBar } from './NooraniProcessingBar';
import {
  Calculator,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Repeat,
  Layers,
  ArrowLeftRight,
  Star,
  Loader2,
} from 'lucide-react';

interface GematriaResultsCardProps {
  word?: string;
  query?: string;
  onNavigateToGematria?: (text: string) => void;
  onSelectWord?: (word: string) => void;
}

export interface MergedNooraniFormulaItem {
  key: string;
  formula: string;
  system: 'mashriqi' | 'maghribi' | 'both';
  isAuthenticQuranicFawatih: boolean;
  sum: number;
  letters: string[];
  values: number[];
  description?: string;
}

export function GematriaResultsCard({
  word,
  query,
  onNavigateToGematria,
  onSelectWord,
}: GematriaResultsCardProps) {
  const {
    activeTable,
    activeTableId,
    tables,
    setActiveTableId,
    calculateWordGematria,
    getLetterBreakdown,
    findQuranicMatches,
  } = useGematria();

  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<NooraniAlgorithmId>(1);
  const [nooraniSystemFilter, setNooraniSystemFilter] = useState<'all' | 'mashriqi' | 'maghribi'>('all');
  const [selectedFormulaKey, setSelectedFormulaKey] = useState<string | null>(null);
  const [filterSurahOrder, setFilterSurahOrder] = useState<number | null>(null);
  const [sortByQuranicMatch, setSortByQuranicMatch] = useState<boolean>(true);
  const [quranFilter, setQuranFilter] = useState<'all' | 'mashriqi' | 'maghribi' | 'noorani'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const cleanWord = useMemo(() => (word || query || '').trim(), [word, query]);
  const isDirectNumber = useMemo(() => /^[0-9]+$/.test(cleanWord), [cleanWord]);

  // 1. Dual Gematria calculations: Mashriqi (شرقي) and Maghribi (غربي)
  const mashriqiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const maghribiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const isIdentical = mashriqiValue === maghribiValue;

  // Breakdown of letters for both systems
  const breakdownMashriqi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownMaghribi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  // Letters that differ between systems in this word (e.g. س or ص)
  const differingLetters = useMemo(() => {
    if (isIdentical || isDirectNumber || !cleanWord) return new Set<string>();
    const diff = new Set<string>();
    for (let i = 0; i < breakdownMashriqi.length; i++) {
      const char = breakdownMashriqi[i]?.char;
      const mashVal = breakdownMashriqi[i]?.value;
      const magVal = breakdownMaghribi[i]?.value;
      if (mashVal !== magVal && char) {
        diff.add(char);
      }
    }
    return diff;
  }, [isIdentical, isDirectNumber, cleanWord, breakdownMashriqi, breakdownMaghribi]);

  // 2. Noorani Combinations across 5 Specialized Algorithms & Classifications (Non-blocking & Cancellable)
  const {
    mergedNooraniFormulas,
    isCalculating: isNooraniCalculating,
    progress: nooraniProgress,
    progressMessage: nooraniProgressMessage,
    wasCancelled: isNooraniCancelled,
    currentAlgorithm: activeNooraniAlgorithmMeta,
    cancelCalculation: cancelNooraniCalculation,
    retryCalculation: retryNooraniCalculation,
  } = useNooraniClassifier({
    targetMashriqi: mashriqiValue,
    targetMaghribi: maghribiValue,
    algorithmId: selectedAlgorithm,
    uniqueNooraniOnly,
    queryText: cleanWord,
    maxResults: 60,
  });

  // Filtered Noorani formulas based on system selection, surah filter, and Quranic match sort
  const displayedNooraniFormulas = useMemo(() => {
    let list = [...mergedNooraniFormulas];
    if (nooraniSystemFilter === 'mashriqi') {
      list = list.filter((f) => f.system === 'mashriqi' || f.system === 'both');
    } else if (nooraniSystemFilter === 'maghribi') {
      list = list.filter((f) => f.system === 'maghribi' || f.system === 'both');
    }
    if (filterSurahOrder !== null) {
      list = list.filter((f) => f.surahOrders?.includes(filterSurahOrder));
    }
    if (sortByQuranicMatch) {
      list.sort((a, b) => {
        const countA = a.surahOrders?.length || 0;
        const countB = b.surahOrders?.length || 0;
        if (countA !== countB) return countB - countA;
        if (a.isAuthenticQuranicFawatih && !b.isAuthenticQuranicFawatih) return -1;
        if (!a.isAuthenticQuranicFawatih && b.isAuthenticQuranicFawatih) return 1;
        return a.letters.length - b.letters.length;
      });
    }
    return list;
  }, [nooraniSystemFilter, mergedNooraniFormulas, filterSurahOrder, sortByQuranicMatch]);

  // Active formula: activates solely on click so cards do not shift or jump under the mouse
  const activeFormula = useMemo(() => {
    if (selectedFormulaKey) {
      return mergedNooraniFormulas.find((f) => f.key === selectedFormulaKey) || null;
    }
    return null;
  }, [selectedFormulaKey, mergedNooraniFormulas]);

  const activeSurahOrdersSet = useMemo(() => {
    return new Set<number>(activeFormula?.surahOrders || []);
  }, [activeFormula]);

  // 4. Quranic Words Matches
  const matchesMashriqi = useMemo(() => {
    if (!mashriqiValue || mashriqiValue <= 0) return [];
    return findQuranicMatches(mashriqiValue, { filterType: 'all', maxResults: 100 });
  }, [mashriqiValue, findQuranicMatches]);

  const matchesMaghribi = useMemo(() => {
    if (!maghribiValue || maghribiValue <= 0 || isIdentical) return [];
    return findQuranicMatches(maghribiValue, { filterType: 'all', maxResults: 100 });
  }, [maghribiValue, isIdentical, findQuranicMatches]);

  // Merged Quranic matches list with system origin tags
  const displayedQuranMatches = useMemo(() => {
    if (isIdentical) {
      if (quranFilter === 'noorani') return matchesMashriqi.filter((m) => m.isNooraniOnly);
      return matchesMashriqi;
    }

    if (quranFilter === 'mashriqi') return matchesMashriqi;
    if (quranFilter === 'maghribi') return matchesMaghribi;
    if (quranFilter === 'noorani') {
      const mashNoorani = matchesMashriqi.filter((m) => m.isNooraniOnly);
      const magNoorani = matchesMaghribi.filter((m) => m.isNooraniOnly);
      const seen = new Set<string>();
      const combined = [...mashNoorani];
      mashNoorani.forEach((m) => seen.add(m.text));
      magNoorani.forEach((m) => {
        if (!seen.has(m.text)) combined.push(m);
      });
      return combined;
    }

    // Default 'all' for differing values: Combine matches with unique texts
    const seen = new Set<string>();
    const combined: typeof matchesMashriqi = [];
    matchesMashriqi.forEach((m) => {
      seen.add(m.text);
      combined.push(m);
    });
    matchesMaghribi.forEach((m) => {
      if (!seen.has(m.text)) {
        seen.add(m.text);
        combined.push(m);
      }
    });
    return combined;
  }, [isIdentical, quranFilter, matchesMashriqi, matchesMaghribi]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  if (!cleanWord || (mashriqiValue <= 0 && maghribiValue <= 0)) {
    return null;
  }

  // Count formulas for badges
  const mashCount = mergedNooraniFormulas.filter((f) => f.system === 'mashriqi' || f.system === 'both' || f.system === 'dual_match').length;
  const magCount = mergedNooraniFormulas.filter((f) => f.system === 'maghribi' || f.system === 'both' || f.system === 'dual_match').length;

  return (
    <div
      id="gematria-results-card"
      className="bg-white dark:bg-stone-900 rounded-xl p-3 shadow-2xs space-y-2.5 transition-all duration-300 border border-emerald-500/80 shadow-xs ring-2 ring-emerald-500/10 dark:ring-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/10"
    >
      {/* 1. Header: Title, Merged Badges & Model Switcher */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-1.5 flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs shadow-2xs">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-sans">
            حساب الجُمَّل
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Model Selector for custom tables */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-1.5 py-0.5 rounded text-3xs font-normal bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors inline-flex items-center gap-0.5 cursor-pointer border border-stone-200 dark:border-stone-700"
              title="تغيير النموذج النشط"
            >
              <span className="text-2xs">النموذج:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
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
                      ? 'الشرقي'
                      : tbl.id === 'maghribi'
                      ? 'المغربي'
                      : tbl.name.replace(/\(.*\)/, '').replace('النموذج', '').trim();
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setActiveTableId(tbl.id);
                        setShowModelPicker(false);
                      }}
                      className={`w-full text-right px-2 py-1 rounded-md text-3xs font-medium transition-all flex items-center justify-between cursor-pointer ${
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

          {onNavigateToGematria && (
            <button
              type="button"
              onClick={() => onNavigateToGematria(cleanWord)}
              className="p-1 rounded text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
              title="الانتقال إلى واجهة الجُمَّل الموسعة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Standardized Summary Strip: Letter Cards with Numbers, +, =, and Highlighted Total */}
      <div className="space-y-1.5">
        {isIdentical ? (
          /* Case A: Identical values between Mashriqi & Maghribi */
          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-quran font-bold text-xs text-emerald-950 dark:text-emerald-200 shrink-0">
                {cleanWord}
              </span>
              <span className="text-stone-400 font-mono font-normal select-none">:</span>

              {/* Letter Breakdown */}
              {!isDirectNumber && breakdownMashriqi.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {breakdownMashriqi.map((item, idx) => {
                    const layer = findLayerForChar(item.char);
                    const layerNum = layer ? layer.layer : 0;
                    const color = LAYER_RAINBOW_COLORS[layerNum] || {
                      name: 'زمردي',
                      activeBg: 'bg-emerald-600',
                      activeText: 'text-white',
                      activeBorder: 'border-emerald-700',
                    };

                    return (
                      <React.Fragment key={`breakdown_ident_${idx}`}>
                        <div
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                          title={`الحرف [${item.char}] = ${item.value}`}
                        >
                          <span
                            className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                          >
                            {item.char}
                          </span>
                          <span className="h-5 min-w-[20px] px-1 rounded font-mono font-normal text-xs flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs">
                            {item.value}
                          </span>
                        </div>
                        {idx < breakdownMashriqi.length - 1 && (
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
                </div>
              )}
            </div>

            {/* Total Value Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const q = encodeURIComponent(`ما هي قواسم العدد ${mashriqiValue}`);
                window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
              }}
              className="h-6 min-w-[34px] px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border border-emerald-700 cursor-pointer transition-transform active:scale-95"
              title={`المجموع: ${mashriqiValue} - انقر للبحث عن قواسم العدد في جوجل`}
            >
              <span>{mashriqiValue}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </button>
          </div>
        ) : (
          /* Case B: Differing values between Mashriqi & Maghribi */
          <div className="space-y-1.5">
            {/* 1. Mashriqi Strip (Sky/Blue Theme) */}
            <div className="px-2.5 py-1.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800/80 flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-quran font-bold text-xs text-sky-950 dark:text-sky-200 shrink-0">
                  {cleanWord}
                </span>
                <span className="text-stone-400 font-mono select-none">:</span>

                {!isDirectNumber && breakdownMashriqi.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {breakdownMashriqi.map((item, idx) => {
                      const isDiff = differingLetters.has(item.char);
                      return (
                        <React.Fragment key={`breakdown_mash_${idx}`}>
                          <div
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border shadow-2xs text-xs ${
                              isDiff
                                ? 'bg-sky-100/90 dark:bg-sky-900/60 border-sky-400 dark:border-sky-600 ring-1 ring-sky-400/50'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                            }`}
                            title={`الحرف [${item.char}] = ${item.value} بالمشرقي ${isDiff ? '(يختلف عن المغربي)' : ''}`}
                          >
                            <span
                              className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${
                                isDiff ? 'bg-sky-600 text-white font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.char}
                            </span>
                            <span
                              className={`h-5 min-w-[20px] px-1 rounded font-mono font-medium text-xs flex items-center justify-center shrink-0 ${
                                isDiff ? 'bg-sky-200/80 dark:bg-sky-950 text-sky-950 dark:text-sky-100 font-bold' : 'bg-stone-100 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                          {idx < breakdownMashriqi.length - 1 && (
                            <span className="text-stone-400 font-mono text-xs px-0.5 select-none">+</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <span className="text-stone-400 font-mono text-xs px-0.5 select-none">=</span>
                  </div>
                )}
              </div>

              {/* Total Mashriqi Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const q = encodeURIComponent(`ما هي قواسم العدد ${mashriqiValue}`);
                  window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
                }}
                className="h-6 min-w-[34px] px-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border border-sky-700 cursor-pointer transition-transform active:scale-95"
                title={`المجموع المشرقي: ${mashriqiValue} - انقر للبحث عن قواسمه في جوجل`}
              >
                <span>{mashriqiValue}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>

            {/* 2. Maghribi Strip (Amber/Orange Theme) */}
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-quran font-bold text-xs text-amber-950 dark:text-amber-200 shrink-0">
                  {cleanWord}
                </span>
                <span className="text-stone-400 font-mono select-none">:</span>

                {!isDirectNumber && breakdownMaghribi.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {breakdownMaghribi.map((item, idx) => {
                      const isDiff = differingLetters.has(item.char);
                      return (
                        <React.Fragment key={`breakdown_mag_${idx}`}>
                          <div
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border shadow-2xs text-xs ${
                              isDiff
                                ? 'bg-amber-100/90 dark:bg-amber-900/60 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/50'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                            }`}
                            title={`الحرف [${item.char}] = ${item.value} بالمغربي ${isDiff ? '(يختلف عن المشرقي)' : ''}`}
                          >
                            <span
                              className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${
                                isDiff ? 'bg-amber-600 text-white font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.char}
                            </span>
                            <span
                              className={`h-5 min-w-[20px] px-1 rounded font-mono font-medium text-xs flex items-center justify-center shrink-0 ${
                                isDiff ? 'bg-amber-200/80 dark:bg-amber-950 text-amber-950 dark:text-amber-100 font-bold' : 'bg-stone-100 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                          {idx < breakdownMaghribi.length - 1 && (
                            <span className="text-stone-400 font-mono text-xs px-0.5 select-none">+</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <span className="text-stone-400 font-mono text-xs px-0.5 select-none">=</span>
                  </div>
                )}
              </div>

              {/* Total Maghribi Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const q = encodeURIComponent(`ما هي قواسم العدد ${maghribiValue}`);
                  window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
                }}
                className="h-6 min-w-[34px] px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border border-amber-700 cursor-pointer transition-transform active:scale-95"
                title={`المجموع المغربي: ${maghribiValue} - انقر للبحث عن قواسمه في جوجل`}
              >
                <span>{maghribiValue}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Merged & Colorized Noorani Formulas Preview Row (صيغ الأحرف المقطعة) */}
      {(mergedNooraniFormulas.length > 0 || isNooraniCalculating || isNooraniCancelled) && (
        <div className="p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/70 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-1 text-2xs font-normal">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-emerald-900 dark:text-emerald-200 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>صيغ وتراكيب الأحرف المقطعة ({mergedNooraniFormulas.length})</span>
              </div>

              {/* System Filter Buttons for formulas */}
              {!isIdentical && (
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-850 p-0.5 rounded text-3xs font-medium">
                  <button
                    type="button"
                    onClick={() => setNooraniSystemFilter('all')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      nooraniSystemFilter === 'all'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    الكل المدمج ({mergedNooraniFormulas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNooraniSystemFilter('mashriqi')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                      nooraniSystemFilter === 'mashriqi'
                        ? 'bg-sky-600 text-white shadow-2xs font-bold'
                        : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/50'
                    }`}
                    title={`صيغ النظام المشرقي التي تعادل المجموع ${mashriqiValue}`}
                  >
                    <span>مشرقي</span>
                    <span className="font-mono text-3xs">({mashCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNooraniSystemFilter('maghribi')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                      nooraniSystemFilter === 'maghribi'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                    }`}
                    title={`صيغ النظام المغربي التي تعادل المجموع ${maghribiValue}`}
                  >
                    <span>مغربي</span>
                    <span className="font-mono text-3xs">({magCount})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Repeat Filter Button */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUniqueNooraniOnly(!uniqueNooraniOnly)}
                className={`p-1 rounded text-3xs font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                  uniqueNooraniOnly
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
                title={uniqueNooraniOnly ? 'تصفية دون تكرار (مفعل)' : 'السماح بالتكرار'}
              >
                <Repeat className="w-2.5 h-2.5" />
                <span className="text-3xs hidden sm:inline">{uniqueNooraniOnly ? 'دون تكرار' : 'بالتكرار'}</span>
              </button>
            </div>
          </div>

          {/* 5 Specialized Algorithm Selector Buttons & Quranic Sort */}
          <div className="flex items-center justify-between gap-1 flex-wrap py-1 border-y border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-100/30 dark:bg-emerald-950/20 px-1 rounded-md">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
              <span className="text-3xs text-stone-500 dark:text-stone-400 font-sans font-medium shrink-0 ml-1">
                الخوارزمية:
              </span>
              {NOORANI_ALGORITHMS.map((algo) => {
                const isSelected = selectedAlgorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => setSelectedAlgorithm(algo.id)}
                    className={`px-2 py-0.5 rounded-md text-3xs font-medium cursor-pointer transition-all border flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                        : 'bg-white dark:bg-stone-850 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                    }`}
                    title={algo.description}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                        isSelected
                          ? 'bg-white text-emerald-800'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isSelected && isNooraniCalculating ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-800" />
                      ) : (
                        algo.id
                      )}
                    </span>
                    <span>{algo.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSortByQuranicMatch(!sortByQuranicMatch)}
              className={`px-2 py-0.5 rounded-md text-3xs font-medium cursor-pointer transition-all border flex items-center gap-1 shrink-0 ${
                sortByQuranicMatch
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-2xs font-bold'
                  : 'bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
              }`}
              title="ترتيب النتائج بحسب الأكثر تطابقاً مع سور المصحف الشريف"
            >
              <Star className="w-2.5 h-2.5 fill-current" />
              <span>الأكثر مطابقة للمصحف</span>
            </button>
          </div>

          {/* Real-time Progress & Cancellation Bar */}
          <NooraniProcessingBar
            isCalculating={isNooraniCalculating}
            progress={nooraniProgress}
            statusMessage={nooraniProgressMessage}
            currentAlgorithm={activeNooraniAlgorithmMeta}
            onCancel={cancelNooraniCalculation}
            onRetry={retryNooraniCalculation}
            wasCancelled={isNooraniCancelled}
            resultCount={mergedNooraniFormulas.length}
          />

          {/* 29 Quranic Surah Openings Sequence Strip */}
          <div className="p-2 rounded-lg bg-stone-50/90 dark:bg-stone-900/80 border border-stone-200/90 dark:border-stone-800 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-1 text-3xs font-medium">
              <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 flex-wrap">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span>مصحف السور الـ 29</span>
                  <span className="text-4xs font-mono px-1 py-0.2 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    (بالترتيب والتكرار القرآني)
                  </span>
                </span>
                {activeFormula ? (
                  <span className="text-stone-700 dark:text-stone-200 flex items-center gap-1.5 font-sans">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                      • المطابقة: {activeSurahOrdersSet.size} من 29 سورة
                    </span>
                    <span className="font-quran font-bold text-emerald-800 dark:text-emerald-300">
                      «{activeFormula.formula}»
                    </span>
                    {selectedFormulaKey === activeFormula.key && (
                      <button
                        type="button"
                        onClick={() => setSelectedFormulaKey(null)}
                        className="text-4xs px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-750 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                        title="إلغاء التثبيت"
                      >
                        إلغاء التثبيت ✕
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-stone-400 text-3xs font-sans">
                    (انقر على أي تركيبة أدناه لتلوين سورها في المصحف فوراً - النقر مجدداً يلغي التحديد)
                  </span>
                )}
              </div>

              {filterSurahOrder !== null && (
                <button
                  type="button"
                  onClick={() => setFilterSurahOrder(null)}
                  className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-pointer font-sans font-medium flex items-center gap-1 text-4xs"
                >
                  <span>تصفية سورة #{filterSurahOrder}</span>
                  <span>✕</span>
                </button>
              )}
            </div>

            {/* The 29 Gray / Glowing Squares Track */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 px-0.5 [scrollbar-width:thin] border border-stone-200/60 dark:border-stone-800 rounded bg-white dark:bg-stone-950/40">
              {QURANIC_29_SURAH_FAWATIH.map((surah) => {
                const isMatched = activeSurahOrdersSet.has(surah.orderInFawatih);
                const isFiltered = filterSurahOrder === surah.orderInFawatih;

                return (
                  <button
                    key={surah.orderInFawatih}
                    type="button"
                    onClick={() => setFilterSurahOrder(isFiltered ? null : surah.orderInFawatih)}
                    className={`relative shrink-0 flex flex-col items-center justify-center p-1 rounded transition-colors duration-150 cursor-pointer min-w-[50px] text-center border ${
                      isMatched
                        ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/80 z-10 font-bold opacity-100'
                        : 'bg-stone-100 dark:bg-stone-850/80 border-stone-200 dark:border-stone-750 text-stone-500 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-800 opacity-60 hover:opacity-100'
                    } ${isFiltered ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/60 opacity-100' : ''}`}
                    title={`#${surah.orderInFawatih}: سورة ${surah.surahName} (${surah.surahNumber}) - الفاتحة: ${surah.formula} - ${surah.familyLabel} ${
                      isMatched ? '⭐ متطابقة مع التركيبة المحددة!' : ''
                    } - انقر للتصفية`}
                  >
                    <div className="flex items-center justify-between w-full text-[8px] font-mono leading-none mb-0.5 px-0.5">
                      <span className={isMatched ? 'text-emerald-100' : 'text-stone-400 dark:text-stone-500'}>
                        #{surah.orderInFawatih}
                      </span>
                      <span className={isMatched ? 'text-amber-200 font-bold' : 'text-stone-400 dark:text-stone-500'}>
                        {surah.surahNumber}
                      </span>
                    </div>

                    <div className="text-xs font-quran font-bold leading-tight">
                      {surah.formula}
                    </div>

                    <div className={`text-[8.5px] truncate max-w-[46px] font-sans mt-0.5 ${isMatched ? 'text-white' : 'text-stone-600 dark:text-stone-400'}`}>
                      {surah.surahName}
                    </div>

                    {isMatched && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulas Chips Grid with Color Coding */}
          <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-0.5">
            {displayedNooraniFormulas.map((n) => {
              const isCopied = copiedText === `noorani_${n.key}`;
              const isActive = activeFormula?.key === n.key;

              // Determine visual styling based on system and authenticity
              let chipStyle = '';

              if (n.system === 'both') {
                chipStyle = 'bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:border-emerald-500 hover:bg-emerald-100/70';
              } else if (n.system === 'dual_match') {
                chipStyle = 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 hover:border-indigo-500 hover:bg-indigo-100/70';
              } else if (n.system === 'mashriqi') {
                chipStyle = 'bg-sky-50/90 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100 hover:border-sky-500 hover:bg-sky-100/70';
              } else {
                chipStyle = 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:border-amber-500 hover:bg-amber-100/70';
              }

              if (isActive) {
                chipStyle += ' ring-2 ring-emerald-600 dark:ring-emerald-400 shadow-sm font-bold bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 dark:border-emerald-400';
              }

              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => {
                    setSelectedFormulaKey(selectedFormulaKey === n.key ? null : n.key);
                    if (onSelectWord) {
                      onSelectWord(n.formula);
                    } else {
                      handleCopy(n.formula, `noorani_${n.key}`);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg border text-xs font-quran flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${chipStyle}`}
                  title={`الصيغة: ${n.formula} | الحساب: ${n.displaySum} | تفكيك الحروف: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} ${n.description ? `| ${n.description}` : ''} - انقر لتلوين السور المطابقة في شريط المصحف ونسخ التركيبة`}
                >
                  <span className="font-bold">{n.formula}</span>
                  {n.isAuthenticQuranicFawatih && (
                    <span className="text-3xs text-amber-500" title="فاتحة سورة قرآنية أصيلة">⭐</span>
                  )}
                  <span className="font-mono text-4xs font-semibold opacity-75">
                    ({n.displaySum})
                  </span>
                  {n.surahOrders && n.surahOrders.length > 0 && (
                    <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-stone-600 dark:text-stone-300 font-bold" title="عدد السور المطابقة في فواتح المصحف الـ 29">
                      {n.surahOrders.length} سورة
                    </span>
                  )}
                  {isCopied && <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Quranic Words Matches Filter and Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-2xs font-semibold text-stone-700 dark:text-stone-300 font-sans">
              مفردات قرآنية مطابقة ({displayedQuranMatches.length})
            </h4>
          </div>

          {/* Minimal Filter Tabs (الكل / شرقي / غربي / نورانية) */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded text-3xs font-medium">
              <button
                type="button"
                onClick={() => setQuranFilter('all')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                الكل
              </button>

              {!isIdentical && (
                <>
                  <button
                    type="button"
                    onClick={() => setQuranFilter('mashriqi')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      quranFilter === 'mashriqi'
                        ? 'bg-sky-600 text-white shadow-2xs font-bold'
                        : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                    }`}
                    title={`مفردات مطابقة لوزن المشرقي (= ${mashriqiValue})`}
                  >
                    شرقي ({matchesMashriqi.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuranFilter('maghribi')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      quranFilter === 'maghribi'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                    }`}
                    title={`مفردات مطابقة لوزن المغربي (= ${maghribiValue})`}
                  >
                    غربي ({matchesMaghribi.length})
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setQuranFilter('noorani')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'noorani'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                }`}
              >
                نورانية
              </button>
            </div>
          </div>
        </div>

        {/* Standardized Quranic Matches Grid */}
        {displayedQuranMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-0.5">
            {displayedQuranMatches.map((item, idx) => {
              const qMeta = item.quranicMeta;
              const isCopied = copiedText === `gem_m_${idx}`;
              const quranUrl = getQuranTopWordUrl(
                item.text,
                qMeta?.surahName || '',
                qMeta?.ayahNum || 1,
                qMeta?.occurrences || 1
              );

              // Check which system match belongs to
              const isMash = item.gematriaValue === mashriqiValue;
              const isMag = item.gematriaValue === maghribiValue;

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
                      className="text-xs font-medium font-quran text-emerald-950 dark:text-emerald-100 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline leading-tight"
                      title={`البحث عن [${item.text}] في المصحف`}
                    >
                      {item.text}
                    </a>

                    {/* Surah Name link that searches for the word in the Quran */}
                    {qMeta?.surahName && (
                      <a
                        href={quranUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-4xs px-1 rounded font-sans text-stone-500 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-0.5"
                        title={`البحث عن «${item.text}» في سورة ${qMeta.surahName} والمصحف الشريف (qran-top)`}
                      >
                        <span>({qMeta.surahName}{qMeta.ayahNum ? `:${qMeta.ayahNum}` : ''})</span>
                      </a>
                    )}

                    {/* Small System Origin Tag if different */}
                    {!isIdentical && (
                      <span
                        className={`text-4xs px-1 rounded font-sans font-medium ${
                          isMash && isMag
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                            : isMash
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                        }`}
                      >
                        {isMash && isMag ? 'مشترك' : isMash ? 'شرقي' : 'غربي'}
                      </span>
                    )}

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
                      systemName={`جُمَّل (${isMash && isMag ? 'شرقي وغربي' : isMash ? 'شرقي' : 'غربي'})`}
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
