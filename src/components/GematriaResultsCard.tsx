import React, { useState, useMemo } from 'react';
import { useGematria, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
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
  Sparkles,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';

interface GematriaResultsCardProps {
  word?: string;
  query?: string;
  onNavigateToGematria?: (text: string) => void;
  onNavigateToMatcher?: (text: string) => void;
  onSelectWord?: (word: string) => void;
}

export function GematriaResultsCard({
  word,
  query,
  onNavigateToGematria,
  onNavigateToMatcher,
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

  const [quranFilter, setQuranFilter] = useState<'all' | 'mashriqi' | 'maghribi' | 'jafr' | 'bayat' | 'noorani'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const cleanWord = useMemo(() => (word || query || '').trim(), [word, query]);
  const isDirectNumber = useMemo(() => /^[0-9]+$/.test(cleanWord), [cleanWord]);

  // 1. Quad Gematria calculations: Mashriqi (شرقي), Maghribi (غربي), Jafr (جفر), and Bayat (بيات)
  const mashriqiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const maghribiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const jafrValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'jafr');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const bayatValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'bayat');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const isIdentical = mashriqiValue === maghribiValue && mashriqiValue === jafrValue && mashriqiValue === bayatValue;

  // Breakdown of letters for all 4 systems
  const breakdownMashriqi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownMaghribi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownJafr = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'jafr');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownBayat = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'bayat');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  // Letters that differ between systems in this word
  const differingLetters = useMemo(() => {
    if (isIdentical || isDirectNumber || !cleanWord) return new Set<string>();
    const diff = new Set<string>();
    for (let i = 0; i < breakdownMashriqi.length; i++) {
      const char = breakdownMashriqi[i]?.char;
      const mashVal = breakdownMashriqi[i]?.value;
      const magVal = breakdownMaghribi[i]?.value;
      const jafrVal = breakdownJafr[i]?.value;
      const bayatVal = breakdownBayat[i]?.value;
      if ((mashVal !== magVal || mashVal !== jafrVal || mashVal !== bayatVal) && char) {
        diff.add(char);
      }
    }
    return diff;
  }, [isIdentical, isDirectNumber, cleanWord, breakdownMashriqi, breakdownMaghribi, breakdownJafr, breakdownBayat]);

  // 4. Quranic Words Matches
  const matchesMashriqi = useMemo(() => {
    if (!mashriqiValue || mashriqiValue <= 0) return [];
    return findQuranicMatches(mashriqiValue, { filterType: 'all', maxResults: 100 });
  }, [mashriqiValue, findQuranicMatches]);

  const matchesMaghribi = useMemo(() => {
    if (!maghribiValue || maghribiValue <= 0 || isIdentical) return [];
    return findQuranicMatches(maghribiValue, { filterType: 'all', maxResults: 100 });
  }, [maghribiValue, isIdentical, findQuranicMatches]);

  const matchesJafr = useMemo(() => {
    if (!jafrValue || jafrValue <= 0 || isIdentical) return [];
    return findQuranicMatches(jafrValue, { filterType: 'all', maxResults: 100 });
  }, [jafrValue, isIdentical, findQuranicMatches]);

  const matchesBayat = useMemo(() => {
    if (!bayatValue || bayatValue <= 0 || isIdentical) return [];
    return findQuranicMatches(bayatValue, { filterType: 'all', maxResults: 100 });
  }, [bayatValue, isIdentical, findQuranicMatches]);

  // Merged Quranic matches list with system origin tags
  const displayedQuranMatches = useMemo(() => {
    if (isIdentical) {
      if (quranFilter === 'noorani') return matchesMashriqi.filter((m) => m.isNooraniOnly);
      return matchesMashriqi;
    }

    if (quranFilter === 'mashriqi') return matchesMashriqi;
    if (quranFilter === 'maghribi') return matchesMaghribi;
    if (quranFilter === 'jafr') return matchesJafr;
    if (quranFilter === 'bayat') return matchesBayat;
    if (quranFilter === 'noorani') {
      const mashNoorani = matchesMashriqi.filter((m) => m.isNooraniOnly);
      const magNoorani = matchesMaghribi.filter((m) => m.isNooraniOnly);
      const jafrNoorani = matchesJafr.filter((m) => m.isNooraniOnly);
      const bayatNoorani = matchesBayat.filter((m) => m.isNooraniOnly);
      const seen = new Set<string>();
      const combined = [...mashNoorani];
      mashNoorani.forEach((m) => seen.add(m.text));
      magNoorani.forEach((m) => {
        if (!seen.has(m.text)) {
          seen.add(m.text);
          combined.push(m);
        }
      });
      jafrNoorani.forEach((m) => {
        if (!seen.has(m.text)) {
          seen.add(m.text);
          combined.push(m);
        }
      });
      bayatNoorani.forEach((m) => {
        if (!seen.has(m.text)) {
          seen.add(m.text);
          combined.push(m);
        }
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
    matchesJafr.forEach((m) => {
      if (!seen.has(m.text)) {
        seen.add(m.text);
        combined.push(m);
      }
    });
    return combined;
  }, [isIdentical, quranFilter, matchesMashriqi, matchesMaghribi, matchesJafr]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  if (!cleanWord || (mashriqiValue <= 0 && maghribiValue <= 0)) {
    return null;
  }



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

            {/* 3. Jafr Strip (Fuchsia/Purple Theme) */}
            <div className="px-2.5 py-1.5 rounded-lg bg-fuchsia-50/70 dark:bg-fuchsia-950/30 border border-fuchsia-300 dark:border-fuchsia-800/80 flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-quran font-bold text-xs text-fuchsia-950 dark:text-fuchsia-200 shrink-0">
                  {cleanWord} (جفر)
                </span>
                <span className="text-stone-400 font-mono select-none">:</span>

                {!isDirectNumber && breakdownJafr.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {breakdownJafr.map((item, idx) => {
                      const isDiff = differingLetters.has(item.char);
                      return (
                        <React.Fragment key={`breakdown_jafr_${idx}`}>
                          <div
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border shadow-2xs text-xs ${
                              isDiff
                                ? 'bg-fuchsia-100/90 dark:bg-fuchsia-900/60 border-fuchsia-400 dark:border-fuchsia-600 ring-1 ring-fuchsia-400/50'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                            }`}
                            title={`الحرف [${item.char}] = ${item.value} بالجفر (بسط الحروف)`}
                          >
                            <span
                              className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${
                                isDiff ? 'bg-fuchsia-600 text-white font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.char}
                            </span>
                            <span
                              className={`h-5 min-w-[20px] px-1 rounded font-mono font-medium text-xs flex items-center justify-center shrink-0 ${
                                isDiff ? 'bg-fuchsia-200/80 dark:bg-fuchsia-950 text-fuchsia-950 dark:text-fuchsia-100 font-bold' : 'bg-stone-100 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                          {idx < breakdownJafr.length - 1 && (
                            <span className="text-stone-400 font-mono text-xs px-0.5 select-none">+</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <span className="text-stone-400 font-mono text-xs px-0.5 select-none">=</span>
                  </div>
                )}
              </div>

              {/* Total Jafr Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const q = encodeURIComponent(`ما هي قواسم العدد ${jafrValue}`);
                  window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
                }}
                className="h-6 min-w-[34px] px-2 rounded-md bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border border-fuchsia-700 cursor-pointer transition-transform active:scale-95"
                title={`المجموع بالجفر: ${jafrValue} - انقر للبحث عن قواسمه في جوجل`}
              >
                <span>{jafrValue}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>

            {/* 4. Bayat Strip (Teal Theme) */}
            <div className="px-2.5 py-1.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-800/80 flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-quran font-bold text-xs text-teal-950 dark:text-teal-200 shrink-0">
                  {cleanWord} (بيات)
                </span>
                <span className="text-stone-400 font-mono select-none">:</span>

                {!isDirectNumber && breakdownBayat.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {breakdownBayat.map((item, idx) => {
                      const isDiff = differingLetters.has(item.char);
                      return (
                        <React.Fragment key={`breakdown_bayat_${idx}`}>
                          <div
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border shadow-2xs text-xs ${
                              isDiff
                                ? 'bg-teal-100/90 dark:bg-teal-900/60 border-teal-400 dark:border-teal-600 ring-1 ring-teal-400/50'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                            }`}
                            title={`الحرف [${item.char}] = ${item.value} بحساب البيات المخصوص`}
                          >
                            <span
                              className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${
                                isDiff ? 'bg-teal-600 text-white font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.char}
                            </span>
                            <span
                              className={`h-5 min-w-[20px] px-1 rounded font-mono font-medium text-xs flex items-center justify-center shrink-0 ${
                                isDiff ? 'bg-teal-200/80 dark:bg-teal-950 text-teal-950 dark:text-teal-100 font-bold' : 'bg-stone-100 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                          {idx < breakdownBayat.length - 1 && (
                            <span className="text-stone-400 font-mono text-xs px-0.5 select-none">+</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <span className="text-stone-400 font-mono text-xs px-0.5 select-none">=</span>
                  </div>
                )}
              </div>

              {/* Total Bayat Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const q = encodeURIComponent(`ما هي قواسم العدد ${bayatValue}`);
                  window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
                }}
                className="h-6 min-w-[34px] px-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border border-teal-700 cursor-pointer transition-transform active:scale-95"
                title={`المجموع بحساب البيات: ${bayatValue} - انقر للبحث عن قواسمه في جوجل`}
              >
                <span>{bayatValue}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link to Chain Matcher for Noorani Formulas if onNavigateToMatcher is provided */}
      {onNavigateToMatcher && cleanWord && (
        <button
          type="button"
          onClick={() => onNavigateToMatcher(cleanWord)}
          className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-2xs font-medium flex items-center justify-between cursor-pointer transition-colors shadow-2xs group"
          title="فتح مطابق السلاسل لاستكشاف صيغ وتراكيب الأحرف المقطعة ومصحف السور الـ 29"
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>صيغ وتراكيب الأحرف المقطعة ومصحف السور الـ 29</span>
          </span>
          <span className="flex items-center gap-1 text-3xs font-bold text-emerald-700 dark:text-emerald-300">
            <span>فتح في مطابق السلاسل</span>
            <span>←</span>
          </span>
        </button>
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
                  <button
                    type="button"
                    onClick={() => setQuranFilter('jafr')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      quranFilter === 'jafr'
                        ? 'bg-fuchsia-600 text-white shadow-2xs font-bold'
                        : 'text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100'
                    }`}
                    title={`مفردات مطابقة لوزن الجفر (= ${jafrValue})`}
                  >
                    جفر ({matchesJafr.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuranFilter('bayat')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      quranFilter === 'bayat'
                        ? 'bg-teal-600 text-white shadow-2xs font-bold'
                        : 'text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                    }`}
                    title={`مفردات مطابقة لوزن البيات (= ${bayatValue})`}
                  >
                    بيات ({matchesBayat.length})
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
