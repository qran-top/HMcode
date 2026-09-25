import React, { useState, useMemo } from 'react';
import { useGematria, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import { findNooraniCombinations } from '../utils/gematriaEngine';
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

  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(true);
  const [nooraniSystemFilter, setNooraniSystemFilter] = useState<'all' | 'mashriqi' | 'maghribi'>('all');
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

  // 2. Noorani Combinations (صيغ الحروف المقطعة) for both Mashriqi and Maghribi
  const nooraniFormulasMashriqi = useMemo(() => {
    if (!mashriqiValue || mashriqiValue <= 0) return [];
    return findNooraniCombinations(mashriqiValue, MASHRIQI_VALUES, {
      maxResults: 60,
      uniqueLettersOnly: uniqueNooraniOnly,
    });
  }, [mashriqiValue, uniqueNooraniOnly]);

  const nooraniFormulasMaghribi = useMemo(() => {
    if (!maghribiValue || maghribiValue <= 0) return [];
    if (isIdentical) return [];
    return findNooraniCombinations(maghribiValue, MAGHRIBI_VALUES, {
      maxResults: 60,
      uniqueLettersOnly: uniqueNooraniOnly,
    });
  }, [maghribiValue, isIdentical, uniqueNooraniOnly]);

  // 3. Merged Noorani Formulas with distinct color metadata
  const mergedNooraniFormulas = useMemo(() => {
    if (isIdentical) {
      return nooraniFormulasMashriqi.map((item, idx) => ({
        key: `both_${idx}_${item.formula}`,
        formula: item.formula,
        system: 'both' as const,
        isAuthenticQuranicFawatih: item.isAuthenticQuranicFawatih,
        sum: item.sum,
        letters: item.letters,
        values: item.values,
        description: item.description,
      }));
    }

    const items: MergedNooraniFormulaItem[] = [];
    const seenMash = new Set<string>();

    nooraniFormulasMashriqi.forEach((item, idx) => {
      seenMash.add(item.formula);
      items.push({
        key: `mash_${idx}_${item.formula}`,
        formula: item.formula,
        system: 'mashriqi',
        isAuthenticQuranicFawatih: item.isAuthenticQuranicFawatih,
        sum: item.sum,
        letters: item.letters,
        values: item.values,
        description: item.description,
      });
    });

    nooraniFormulasMaghribi.forEach((item, idx) => {
      items.push({
        key: `mag_${idx}_${item.formula}`,
        formula: item.formula,
        system: 'maghribi',
        isAuthenticQuranicFawatih: item.isAuthenticQuranicFawatih,
        sum: item.sum,
        letters: item.letters,
        values: item.values,
        description: item.description,
      });
    });

    // Sort authentic fawatih first
    return items.sort((a, b) => {
      if (a.isAuthenticQuranicFawatih && !b.isAuthenticQuranicFawatih) return -1;
      if (!a.isAuthenticQuranicFawatih && b.isAuthenticQuranicFawatih) return 1;
      return 0;
    });
  }, [isIdentical, nooraniFormulasMashriqi, nooraniFormulasMaghribi]);

  // Filtered Noorani formulas based on system selection
  const displayedNooraniFormulas = useMemo(() => {
    if (nooraniSystemFilter === 'mashriqi') {
      return mergedNooraniFormulas.filter((f) => f.system === 'mashriqi' || f.system === 'both');
    }
    if (nooraniSystemFilter === 'maghribi') {
      return mergedNooraniFormulas.filter((f) => f.system === 'maghribi' || f.system === 'both');
    }
    return mergedNooraniFormulas;
  }, [nooraniSystemFilter, mergedNooraniFormulas]);

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
  const mashCount = isIdentical ? mergedNooraniFormulas.length : nooraniFormulasMashriqi.length;
  const magCount = isIdentical ? mergedNooraniFormulas.length : nooraniFormulasMaghribi.length;

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
            الجُمَّل المدمج
          </h3>

          {/* System Indicator Pill Badges */}
          <div className="flex items-center gap-1 text-3xs font-medium">
            <span
              className="px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/80"
              title="نظام الجُمَّل الشرقي (سعفص)"
            >
              مشرقي
            </span>
            <span className="text-stone-400 font-sans">+</span>
            <span
              className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80"
              title="نظام الجُمَّل المغربي (صعفض)"
            >
              مغربي
            </span>

            {isIdentical ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-sans">
                متطابق
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-sans inline-flex items-center gap-0.5">
                <ArrowLeftRight className="w-2.5 h-2.5" />
                <span>متباين</span>
              </span>
            )}
          </div>
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
                      ? 'الشرقي الشائع (سعفص)'
                      : tbl.id === 'maghribi'
                      ? 'المغربي التاريخي (صعفض)'
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
              <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-emerald-600 text-white shadow-2xs">
                متطابق (شرقي وغربي)
              </span>
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
                <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-sky-600 text-white shadow-2xs">
                  شرقي (سعفص)
                </span>
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
                <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-amber-600 text-white shadow-2xs">
                  غربي (صعفض)
                </span>
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

            {/* Difference Insight Banner */}
            {differingLetters.size > 0 && (
              <div className="text-3xs text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded bg-stone-100/70 dark:bg-stone-800/50 flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-rose-600 dark:text-rose-400">فارق الحساب:</span>
                <span>الحروف المتباينة في الكلمة:</span>
                {Array.from(differingLetters).map((char) => (
                  <span
                    key={`diff_badge_${char}`}
                    className="font-bold font-quran px-1 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    ({char}: {char === 'س' ? 'مشرقي 60 / مغربي 300' : char === 'ص' ? 'مشرقي 90 / مغربي 60' : char === 'ض' ? 'مشرقي 800 / مغربي 90' : char === 'ش' ? 'مشرقي 300 / مغربي 1000' : char === 'ظ' ? 'مشرقي 900 / مغربي 800' : 'مشرقي 1000 / مغربي 900'})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Merged & Colorized Noorani Formulas Preview Row (صيغ الأحرف المقطعة) */}
      {mergedNooraniFormulas.length > 0 && (
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

          {/* Formulas Chips Grid with Color Coding */}
          <div className="flex items-center gap-1 flex-wrap max-h-36 overflow-y-auto pr-0.5">
            {displayedNooraniFormulas.map((n, i) => {
              const isCopied = copiedText === `noorani_${n.key}`;

              // Determine visual styling based on system and authenticity
              let chipStyle = 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-200 dark:border-stone-700';
              let badgeText = '';
              let badgeColor = '';

              if (n.isAuthenticQuranicFawatih) {
                chipStyle = 'bg-emerald-600 text-white hover:bg-emerald-700 ring-1 ring-emerald-400 font-semibold';
              } else if (n.system === 'mashriqi') {
                chipStyle = 'bg-sky-50/90 dark:bg-sky-950/60 text-sky-950 dark:text-sky-100 border border-sky-300 dark:border-sky-700 hover:border-sky-500 hover:bg-sky-100';
                badgeText = 'شرقي';
                badgeColor = 'bg-sky-200 dark:bg-sky-850 text-sky-800 dark:text-sky-200';
              } else if (n.system === 'maghribi') {
                chipStyle = 'bg-amber-50/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 hover:border-amber-500 hover:bg-amber-100';
                badgeText = 'غربي';
                badgeColor = 'bg-amber-200 dark:bg-amber-850 text-amber-800 dark:text-amber-200';
              } else if (n.system === 'both') {
                chipStyle = 'bg-teal-50/90 dark:bg-teal-950/60 text-teal-950 dark:text-teal-100 border border-teal-300 dark:border-teal-700 hover:border-teal-500 hover:bg-teal-100';
                badgeText = 'مشترك';
                badgeColor = 'bg-teal-200 dark:bg-teal-850 text-teal-800 dark:text-teal-200';
              }

              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => {
                    if (onSelectWord) {
                      onSelectWord(n.formula);
                    } else {
                      handleCopy(n.formula, `noorani_${n.key}`);
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded text-xs font-quran flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${chipStyle}`}
                  title={`الصيغة: ${n.formula} | النظام: ${n.system === 'mashriqi' ? 'مشرقي' : n.system === 'maghribi' ? 'مغربي' : 'مشترك'} | التفكيك: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} = ${n.sum} ${n.description ? `(${n.description})` : ''} - انقر للنسخ أو البحث`}
                >
                  <span className="font-semibold">{n.formula}</span>
                  {n.isAuthenticQuranicFawatih ? (
                    <span className="text-3xs" title="فاتحة سورة قرآنية أصيلة">⭐</span>
                  ) : badgeText ? (
                    <span className={`text-4xs px-1 rounded font-sans font-medium select-none ${badgeColor}`}>
                      {badgeText}
                    </span>
                  ) : null}
                  {isCopied && <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
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
