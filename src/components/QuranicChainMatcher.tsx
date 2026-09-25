import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Filter,
  XCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  History,
  Star,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  Info,
  Repeat,
} from 'lucide-react';
import { useGematria, MAGHRIBI_VALUES, MASHRIQI_VALUES } from '../context/GematriaContext';
import {
  parseNumericQuery,
  cleanArabicTextForGematria,
  calculateGematriaWithOptions,
  DEFAULT_GEMATRIA_OPTIONS,
  GematriaCalculationOptions,
  findNooraniCombinations,
  classifyAndMergeNooraniFormulas,
  MergedNooraniFormulaItem,
} from '../utils/gematriaEngine';
import {
  InverseQuranicScanner,
  InverseQuranicMatch,
  ScannerProgress,
} from '../utils/inverseQuranicMatcher';
import { getSurahMuqattaat } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { NOORANI_LETTERS_SET } from '../cipherData';
import { QuranicChainHistory, QuranicChainHistoryItem } from './QuranicChainHistory';

const STORAGE_KEY_CHAIN_HISTORY = 'quranic_chain_matcher_history';
const DEFAULT_CHAIN_SEARCHES: QuranicChainHistoryItem[] = [
  {
    id: 'init_1',
    query: 'كهيعص',
    timestamp: Date.now() - 1000 * 60 * 30,
    scope: 'all',
    onlyNoorani: false,
    targetMaghribi: 195,
    targetMashriqi: 195,
    isIdentical: true,
    matchesCount: 12,
    isFavorite: true,
  },
  {
    id: 'init_2',
    query: 'الم',
    timestamp: Date.now() - 1000 * 60 * 60,
    scope: 'all',
    onlyNoorani: false,
    targetMaghribi: 71,
    targetMashriqi: 71,
    isIdentical: true,
    matchesCount: 48,
    isFavorite: false,
  },
  {
    id: 'init_3',
    query: 'طسم',
    timestamp: Date.now() - 1000 * 60 * 120,
    scope: 'all',
    onlyNoorani: true,
    targetMaghribi: 109,
    targetMashriqi: 109,
    isIdentical: true,
    matchesCount: 19,
    isFavorite: false,
  },
  {
    id: 'init_4',
    query: 'سلام',
    timestamp: Date.now() - 1000 * 60 * 180,
    scope: 'single_words',
    onlyNoorani: false,
    targetMaghribi: 131,
    targetMashriqi: 131,
    isIdentical: true,
    matchesCount: 5,
    isFavorite: true,
  },
];

export function QuranicChainMatcher() {
  const { activeTable, calculationOptions } = useGematria();

  const [inputQuery, setInputQuery] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<'all' | 'verses_and_chains' | 'chains_only' | 'single_words'>('all');
  const [onlyNoorani, setOnlyNoorani] = useState<boolean>(false);
  const [isFilterUnique, setIsFilterUnique] = useState<boolean>(true);
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<'all' | 'common' | 'maghribi' | 'mashriqi'>('all');
  const [resultsFilter, setResultsFilter] = useState<string>('');

  // Noorani Formulas Filtering State
  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(false);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  const [matches, setMatches] = useState<InverseQuranicMatch[]>([]);
  const [progress, setProgress] = useState<ScannerProgress>({
    percent: 0,
    scannedCount: 0,
    totalCount: 0,
    matchesCount: 0,
    itemsPerSecond: 0,
    currentSurahOrPhase: 'جاهز للمسح المدمج',
    isRunning: false,
    isCompleted: false,
    isCancelled: false,
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const scannerRef = useRef<InverseQuranicScanner | null>(null);

  // Search History State (Loaded from localStorage)
  const [searchHistory, setSearchHistory] = useState<QuranicChainHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAIN_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading chain history:', e);
    }
    return DEFAULT_CHAIN_SEARCHES;
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Local Orthography & Scan Rules State
  const [localRules, setLocalRules] = useState<GematriaCalculationOptions>(() => ({
    ...(calculationOptions || DEFAULT_GEMATRIA_OPTIONS),
    daggerAlif: 'count_as_1',
    silentWawMode: 'count_as_6',
    uthmaniWawMode: 'as_waw_6',
    silentAlifMode: 'count_as_1',
  }));
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [flexibleOrthography, setFlexibleOrthography] = useState(true);

  // Computed Target Information (calculated only when user presses "ابدأ" or triggers scan)
  interface ComputedTargetInfo {
    isDirectNumber: boolean;
    targetMaghribi: number;
    targetMashriqi: number;
    isIdentical: boolean;
    alternateTargets: number[];
    queryText: string;
    cleanText: string;
    magBreakdown: { char: string; val: number }[];
    mashBreakdown: { char: string; val: number }[];
    isPureNoorani: boolean;
  }

  const [computedTarget, setComputedTarget] = useState<ComputedTargetInfo | null>(null);

  // Helper to compute target info on demand
  const computeTargetInfo = (text: string, rules: GematriaCalculationOptions, flexOrth: boolean): ComputedTargetInfo | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const numCheck = parseNumericQuery(trimmed);
    if (numCheck.isNumber) {
      return {
        isDirectNumber: true,
        targetMaghribi: numCheck.value,
        targetMashriqi: numCheck.value,
        isIdentical: true,
        alternateTargets: [] as number[],
        queryText: trimmed,
        cleanText: trimmed,
        magBreakdown: [],
        mashBreakdown: [],
        isPureNoorani: false,
      };
    }

    const clean = cleanArabicTextForGematria(trimmed);
    const magVal = calculateGematriaWithOptions(trimmed, rules, MAGHRIBI_VALUES);
    const mashVal = calculateGematriaWithOptions(trimmed, rules, MASHRIQI_VALUES);

    // Compute alternate targets when flexibleOrthography is enabled
    const altTargets: number[] = [];
    if (flexOrth) {
      // 1. Alternate dagger alif (حساب مع الألف الخنجرية وبدونها)
      const altDagger: GematriaCalculationOptions = {
        ...rules,
        daggerAlif: rules.daggerAlif === 'count_as_1' ? 'ignore_0' : 'count_as_1',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altDagger, MAGHRIBI_VALUES));
      altTargets.push(calculateGematriaWithOptions(trimmed, altDagger, MASHRIQI_VALUES));

      // 2. Alternate silent waw (أولو / أولئك)
      const altWaw: GematriaCalculationOptions = {
        ...rules,
        silentWawMode: rules.silentWawMode === 'count_as_6' ? 'ignore_0' : 'count_as_6',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altWaw, MAGHRIBI_VALUES));
      altTargets.push(calculateGematriaWithOptions(trimmed, altWaw, MASHRIQI_VALUES));

      // 3. Alternate uthmani waw (الصلوة / الزكوة)
      const altUthmaniWaw: GematriaCalculationOptions = {
        ...rules,
        uthmaniWawMode: rules.uthmaniWawMode === 'as_alif_1' ? 'as_waw_6' : 'as_alif_1',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altUthmaniWaw, MAGHRIBI_VALUES));
      altTargets.push(calculateGematriaWithOptions(trimmed, altUthmaniWaw, MASHRIQI_VALUES));
    }
    const alternateTargets = Array.from(new Set(altTargets)).filter((v) => v > 0 && v !== magVal && v !== mashVal);

    const chars = clean.split('').filter((c) => c !== ' ');
    const isPure = chars.every((c) => NOORANI_LETTERS_SET.has(c));

    const magBreakdown = chars.map((c) => ({
      char: c,
      val: MAGHRIBI_VALUES[c] ?? 0,
    }));

    const mashBreakdown = chars.map((c) => ({
      char: c,
      val: MASHRIQI_VALUES[c] ?? 0,
    }));

    return {
      isDirectNumber: false,
      targetMaghribi: magVal,
      targetMashriqi: mashVal,
      isIdentical: magVal === mashVal,
      alternateTargets,
      queryText: trimmed,
      cleanText: clean,
      magBreakdown,
      mashBreakdown,
      isPureNoorani: isPure,
    };
  };

  // Noorani combinations classified and merged across Mashriqi and Maghribi systems
  const [nooraniSystemFilter, setNooraniSystemFilter] = useState<'all' | 'common' | 'mashriqi' | 'maghribi'>('all');

  const mergedNooraniFormulas = useMemo(() => {
    if (!computedTarget || (computedTarget.targetMashriqi <= 0 && computedTarget.targetMaghribi <= 0)) return [];
    return classifyAndMergeNooraniFormulas(
      computedTarget.targetMashriqi,
      computedTarget.targetMaghribi,
      {
        uniqueLettersOnly: uniqueNooraniOnly,
        maxResults: 100,
      }
    );
  }, [computedTarget, uniqueNooraniOnly]);

  const displayedNooraniFormulas = useMemo(() => {
    if (nooraniSystemFilter === 'common') {
      return mergedNooraniFormulas.filter((f) => f.system === 'both' || f.system === 'dual_match');
    }
    if (nooraniSystemFilter === 'mashriqi') {
      return mergedNooraniFormulas.filter((f) => f.system === 'mashriqi' || f.system === 'both' || f.system === 'dual_match');
    }
    if (nooraniSystemFilter === 'maghribi') {
      return mergedNooraniFormulas.filter((f) => f.system === 'maghribi' || f.system === 'both' || f.system === 'dual_match');
    }
    return mergedNooraniFormulas;
  }, [nooraniSystemFilter, mergedNooraniFormulas]);

  const commonCount = useMemo(() => mergedNooraniFormulas.filter((f) => f.system === 'both' || f.system === 'dual_match').length, [mergedNooraniFormulas]);
  const mashCount = useMemo(() => mergedNooraniFormulas.filter((f) => f.system === 'mashriqi' || f.system === 'both' || f.system === 'dual_match').length, [mergedNooraniFormulas]);
  const magCount = useMemo(() => mergedNooraniFormulas.filter((f) => f.system === 'maghribi' || f.system === 'both' || f.system === 'dual_match').length, [mergedNooraniFormulas]);

  // Record a search item into history
  const recordSearchInHistory = (
    queryText: string,
    scope: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words',
    nooraniOnly: boolean,
    targetMag: number,
    targetMash: number,
    isIdenticalVal: boolean,
    matchesTotal?: number
  ) => {
    if (!queryText.trim()) return;
    setSearchHistory((prev) => {
      const existing = prev.find(
        (item) => item.query === queryText && item.scope === scope && item.onlyNoorani === nooraniOnly
      );
      const isFav = existing?.isFavorite || false;
      const updatedItem: QuranicChainHistoryItem = {
        id: existing?.id || `chain_hist_${Date.now()}`,
        query: queryText,
        timestamp: Date.now(),
        scope,
        onlyNoorani: nooraniOnly,
        targetMaghribi: targetMag,
        targetMashriqi: targetMash,
        isIdentical: isIdenticalVal,
        matchesCount: matchesTotal !== undefined ? matchesTotal : existing?.matchesCount,
        isFavorite: isFav,
      };
      const filtered = prev.filter((item) => item.id !== updatedItem.id);
      const nextList = [updatedItem, ...filtered].slice(0, 50);
      try {
        localStorage.setItem(STORAGE_KEY_CHAIN_HISTORY, JSON.stringify(nextList));
      } catch (e) {
        console.error('Failed to save chain history', e);
      }
      return nextList;
    });
  };

  // Start batch dual scanner (Supports override params from history selection)
  const handleStartScan = async (overrideParams?: {
    query?: string;
    scope?: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words';
    onlyNoorani?: boolean;
  }) => {
    const activeQuery = overrideParams?.query !== undefined ? overrideParams.query : inputQuery;
    const activeScope = overrideParams?.scope !== undefined ? overrideParams.scope : selectedScope;
    const activeOnlyNoorani = overrideParams?.onlyNoorani !== undefined ? overrideParams.onlyNoorani : onlyNoorani;

    const trimmed = activeQuery.trim();
    if (!trimmed) return;

    // Compute target details and letter breakdowns at scan time
    const targetDetails = computeTargetInfo(trimmed, localRules, flexibleOrthography);
    setComputedTarget(targetDetails);

    let targetMag = targetDetails ? targetDetails.targetMaghribi : 0;
    let targetMash = targetDetails ? targetDetails.targetMashriqi : 0;
    let isIdenticalVal = targetDetails ? targetDetails.isIdentical : true;

    if (!scannerRef.current) {
      scannerRef.current = new InverseQuranicScanner();
    }

    // Reset results
    setMatches([]);
    setExpandedMatchId(null);
    setProgress({
      percent: 0,
      scannedCount: 0,
      totalCount: 114,
      matchesCount: 0,
      itemsPerSecond: 0,
      currentSurahOrPhase: 'بدء المسح القرآني المدمج (الشرقي + الغربي)...',
      isRunning: true,
      isCompleted: false,
      isCancelled: false,
    });

    // Record initial entry in history
    recordSearchInHistory(trimmed, activeScope, activeOnlyNoorani, targetMag, targetMash, isIdenticalVal, undefined);

    try {
      await scannerRef.current.scan(
        targetMag,
        targetMash,
        {
          calcOptions: localRules,
          scope: activeScope,
          onlyNoorani: activeOnlyNoorani,
          maxResults: 2500,
          maxPhraseLength: 16,
          alternateTargets: targetDetails?.alternateTargets || [],
          onProgress: (p) => {
            setProgress(p);
          },
          onMatch: (newMatch) => {
            setMatches((prev) => [...prev, newMatch]);
          },
          onComplete: (allMatches, cancelled) => {
            setMatches(allMatches);
            if (!cancelled) {
              recordSearchInHistory(
                trimmed,
                activeScope,
                activeOnlyNoorani,
                targetMag,
                targetMash,
                isIdenticalVal,
                allMatches.length
              );
            }
          },
        }
      );
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  const handleSelectHistoryItem = (item: QuranicChainHistoryItem) => {
    setInputQuery(item.query);
    setSelectedScope(item.scope);
    setOnlyNoorani(item.onlyNoorani);
    handleStartScan({
      query: item.query,
      scope: item.scope,
      onlyNoorani: item.onlyNoorani,
    });
  };

  const handleToggleHistoryFavorite = (id: string) => {
    setSearchHistory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
      try {
        localStorage.setItem(STORAGE_KEY_CHAIN_HISTORY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save chain history', e);
      }
      return next;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setSearchHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_CHAIN_HISTORY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save chain history', e);
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_CHAIN_HISTORY);
    } catch (e) {
      console.error('Failed to clear chain history', e);
    }
  };

  // Stop / Cancel scanner
  const handleStopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      isCancelled: true,
      currentSurahOrPhase: 'تم إلغاء الأمر',
    }));
  };

  // Auto-clean on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const handleCopyPhrase = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Origin statistics
  const countsByOrigin = useMemo(() => {
    let common = 0;
    let maghribi = 0;
    let mashriqi = 0;
    for (const m of matches) {
      if (m.systemOrigin === 'common' || m.isIntrinsicCommon) common++;
      if (computedTarget ? m.maghribiValue === computedTarget.targetMaghribi : m.systemOrigin === 'maghribi') maghribi++;
      if (computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi') mashriqi++;
    }
    return { common, maghribi, mashriqi, total: matches.length };
  }, [matches, computedTarget]);

  // Filtered results (Supports isFilterUnique, Origin Tab, and text search)
  const filteredMatches = useMemo(() => {
    let list = matches;

    // Filter by Origin tab
    if (selectedOriginFilter !== 'all') {
      if (selectedOriginFilter === 'common') {
        list = list.filter((m) => m.systemOrigin === 'common' || m.isIntrinsicCommon);
      } else if (selectedOriginFilter === 'maghribi') {
        list = list.filter((m) => computedTarget ? m.maghribiValue === computedTarget.targetMaghribi : m.systemOrigin === 'maghribi');
      } else if (selectedOriginFilter === 'mashriqi') {
        list = list.filter((m) => computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi');
      }
    }

    // Apply unique/distinct deduplication if enabled (default: true)
    if (isFilterUnique) {
      const seen = new Set<string>();
      list = list.filter((m) => {
        const clean = `${m.cleanPhrase.replace(/\s+/g, ' ').trim()}_${m.systemOrigin}`;
        if (seen.has(clean)) return false;
        seen.add(clean);
        return true;
      });
    }

    if (resultsFilter.trim()) {
      const q = resultsFilter.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.phrase.includes(q) ||
          m.surahName.includes(q) ||
          m.matchTypeLabel.includes(q) ||
          m.systemLabel.includes(q)
      );
    }

    return list;
  }, [matches, resultsFilter, isFilterUnique, selectedOriginFilter]);

  const handleCopyAll = () => {
    if (filteredMatches.length === 0) return;
    const targetDesc = computedTarget
      ? computedTarget.isIdentical
        ? `القيمة: ${computedTarget.targetMaghribi}`
        : `الغربي: ${computedTarget.targetMaghribi} | الشرقي: ${computedTarget.targetMashriqi}`
      : '';

    const lines = [
      `المطابقات القرآنية المدمجة (${targetDesc}):`,
      ...filteredMatches.map(
        (m, idx) =>
          `${idx + 1}. [${m.systemLabel}: = ${m.value}] ${m.phrase} (سورة ${m.surahName}:${m.ayahNumber})`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      {/* Top Controls Card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 sm:p-3.5 shadow-2xs space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 font-sans">
                مطابق السلاسل والآيات القرآنية
              </h2>
            </div>
          </div>

          {/* Display Letter Values Breakdown & Totals in Eastern & Western Colors */}
          {computedTarget ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-850/80 border border-stone-200 dark:border-stone-800 text-3xs font-mono flex-wrap self-start sm:self-auto max-w-full overflow-hidden shadow-2xs">
              {/* Letters breakdown */}
              {computedTarget.magBreakdown.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 border-l border-stone-250 dark:border-stone-700 pl-1.5 ml-0.5">
                  {computedTarget.magBreakdown.map((item, idx) => {
                    const mashVal = computedTarget.mashBreakdown[idx]?.val ?? item.val;
                    const isDiff = item.val !== mashVal;
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded border text-3xs ${
                          isDiff
                            ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600'
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750'
                        }`}
                        title={`حرف (${item.char}): غربي = ${item.val} | شرقي = ${mashVal}`}
                      >
                        <span className="font-quran text-stone-900 dark:text-stone-100 font-medium">{item.char}</span>
                        {isDiff ? (
                          <span className="flex items-center gap-0.5 text-4xs">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{item.val}</span>
                            <span className="text-stone-300">/</span>
                            <span className="text-sky-600 dark:text-sky-400 font-bold">{mashVal}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-4xs">{item.val}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Totals in distinct Western (Amber) and Eastern (Sky) and Common (Emerald) colors */}
              <div className="flex items-center gap-1.5 shrink-0">
                {computedTarget.isIdentical ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold font-mono text-xs shadow-2xs"
                    title={`المجموع المشترك: ${computedTarget.targetMaghribi}`}
                  >
                    {computedTarget.targetMaghribi}
                  </span>
                ) : (
                  <div className="flex items-center gap-1 font-mono font-bold text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs"
                      title={`المجموع المغربي: ${computedTarget.targetMaghribi}`}
                    >
                      {computedTarget.targetMaghribi}
                    </span>
                    <span className="text-stone-300">/</span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-2xs"
                      title={`المجموع المشرقي: ${computedTarget.targetMashriqi}`}
                    >
                      {computedTarget.targetMashriqi}
                    </span>
                  </div>
                )}

                {computedTarget.alternateTargets && computedTarget.alternateTargets.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 text-4xs"
                    title="أوجه بديلة مشمولة في المسح المتوازي"
                  >
                    أوجه: {computedTarget.alternateTargets.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-3xs text-stone-400 font-normal self-start sm:self-auto px-2 py-0.5">
              <span>أدخل عبارة أو رقماً واضغط «ابدأ» لحساب قيم الحروف وبدء المسح</span>
            </div>
          )}
        </div>

        {/* Input & Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
          {/* Main Query Input */}
          <div className="lg:col-span-8 space-y-1">
            {computedTarget && computedTarget.alternateTargets && computedTarget.alternateTargets.length > 0 && (
              <div className="flex items-center justify-end font-mono text-3xs">
                <span
                  className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  title="الأوجه الإملائية والقرآنية البديلة (الألف الخنجرية، الواو الصامتة) المشمولة في المسح المتوازي"
                >
                  + أوجه بديلة: {computedTarget.alternateTargets.join(', ')}
                </span>
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !progress.isRunning) {
                    handleStartScan();
                  }
                }}
                placeholder="اكتب عبارة (مثل: كهيعص أو لا إله إلا الله) أو رقماً (مثل: 165 أو 518)..."
                className="w-full text-xs sm:text-sm font-quran font-normal p-2 sm:p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-right"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setInputQuery('');
                    setComputedTarget(null);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
                  title="مسح"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scan Action Button & History Drawer Trigger */}
          <div className="lg:col-span-4 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStartScan()}
              disabled={!inputQuery.trim() || progress.isRunning}
              className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-white text-xs font-normal inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                progress.isRunning
                  ? 'bg-emerald-600/80 cursor-wait opacity-90'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${progress.isRunning ? 'animate-pulse fill-current' : 'fill-current'}`} />
              <span>{progress.isRunning ? 'جاري المسح...' : 'ابدأ'}</span>
            </button>

            {/* History Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-all cursor-pointer shadow-2xs shrink-0 relative flex items-center justify-center min-w-[38px] min-h-[38px]"
              title="فتح سجل بحوث مطابق السلاسل"
              aria-label="فتح سجل بحوث مطابق السلاسل"
            >
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {searchHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 font-mono text-[9px] font-bold px-1 py-0.2 rounded-full bg-emerald-600 text-white min-w-[14px] text-center leading-tight shadow-xs">
                  {searchHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick History Pills Row (Smooth swipable, 1-tap re-scan) */}
        {searchHistory.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 max-w-full overflow-hidden pt-0.5">
            <span className="text-3xs text-stone-400 shrink-0 flex items-center gap-0.5">
              <History className="w-3 h-3 text-emerald-500" />
              <span>السجل:</span>
            </span>
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto min-w-0 max-w-full py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {searchHistory.slice(0, 10).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleSelectHistoryItem(h)}
                  className="px-2 py-0.5 rounded-lg text-3xs font-medium bg-stone-100 dark:bg-stone-850 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs font-sans"
                  title={`إعادة المسح: ${h.query} (مغربي: ${h.targetMaghribi} | مشرقي: ${h.targetMashriqi})`}
                >
                  {h.isFavorite && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />}
                  <span className="font-quran">{h.query}</span>
                  <span className="text-stone-400 font-mono text-3xs">({h.targetMaghribi})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2.5 Noorani Formulas Preview Row (مدموج وملون بين المشرقي والمغربي) */}
        {computedTarget && mergedNooraniFormulas.length > 0 && (
          <div className="p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/70 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-1 text-2xs font-normal">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-emerald-900 dark:text-emerald-200 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>صيغ وتراكيب الأحرف المقطعة ({mergedNooraniFormulas.length})</span>
                </div>

                {mergedNooraniFormulas.length > 0 && (
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
                      الكل ({mergedNooraniFormulas.length})
                    </button>
                    {commonCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setNooraniSystemFilter('common')}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                          nooraniSystemFilter === 'common'
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="صيغ مشتركة ومتطابقة في كلا النظامين"
                      >
                        <span>مشترك</span>
                        <span className="font-mono text-3xs">({commonCount})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNooraniSystemFilter('mashriqi')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                        nooraniSystemFilter === 'mashriqi'
                          ? 'bg-sky-600 text-white shadow-2xs font-bold'
                          : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                      }`}
                      title={`صيغ النظام المشرقي (= ${computedTarget.targetMashriqi})`}
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
                          : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                      }`}
                      title={`صيغ النظام المغربي (= ${computedTarget.targetMaghribi})`}
                    >
                      <span>مغربي</span>
                      <span className="font-mono text-3xs">({magCount})</span>
                    </button>
                  </div>
                )}
              </div>

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

            <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-0.5">
              {displayedNooraniFormulas.map((n) => {
                const isCopied = copiedFormula === `noorani_${n.key}`;

                let chipStyle = '';
                let badgeStyle = '';

                if (n.system === 'both') {
                  chipStyle = 'bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:border-emerald-500 hover:bg-emerald-100/70';
                } else if (n.system === 'dual_match') {
                  chipStyle = 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 hover:border-indigo-500 hover:bg-indigo-100/70';
                } else if (n.system === 'mashriqi') {
                  chipStyle = 'bg-sky-50/90 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100 hover:border-sky-500 hover:bg-sky-100/70';
                } else {
                  chipStyle = 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:border-amber-500 hover:bg-amber-100/70';
                }

                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(n.formula);
                      setCopiedFormula(`noorani_${n.key}`);
                      setTimeout(() => setCopiedFormula(null), 1800);
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs font-quran flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${chipStyle}`}
                    title={`الصيغة: ${n.formula} | الحساب: ${n.displaySum} | تفكيك الحروف: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} ${n.description ? `| ${n.description}` : ''} - انقر للنسخ`}
                  >
                    <span className="font-bold">{n.formula}</span>
                    {n.isAuthenticQuranicFawatih && (
                      <span className="text-3xs text-amber-500" title="فاتحة سورة أو تركيب قرآني تّام">⭐</span>
                    )}
                    <span className="font-mono text-4xs font-semibold opacity-75">
                      ({n.displaySum})
                    </span>
                    {isCopied && <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scope & Noorani Filters */}
        <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-2xs font-normal text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex rounded-md border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-50 dark:bg-stone-800/60 text-3xs">
              <button
                type="button"
                onClick={() => setSelectedScope('all')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  selectedScope === 'all'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-medium'
                    : 'hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('verses_and_chains')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  selectedScope === 'verses_and_chains'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-medium'
                    : 'hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                آيات
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('single_words')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  selectedScope === 'single_words'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-medium'
                    : 'hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                مفردات
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-1 cursor-pointer select-none text-3xs">
            <input
              type="checkbox"
              checked={onlyNoorani}
              onChange={(e) => setOnlyNoorani(e.target.checked)}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>أحرف نورانية فقط (14 حرفاً)</span>
          </label>
        </div>

        {/* Quranic Orthography & Scan Rules Toggle Bar */}
        <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1 flex-wrap text-3xs">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRulesPanel(!showRulesPanel)}
              className={`px-2 py-0.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                showRulesPanel
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-stone-50 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
              <span>شروط وقواعد الرسم القرآني</span>
              {showRulesPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Quick Badges of Active Rules */}
            <span
              className={`px-1.5 py-0.5 rounded font-mono ${
                localRules.daggerAlif === 'count_as_1'
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
              }`}
              title="الألف الخنجرية في رسم المصحف (الرحمن، هذا، ذلك، إله...)"
            >
              {localRules.daggerAlif === 'count_as_1' ? 'ألف خنجرية (+1)' : 'ألف مهملة (0)'}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded font-mono ${
                localRules.silentWawMode === 'count_as_6'
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
              }`}
              title="الواو غير المقروءة في أولو وأولئك وأولات"
            >
              {localRules.silentWawMode === 'count_as_6' ? 'واو رسم (+6)' : 'واو صامتة (0)'}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded font-mono ${
                localRules.uthmaniWawMode === 'as_waw_6'
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
              title="واو الصلوة والزكوة والحيوة والربوا ومشكوة"
            >
              {localRules.uthmaniWawMode === 'as_waw_6' ? 'واو الصلوة (6)' : 'ألف الصلوة (1)'}
            </span>
          </div>

          {/* Flexible Multi-Aspect Search Toggle */}
          <button
            type="button"
            onClick={() => setFlexibleOrthography(!flexibleOrthography)}
            className={`px-2 py-0.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
              flexibleOrthography
                ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold'
                : 'bg-stone-50 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'
            }`}
            title="فحص متزامن لكافة الأوجه الإملائية والقرآنية المحتملة (مع الألف الخنجرية وبدونها، ومع الواو وبدونها)"
          >
            <ShieldCheck className={`w-3 h-3 ${flexibleOrthography ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`} />
            <span>البحث المرن للأوجه {flexibleOrthography ? '(مفعّل ✓)' : '(معطّل)'}</span>
          </button>
        </div>

        {/* Collapsible Rules & Conditions Drawer Panel */}
        {showRulesPanel && (
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-stone-50/50 dark:bg-stone-850/60 p-2.5 rounded-xl text-3xs font-sans animate-in fade-in duration-150">
            {/* 1. Dagger Alif */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>الألف الخنجرية (الرحمن، ذلك، إله...)</span>
                <span className="text-emerald-600 font-mono text-4xs">أصل الرسم</span>
              </div>
              <p className="text-4xs text-stone-500">حساب الألف الصغيرة المثبتة في المصحف أو إسقاطها</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, daggerAlif: 'count_as_1' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.daggerAlif === 'count_as_1'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  احتساب (+1)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, daggerAlif: 'ignore_0' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.daggerAlif === 'ignore_0'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  إهمالها (0)
                </button>
              </div>
            </div>

            {/* 2. Silent Waw */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>الواو غير المقروءة (أولو، أولئك)</span>
                <span className="text-sky-600 font-mono text-4xs">رسم مقابل لفظ</span>
              </div>
              <p className="text-4xs text-stone-500">الواو بعد الهمزة التي لا تلفظ في القراءة</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, silentWawMode: 'count_as_6' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.silentWawMode === 'count_as_6'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  بالرسم (+6)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, silentWawMode: 'ignore_0' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.silentWawMode === 'ignore_0'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  باللفظ (0)
                </button>
              </div>
            </div>

            {/* 3. Uthmani Waw in Salat & Zakat */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>واو الصلوة والزكوة والحيوة</span>
                <span className="text-amber-600 font-mono text-4xs">عثماني</span>
              </div>
              <p className="text-4xs text-stone-500">حساب الواو المكتوبة كواو (6) أو كألف منطوقة (1)</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, uthmaniWawMode: 'as_waw_6' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.uthmaniWawMode === 'as_waw_6'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  كواو رسمية (6)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, uthmaniWawMode: 'as_alif_1' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.uthmaniWawMode === 'as_alif_1'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  كألف منطوقة (1)
                </button>
              </div>
            </div>

            {/* 4. Ta Marbuta */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>التاء المربوطة (ة)</span>
                <span className="text-stone-500 font-mono text-4xs">وقف / وصل</span>
              </div>
              <p className="text-4xs text-stone-500">حسابها كهاء وقفي (5) أو كتاء وصلي (400)</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, taMarbuta: 'ha_5' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.taMarbuta === 'ha_5'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  هاء وقفي (5)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, taMarbuta: 'ta_400' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.taMarbuta === 'ta_400'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  تاء وصلي (400)
                </button>
              </div>
            </div>

            {/* 5. Shaddah */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>الشدة والتضعيف ( ّ )</span>
                <span className="text-stone-500 font-mono text-4xs">تضعيف</span>
              </div>
              <p className="text-4xs text-stone-500">حرف واحد مجرد (1x) أو مضاعف لفك الإدغام (2x)</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, shaddahMode: 'single_1x' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.shaddahMode === 'single_1x'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  حرف واحد (1x)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, shaddahMode: 'double_2x' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.shaddahMode === 'double_2x'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  مضاعف (2x)
                </button>
              </div>
            </div>

            {/* 6. Silent Alif after Waw */}
            <div className="space-y-1 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>ألف التفريق (قالوا، آمنوا)</span>
                <span className="text-stone-500 font-mono text-4xs">واو الجماعة</span>
              </div>
              <p className="text-4xs text-stone-500">الألف الفارقة بعد واو الجماعة</p>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, silentAlifMode: 'count_as_1' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.silentAlifMode === 'count_as_1'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  محتسبة (+1)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules((prev) => ({ ...prev, silentAlifMode: 'ignore_0' }))}
                  className={`py-1 px-1.5 rounded transition-all cursor-pointer font-medium text-center ${
                    localRules.silentAlifMode === 'ignore_0'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  مهملة (0)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar & Live Scan Status & Cancel Button */}
      {(progress.isRunning || progress.scannedCount > 0) && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs p-2 sm:p-2.5 space-y-1.5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-2xs font-normal text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {progress.isRunning
                  ? 'جاري المسح القرآني المدمج (شرقي + غربي)...'
                  : progress.isCancelled
                  ? 'تم إيقاف المسح'
                  : 'اكتمل المسح الشامل المدمج'}
              </span>
              <span>•</span>
              <span className="text-3xs">{progress.currentSurahOrPhase}</span>

              {/* Dedicated Cancel Button beside progress */}
              {progress.isRunning && (
                <button
                  type="button"
                  onClick={handleStopScan}
                  className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-3xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs font-normal shrink-0 mr-1"
                  title="إلغاء وإيقاف المسح القرآني فوراً"
                >
                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>إلغاء الأمر</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 font-mono text-3xs">
              <span>المفحوص: {progress.scannedCount.toLocaleString()}</span>
              <span>المطابقات: {matches.length}</span>
              {progress.itemsPerSecond > 0 && <span>{progress.itemsPerSecond.toLocaleString()} تركيب/ث</span>}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{progress.percent}%</span>
            </div>
          </div>

          {/* Real-time Progress Track */}
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden border border-stone-200 dark:border-stone-700">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                progress.isCancelled
                  ? 'bg-rose-500'
                  : progress.isCompleted
                  ? 'bg-emerald-500'
                  : 'bg-linear-to-r from-emerald-500 via-amber-500 to-sky-500 animate-pulse'
              }`}
              style={{ width: `${Math.max(1, progress.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Discovered Results Section */}
      <div className="space-y-2">
        {/* Results Header & Quick Search & System Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-medium text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>المطابقات القرآنية ({filteredMatches.length} من {matches.length})</span>
            </h3>

            {/* System Color Distinction Badges / Filter Tabs */}
            {matches.length > 0 && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-800 p-0.5 bg-stone-100/60 dark:bg-stone-850 text-3xs font-mono">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('all')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedOriginFilter === 'all'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  الكل ({countsByOrigin.total})
                </button>

                {/* Common (مشترك) - Emerald */}
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('common')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                    selectedOriginFilter === 'common'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                  title="المطابقات المشتركة في النظامين (الشرقي والغربي)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>مشترك ({countsByOrigin.common})</span>
                </button>

                {/* Maghribi (غربي) - Amber */}
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('maghribi')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                    selectedOriginFilter === 'maghribi'
                      ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                  title="المطابقات وفق الجُمَّل الغربي (المغربي)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>غربي ({countsByOrigin.maghribi})</span>
                </button>

                {/* Mashriqi (شرقي) - Sky */}
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('mashriqi')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                    selectedOriginFilter === 'mashriqi'
                      ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                      : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                  }`}
                  title="المطابقات وفق الجُمَّل الشرقي (المشرقي)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>شرقي ({countsByOrigin.mashriqi})</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {/* Filter Toggle Button (تصفية النتائج - مفعل افتراضاً) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFilterUnique((prev) => !prev)}
                className={`px-2 py-1 rounded-lg text-2xs font-normal border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  isFilterUnique
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 shadow-2xs font-medium'
                    : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 shadow-2xs'
                }`}
                title={isFilterUnique ? 'تصفية النتائج مفعلة (إزالة التكرار وإظهار العبارات الفريدة فقط)' : 'انقر لتفعيل تصفية النتائج بدون تكرار'}
              >
                <Filter className={`w-3 h-3 ${isFilterUnique ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
                <span>تصفية النتائج {isFilterUnique && '✓'}</span>
              </button>
            )}

            {/* Copy All Button */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className={`px-2 py-1 rounded-lg text-2xs font-normal border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  copiedAll
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs'
                }`}
                title="نسخ جميع النتائج المكتشفة مع تصنيفها إلى الحافظة"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>تم نسخ {filteredMatches.length} نتيجة</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" />
                    <span>نسخ الكل ({filteredMatches.length})</span>
                  </>
                )}
              </button>
            )}

            {/* Text Search Filter */}
            {matches.length > 0 && (
              <div className="w-full sm:w-40">
                <input
                  type="text"
                  value={resultsFilter}
                  onChange={(e) => setResultsFilter(e.target.value)}
                  placeholder="بحث في النتائج..."
                  className="w-full text-xs font-normal px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                />
              </div>
            )}
          </div>
        </div>

        {/* Minimal High-Density Results Grid with Distinct System Colors */}
        {filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
            {filteredMatches.map((item) => {
              const isExpanded = expandedMatchId === item.id;
              const isCopied = copiedId === item.id;
              const surahMuqattaat = getSurahMuqattaat(item.surahNumber, item.surahName);

              // Color Scheme based on System Origin (مشترك / غربي / شرقي)
              const isCommon = item.systemOrigin === 'common' || item.isIntrinsicCommon;
              const isMaghribi = item.systemOrigin === 'maghribi' && !item.isIntrinsicCommon;
              const isMashriqi = item.systemOrigin === 'mashriqi' && !item.isIntrinsicCommon;

              const cardClasses = isCommon
                ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-500'
                : isMaghribi
                ? 'bg-amber-50/50 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700/80 hover:border-amber-500'
                : 'bg-sky-50/50 dark:bg-sky-950/25 border-sky-300 dark:border-sky-700/80 hover:border-sky-500';

              const indicatorDot = isCommon
                ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800'
                : isMaghribi
                ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-800'
                : 'bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-800';

              const textHoverClass = isCommon
                ? 'hover:text-emerald-700 dark:hover:text-emerald-300'
                : isMaghribi
                ? 'hover:text-amber-700 dark:hover:text-amber-300'
                : 'hover:text-sky-700 dark:hover:text-sky-300';

              // Calculate total verification equation
              const wordEquation = item.breakdown.map((b) => `${b.word} (${b.value})`).join(' + ');
              const numSumEquation = item.breakdown.map((b) => b.value).join(' + ');
              const letterFullEquation = item.breakdown
                .map((b) => `[${b.letters.map((l) => `${l.char}=${isMaghribi ? l.magVal : isMashriqi ? l.mashVal : l.magVal}`).join('+')}]`)
                .join(' + ');

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedMatchId(isExpanded ? null : item.id)}
                  className={`px-2.5 py-1.5 rounded-xl border shadow-2xs transition-all select-none group flex flex-col justify-center gap-1 cursor-pointer ${cardClasses} ${
                    isExpanded ? 'ring-2 ring-emerald-500/20 shadow-xs' : ''
                  }`}
                  title={isExpanded ? 'انقر لإخفاء التفاصيل' : 'انقر لعرض تفاصيل الآية والتفكيك'}
                >
                  {/* Clean Single Row: Indicator Dot + Phrase (Right) & Small Surah/Ayah/Muqattaat + Actions (Left) */}
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    {/* Right side: Color Dot + Clickable Full Quranic Phrase */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {/* Subtle Color Dot Indicator */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${indicatorDot}`}
                        title={
                          isCommon
                            ? `مشترك في النظامين (القيمة = ${item.value})`
                            : isMaghribi
                            ? `غربي (القيمة = ${item.maghribiValue})`
                            : `شرقي (القيمة = ${item.mashriqiValue})`
                        }
                      />

                      <span
                        className={`text-xs sm:text-sm font-semibold font-quran text-stone-900 dark:text-stone-100 leading-normal truncate ${textHoverClass}`}
                        title={item.phrase}
                      >
                        {item.phrase}
                      </span>

                      {isCopied && (
                        <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal shrink-0">
                          تم
                        </span>
                      )}
                    </div>

                    {/* Left side (الجهة المقابلة للنتيجة): Smallest font Surah/Ayah + Muqatta'at + Copy + Notebook */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Small Surah Name + Ayah Number + Disconnected Letters in smallest font */}
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400 dark:text-stone-500 font-sans shrink-0 whitespace-nowrap">
                        <span>({item.surahName}:{item.ayahNumber})</span>
                        {surahMuqattaat && (
                          <span
                            className="text-[9px] font-sans text-stone-500 dark:text-stone-400 px-0.5"
                            title={`الأحرف المقطعة في فاتحة سورة ${item.surahName}: ${surahMuqattaat}`}
                          >
                            [{surahMuqattaat}]
                          </span>
                        )}
                      </span>

                      {/* Minimal Action Icons: Copy + Notebook ONLY */}
                      <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-700 pr-1 mr-0.5">
                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyPhrase(item.id, item.phrase)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="نسخ العبارة"
                          aria-label="نسخ العبارة"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {/* Add to Notebook */}
                        <AddToNotebookButton
                          word={item.phrase}
                          cipher={`= ${item.value} [${item.systemLabel}]`}
                          surahInfo={`سورة ${item.surahName}`}
                          ayahNum={item.ayahNumber}
                          type="quranic"
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Shows Full Ayah + Surah Reference + Complete Summation Equation */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 mt-1 border-t border-stone-200/80 dark:border-stone-800 text-3xs space-y-2 bg-white/80 dark:bg-stone-950/80 p-2.5 rounded-lg font-normal animate-in fade-in duration-150"
                    >
                      {/* Full Quranic Ayah Box */}
                      {item.fullAyahText && (
                        <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 space-y-1.5">
                          <div className="flex items-center justify-between text-3xs text-stone-500 dark:text-stone-400">
                            <span className="font-medium text-stone-700 dark:text-stone-300">الآية الكريمة كاملة:</span>
                            <span className="font-sans font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <span>سورة {item.surahName} [الآية {item.ayahNumber}]</span>
                              {surahMuqattaat && (
                                <span className="text-4xs font-quran px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                                  {surahMuqattaat}
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-quran leading-loose text-stone-900 dark:text-stone-100 text-right select-text">
                            ﴿ {item.fullAyahText} ﴾
                          </p>
                        </div>
                      )}

                      {/* Matched phrase header & values */}
                      <div className="flex items-center justify-between gap-1 text-stone-600 dark:text-stone-300">
                        <span className="font-medium">
                          المقطع المطابق: «{item.phrase}»
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          {isCommon ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              المجموع المشترك = {item.value}
                            </span>
                          ) : (
                            <>
                              <span className="text-amber-700 dark:text-amber-300">
                                غربي: {item.maghribiValue}
                              </span>
                              <span>|</span>
                              <span className="text-sky-700 dark:text-sky-300">
                                شرقي: {item.mashriqiValue}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Word Summation */}
                      <div className="flex items-center gap-1 flex-wrap text-stone-700 dark:text-stone-300 font-mono">
                        <span className="font-medium">{wordEquation}</span>
                        <span className="text-stone-400">=</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">{numSumEquation} = {item.value} ✓</span>
                      </div>

                      {/* Letter Breakdown Summation */}
                      <div className="text-stone-500 dark:text-stone-400 font-mono text-3xs opacity-90 leading-normal">
                        {letterFullEquation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !progress.isRunning && progress.scannedCount > 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 text-center space-y-1.5">
            <BookOpen className="w-6 h-6 text-stone-400 mx-auto" />
            <div className="text-xs font-normal text-stone-700 dark:text-stone-300">
              لم يتم العثور على مطابقات في النطاق والتصنيف المحدد
            </div>
            <div className="text-3xs text-stone-500 dark:text-stone-400">
              جرب اختيار تبويب "الكل" أو توسيع نطاق البحث ليشمل جميع التراكيب.
            </div>
          </div>
        ) : null}
      </div>

      {/* Quranic Chain Matcher History Drawer */}
      <QuranicChainHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={searchHistory}
        onSelectItem={handleSelectHistoryItem}
        onToggleFavorite={handleToggleHistoryFavorite}
        onDeleteItem={handleDeleteHistoryItem}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}
