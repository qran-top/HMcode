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
  Loader2,
  ArrowUpDown,
  Link2,
  X,
  ExternalLink,
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
  NOORANI_ALGORITHMS,
  NooraniAlgorithmId,
  QURANIC_29_SURAH_FAWATIH,
  inferSurahOrdersFromFormula,
} from '../utils/gematriaEngine';
import { useNooraniClassifier } from '../hooks/useNooraniClassifier';
import { NooraniProcessingBar } from './NooraniProcessingBar';
import {
  InverseQuranicScanner,
  InverseQuranicMatch,
  ScannerProgress,
} from '../utils/inverseQuranicMatcher';
import { getSurahMuqattaat, getQuranTopSearchUrl } from '../utils/quranicDictionary';
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

  // Results Grid Sorting & Length Filters (ترتيب وتصفية النتائج والكابشنات المختصرة)
  const [matchSortBy, setMatchSortBy] = useState<'mushaf' | 'length_asc' | 'length_desc' | 'system'>('mushaf');
  const [matchLengthFilter, setMatchLengthFilter] = useState<'all' | 'single' | 'short' | 'medium' | 'long'>('all');
  const [onlyFawatihSurahs, setOnlyFawatihSurahs] = useState<boolean>(false);
  const [useShortCaptions, setUseShortCaptions] = useState<boolean>(false);
  const [linkWithNooraniSurahs, setLinkWithNooraniSurahs] = useState<boolean>(true);

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

  const computedTarget = useMemo<ComputedTargetInfo | null>(() => {
    return computeTargetInfo(inputQuery, localRules, flexibleOrthography);
  }, [inputQuery, localRules, flexibleOrthography]);

  // Noorani combinations classified and merged across Mashriqi and Maghribi systems
  // Noorani combinations classified and merged across Mashriqi and Maghribi systems
  const [nooraniSystemFilter, setNooraniSystemFilter] = useState<'all' | 'common' | 'mashriqi' | 'maghribi'>('all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<NooraniAlgorithmId>(1);
  const [selectedFormulaKey, setSelectedFormulaKey] = useState<string | null>(null);
  const [filterSurahOrders, setFilterSurahOrders] = useState<number[]>([]);
  const [sortByQuranicMatch, setSortByQuranicMatch] = useState<boolean>(true);

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
    targetMashriqi: computedTarget?.targetMashriqi || 0,
    targetMaghribi: computedTarget?.targetMaghribi || 0,
    algorithmId: selectedAlgorithm,
    uniqueNooraniOnly,
    queryText: computedTarget?.queryText || inputQuery,
    maxResults: 100,
  });

  const displayedNooraniFormulas = useMemo(() => {
    let list = [...mergedNooraniFormulas];
    if (nooraniSystemFilter === 'common') {
      list = list.filter((f) => f.system === 'both' || f.system === 'dual_match');
    } else if (nooraniSystemFilter === 'mashriqi') {
      list = list.filter((f) => f.system === 'mashriqi' || f.system === 'both' || f.system === 'dual_match');
    } else if (nooraniSystemFilter === 'maghribi') {
      list = list.filter((f) => f.system === 'maghribi' || f.system === 'both' || f.system === 'dual_match');
    }
    if (filterSurahOrders.length > 0) {
      list = list.filter((f) => f.surahOrders?.some((ord) => filterSurahOrders.includes(ord)));
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
  }, [nooraniSystemFilter, mergedNooraniFormulas, filterSurahOrders, sortByQuranicMatch]);

  // Active formula: activates on click or auto-selects from authentic query match
  const activeFormula = useMemo(() => {
    if (selectedFormulaKey) {
      return mergedNooraniFormulas.find((f) => f.key === selectedFormulaKey) || null;
    }
    return null;
  }, [selectedFormulaKey, mergedNooraniFormulas]);

  // Inferred surah orders directly from input query (e.g. user typed "حم حم حم حم حم حم حم" or "الم")
  const effectiveQuerySurahOrders = useMemo(() => {
    const text = (computedTarget?.cleanText || inputQuery).trim();
    if (!text) return [];
    return inferSurahOrdersFromFormula(text);
  }, [computedTarget, inputQuery]);

  const activeSurahOrdersSet = useMemo(() => {
    if (activeFormula?.surahOrders && activeFormula.surahOrders.length > 0) {
      return new Set<number>(activeFormula.surahOrders);
    }
    if (effectiveQuerySurahOrders.length > 0) {
      return new Set<number>(effectiveQuerySurahOrders);
    }
    return new Set<number>();
  }, [activeFormula, effectiveQuerySurahOrders]);

  // Active Surah items filtered in the 29 Surahs strip
  const filteredSurahItems = useMemo(() => {
    if (filterSurahOrders.length === 0) return [];
    return QURANIC_29_SURAH_FAWATIH.filter((s) => filterSurahOrders.includes(s.orderInFawatih));
  }, [filterSurahOrders]);

  const filteredSurahItem = useMemo(() => {
    return filteredSurahItems.length === 1 ? filteredSurahItems[0] : null;
  }, [filteredSurahItems]);

  const filteredSurahNumbers = useMemo(() => {
    return new Set<number>(filteredSurahItems.map((s) => s.surahNumber));
  }, [filteredSurahItems]);

  // Surahs associated with the active Noorani formula or inferred query
  const effectiveActiveSurahs = useMemo(() => {
    const orders = (activeFormula?.surahOrders && activeFormula.surahOrders.length > 0)
      ? activeFormula.surahOrders
      : effectiveQuerySurahOrders;
    if (orders.length === 0) return [];
    return QURANIC_29_SURAH_FAWATIH.filter((s) => orders.includes(s.orderInFawatih));
  }, [activeFormula, effectiveQuerySurahOrders]);

  const effectiveActiveSurahNumbers = useMemo(() => {
    return new Set<number>(effectiveActiveSurahs.map((s) => s.surahNumber));
  }, [effectiveActiveSurahs]);

  // Backwards compatibility alias
  const activeFormulaSurahs = effectiveActiveSurahs;
  const activeFormulaSurahNumbers = effectiveActiveSurahNumbers;

  // Effective linked Surahs between the Noorani Muqatta'at section and the Comprehensive Scan results
  const effectiveLinkedSurahNumbers = useMemo(() => {
    if (filterSurahOrders.length > 0) {
      return filteredSurahNumbers;
    }
    if (effectiveActiveSurahNumbers.size > 0) {
      return effectiveActiveSurahNumbers;
    }
    return new Set<number>();
  }, [filterSurahOrders, filteredSurahNumbers, effectiveActiveSurahNumbers]);

  const effectiveLinkedSurahItems = useMemo(() => {
    if (filterSurahOrders.length > 0) {
      return filteredSurahItems;
    }
    if (effectiveActiveSurahs.length > 0) {
      return effectiveActiveSurahs;
    }
    return [];
  }, [filterSurahOrders, filteredSurahItems, effectiveActiveSurahs]);

  // Auto-select formula matching query if none explicitly selected
  useEffect(() => {
    if (!selectedFormulaKey && mergedNooraniFormulas.length > 0) {
      const cleanQ = (computedTarget?.cleanText || inputQuery).trim();
      const exact = mergedNooraniFormulas.find((f) => f.formula === cleanQ);
      if (exact) {
        setSelectedFormulaKey(exact.key);
      } else if (effectiveQuerySurahOrders.length > 0) {
        const matchingOrdersFormula = mergedNooraniFormulas.find(
          (f) =>
            f.isAuthenticQuranicFawatih &&
            f.surahOrders &&
            f.surahOrders.length === effectiveQuerySurahOrders.length
        );
        if (matchingOrdersFormula) {
          setSelectedFormulaKey(matchingOrdersFormula.key);
        }
      }
    }
  }, [mergedNooraniFormulas, selectedFormulaKey, computedTarget, inputQuery, effectiveQuerySurahOrders]);

  // Helper for single filterSurahOrder for backwards compatibility
  const filterSurahOrder = filterSurahOrders.length === 1 ? filterSurahOrders[0] : null;

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

  // Set of 29 Quranic Surahs that open with Muqatta'at Fawatih (سور الفواتح الـ 29)
  const FAWATIH_SURAH_NUMBERS = useMemo(() => new Set([
    2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 50, 68
  ]), []);

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

  // Statistics by result length / word count (مفردة، قصيرة، متوسطة، طويلة)
  const countsByLength = useMemo(() => {
    let single = 0;
    let short = 0;
    let medium = 0;
    let long = 0;
    for (const m of matches) {
      if (m.wordCount === 1) single++;
      else if (m.wordCount >= 2 && m.wordCount <= 3) short++;
      else if (m.wordCount >= 4 && m.wordCount <= 6) medium++;
      else if (m.wordCount >= 7) long++;
    }
    return { single, short, medium, long, total: matches.length };
  }, [matches]);

  // Total matches found in Fawatih Surahs
  const fawatihSurahsCount = useMemo(() => {
    return matches.filter((m) => FAWATIH_SURAH_NUMBERS.has(m.surahNumber)).length;
  }, [matches, FAWATIH_SURAH_NUMBERS]);

  // Real-time scan match counts per Quranic Surah number (for live badges in 29 strip and quick filters)
  const matchCountsBySurahNumber = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of matches) {
      map.set(m.surahNumber, (map.get(m.surahNumber) || 0) + 1);
    }
    return map;
  }, [matches]);

  // Filtered and Sorted results (Supports origin, length, fawatih, text search, deduplication, and sorting)
  const filteredMatches = useMemo(() => {
    let list = matches;

    // 1. Filter by Origin tab
    if (selectedOriginFilter !== 'all') {
      if (selectedOriginFilter === 'common') {
        list = list.filter((m) => m.systemOrigin === 'common' || m.isIntrinsicCommon);
      } else if (selectedOriginFilter === 'maghribi') {
        list = list.filter((m) => computedTarget ? m.maghribiValue === computedTarget.targetMaghribi : m.systemOrigin === 'maghribi');
      } else if (selectedOriginFilter === 'mashriqi') {
        list = list.filter((m) => computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi');
      }
    }

    // 2. Apply unique/distinct deduplication if enabled (default: true)
    if (isFilterUnique) {
      const seen = new Set<string>();
      list = list.filter((m) => {
        const clean = `${m.cleanPhrase.replace(/\s+/g, ' ').trim()}_${m.systemOrigin}`;
        if (seen.has(clean)) return false;
        seen.add(clean);
        return true;
      });
    }

    // 3. Filter by Result Length (عدد الكلمات)
    if (matchLengthFilter !== 'all') {
      if (matchLengthFilter === 'single') {
        list = list.filter((m) => m.wordCount === 1);
      } else if (matchLengthFilter === 'short') {
        list = list.filter((m) => m.wordCount >= 2 && m.wordCount <= 3);
      } else if (matchLengthFilter === 'medium') {
        list = list.filter((m) => m.wordCount >= 4 && m.wordCount <= 6);
      } else if (matchLengthFilter === 'long') {
        list = list.filter((m) => m.wordCount >= 7);
      }
    }

    // 4. Filter by 29 Surahs with Muqatta'at (ذوات الفواتح فقط)
    if (onlyFawatihSurahs) {
      list = list.filter((m) => FAWATIH_SURAH_NUMBERS.has(m.surahNumber));
    }

    // 4.5 Link with Noorani Filtered Surahs or Selected Formula (ربط النتائج بالسور المفلترة في قسم الفواتح)
    if (linkWithNooraniSurahs && effectiveLinkedSurahNumbers.size > 0) {
      list = list.filter((m) => effectiveLinkedSurahNumbers.has(m.surahNumber));
    }

    // 5. Quick Text Search in results
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

    // 6. Sorting (الترتيب: المصحف / الأقصر / الأطول / المشترك)
    const sorted = [...list];
    if (matchSortBy === 'length_asc') {
      // Shortest phrase first (least words, then least letters, then Mushaf order)
      sorted.sort((a, b) => a.wordCount - b.wordCount || a.letterCount - b.letterCount || a.phrase.length - b.phrase.length || a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
    } else if (matchSortBy === 'length_desc') {
      // Longest phrase first (most words, then most letters, then Mushaf order)
      sorted.sort((a, b) => b.wordCount - a.wordCount || b.letterCount - a.letterCount || b.phrase.length - a.phrase.length || a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
    } else if (matchSortBy === 'system') {
      // Common dual-system matches first, then Mashriqi, then Maghribi
      const sysRank = (m: InverseQuranicMatch) => (m.systemOrigin === 'common' || m.isIntrinsicCommon ? 3 : m.systemOrigin === 'mashriqi' ? 2 : 1);
      sorted.sort((a, b) => sysRank(b) - sysRank(a) || a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
    } else {
      // Default: Strict Mushaf sequence (Surah order 1 to 114, then Ayah order)
      sorted.sort((a, b) => a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
    }

    return sorted;
  }, [matches, resultsFilter, isFilterUnique, selectedOriginFilter, matchLengthFilter, onlyFawatihSurahs, matchSortBy, computedTarget, FAWATIH_SURAH_NUMBERS, linkWithNooraniSurahs, effectiveLinkedSurahNumbers]);

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
        {computedTarget && (mergedNooraniFormulas.length > 0 || isNooraniCalculating || isNooraniCancelled) && (
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

                  {/* Active Link Status Indicator with Results Table */}
                  <span
                    className={`text-4xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold transition-all ${
                      linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || filterSurahOrders.length > 0)
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : linkWithNooraniSurahs
                        ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        : 'bg-stone-100 dark:bg-stone-850 text-stone-400'
                    }`}
                    title="حالة ربط تصفية السور بين هذا القسم وقسم نتائج المسح الشامل"
                  >
                    <Link2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {linkWithNooraniSurahs && effectiveLinkedSurahNumbers.size > 0
                        ? `مرتبط بالنتائج: (${effectiveLinkedSurahNumbers.size} سورة • ${filteredMatches.length} مطابقة)`
                        : linkWithNooraniSurahs
                        ? 'الربط التلقائي بجدول النتائج مفعل'
                        : 'الربط مفصول (انقر لتفعيله أدناه)'}
                    </span>
                  </span>

                  {activeFormula ? (
                    <span className="text-stone-700 dark:text-stone-200 flex items-center gap-1.5 font-sans">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                        • التركيبة: {activeSurahOrdersSet.size} من 29 سورة
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
                  ) : filterSurahOrders.length === 0 ? (
                    <span className="text-stone-400 text-3xs font-sans">
                      (انقر على أي سورة لتصفية نتائج المسح بها فوراً، أو اختر تركيبة أدناه لتلوين وتصفية سورها)
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 text-4xs">
                  {/* Quick Select All Surahs of Active Formula */}
                  {activeFormula && activeFormulaSurahs.length > 0 && filterSurahOrders.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSurahOrders(activeFormula.surahOrders || []);
                        setLinkWithNooraniSurahs(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 cursor-pointer font-sans font-medium flex items-center gap-1 shadow-2xs"
                      title="تحديد كل سور هذه التركيبة للتصفية الدقيقة في جدول النتائج"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>تحديد سور التركيبة ({activeFormulaSurahs.length})</span>
                    </button>
                  )}

                  {/* Clear Filtered Surahs */}
                  {filterSurahOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterSurahOrders([])}
                      className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-pointer font-sans font-medium flex items-center gap-1 shadow-2xs"
                      title="مسح تصفية السور المحددة والعودة للكل"
                    >
                      <span>
                        {filterSurahOrders.length === 1
                          ? `تصفية: سورة ${filteredSurahItem?.surahName || ''}`
                          : `تصفية: ${filterSurahOrders.length} سور`}
                      </span>
                      <span>✕</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Hawamim 7 Detection Banner */}
              {activeSurahOrdersSet.has(21) &&
                activeSurahOrdersSet.has(22) &&
                activeSurahOrdersSet.has(23) &&
                activeSurahOrdersSet.has(27) && (
                  <div className="mb-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-2xs text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold text-xs">✨</span>
                      <span>
                        <strong>رُصدت الحواميم السبع المتتالية (7 سور تبدأ بـ حم):</strong> تضاء تلقائياً في شريط المصحف أدناه (غافر، فصلت، الشورى آية 1، الزخرف، الدخان، الجاثية، الأحقاف)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSurahOrders([21, 22, 23, 24, 25, 26, 27]);
                        setLinkWithNooraniSurahs(true);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-medium text-3xs cursor-pointer shadow-2xs transition-colors shrink-0 self-end sm:self-auto"
                    >
                      تصفية جدول المسح على الحواميم السبع [40 - 46]
                    </button>
                  </div>
                )}

              {/* The 29 Gray / Glowing Squares Track with live match count badges */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 px-0.5 [scrollbar-width:thin] border border-stone-200/60 dark:border-stone-800 rounded bg-white dark:bg-stone-950/40">
                {QURANIC_29_SURAH_FAWATIH.map((surah) => {
                  const isMatchedInFormula = activeSurahOrdersSet.has(surah.orderInFawatih);
                  const isFiltered = filterSurahOrders.includes(surah.orderInFawatih);
                  const surahScanMatches = matchCountsBySurahNumber.get(surah.surahNumber) || 0;

                  const activeFormulaStr = (activeFormula?.formula || computedTarget?.cleanText || inputQuery).trim();
                  const hasHamimActive = isMatchedInFormula && activeFormulaStr.includes('حم');
                  const hasAynSinQafActive = isMatchedInFormula && activeFormulaStr.includes('عسق');

                  return (
                    <button
                      key={surah.orderInFawatih}
                      type="button"
                      onClick={() => {
                        setFilterSurahOrders((prev) =>
                          prev.includes(surah.orderInFawatih)
                            ? prev.filter((o) => o !== surah.orderInFawatih)
                            : [...prev, surah.orderInFawatih]
                        );
                        // Ensure linking is enabled so user sees the filtered results immediately
                        setLinkWithNooraniSurahs(true);
                      }}
                      className={`relative shrink-0 flex flex-col items-center justify-center p-1 rounded transition-colors duration-150 cursor-pointer min-w-[52px] text-center border ${
                        isFiltered
                          ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-100 font-bold opacity-100 z-10 shadow-xs'
                          : isMatchedInFormula
                          ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-400 shadow-sm ring-2 ring-emerald-400/80 z-10 font-bold opacity-100'
                          : 'bg-stone-100 dark:bg-stone-850/80 border-stone-200 dark:border-stone-750 text-stone-500 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-800 opacity-60 hover:opacity-100'
                      }`}
                      title={`#${surah.orderInFawatih}: سورة ${surah.surahName} (${surah.surahNumber}) - الفاتحة: ${surah.formula} - ${surah.familyLabel} | مطابقات المسح: ${surahScanMatches} - انقر لتصفية النتائج في جدول المسح الشامل`}
                    >
                      <div className="flex items-center justify-between w-full text-[8px] font-mono leading-none mb-0.5 px-0.5">
                        <span className={isFiltered ? 'text-amber-800 dark:text-amber-300 font-bold' : isMatchedInFormula ? 'text-emerald-100' : 'text-stone-400 dark:text-stone-500'}>
                          #{surah.orderInFawatih}
                        </span>
                        <span className={isFiltered ? 'text-amber-800 dark:text-amber-300 font-bold' : isMatchedInFormula ? 'text-amber-200 font-bold' : 'text-stone-400 dark:text-stone-500'}>
                          {surah.surahNumber}
                        </span>
                      </div>

                      <div className="text-xs font-quran font-bold leading-tight flex items-center justify-center">
                        {surah.orderInFawatih === 23 ? (
                          <span className="flex items-center gap-0.5" title="سورة الشورى: الآية 1 {حم} • الآية 2 {عسق}">
                            <span
                              className={`px-0.5 rounded transition-all ${
                                hasHamimActive
                                  ? 'bg-amber-400 text-stone-950 font-extrabold ring-1 ring-amber-300 dark:bg-amber-400'
                                  : isMatchedInFormula
                                  ? 'opacity-90'
                                  : 'opacity-70'
                              }`}
                            >
                              حم
                            </span>
                            <span className="text-[9px] opacity-40 font-sans">•</span>
                            <span
                              className={`px-0.5 rounded transition-all ${
                                hasAynSinQafActive
                                  ? 'bg-amber-400 text-stone-950 font-extrabold ring-1 ring-amber-300 dark:bg-amber-400'
                                  : hasHamimActive
                                  ? 'opacity-40 text-stone-300 dark:text-stone-500 text-[10px]'
                                  : isMatchedInFormula
                                  ? 'opacity-90'
                                  : 'opacity-70'
                              }`}
                            >
                              عسق
                            </span>
                          </span>
                        ) : (
                          surah.formula
                        )}
                      </div>

                      <div className={`text-[8.5px] truncate max-w-[48px] font-sans mt-0.5 ${isFiltered ? 'text-amber-900 dark:text-amber-100 font-bold' : isMatchedInFormula ? 'text-white' : 'text-stone-600 dark:text-stone-400'}`}>
                        {surah.surahName}
                      </div>

                      {/* Real-time Match Count Badge from Comprehensive Scan */}
                      {surahScanMatches > 0 && (
                        <div
                          className={`mt-0.5 text-[8px] font-mono font-bold px-1 rounded-full ${
                            isFiltered
                              ? 'bg-amber-600 text-white'
                              : isMatchedInFormula
                              ? 'bg-white/90 text-emerald-900'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          }`}
                          title={`يوجد ${surahScanMatches} مطابقة في سورة ${surah.surahName}`}
                        >
                          {surahScanMatches}م
                        </div>
                      )}

                      {isMatchedInFormula && !isFiltered && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white animate-pulse" />
                      )}
                      {isFiltered && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-600 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-0.5">
              {displayedNooraniFormulas.map((n) => {
                const isCopied = copiedFormula === `noorani_${n.key}`;
                const isActive = activeFormula?.key === n.key;

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
                      navigator.clipboard.writeText(n.formula);
                      setCopiedFormula(`noorani_${n.key}`);
                      setTimeout(() => setCopiedFormula(null), 1800);
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs font-quran flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${chipStyle}`}
                    title={`الصيغة: ${n.formula} | الحساب: ${n.displaySum} | تفكيك الحروف: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} ${n.description ? `| ${n.description}` : ''} - انقر لتلوين السور المطابقة في شريط المصحف ونسخ التركيبة`}
                  >
                    <span className="font-bold">{n.formula}</span>
                    {n.isAuthenticQuranicFawatih && (
                      <span className="text-3xs text-amber-500" title="فاتحة سورة أو تركيب قرآني تّام">⭐</span>
                    )}
                    <span className="font-mono text-4xs font-semibold opacity-75">
                      ({n.displaySum})
                    </span>
                    {n.surahOrders && n.surahOrders.length > 0 && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-stone-600 dark:text-stone-300" title="عدد السور المطابقة في المصحف">
                        {n.surahOrders.length}س
                      </span>
                    )}
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
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>المطابقات ({filteredMatches.length} / {matches.length})</span>
            </h3>

            {/* System Color Distinction Badges / Filter Tabs (Concise Captions) */}
            {matches.length > 0 && (
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-stone-200 dark:border-stone-800 p-0.5 bg-stone-100/60 dark:bg-stone-850 text-3xs font-mono">
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
            {/* Filter Toggle Button (Short Caption: بدون تكرار) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFilterUnique((prev) => !prev)}
                className={`px-2 py-1 rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  isFilterUnique
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
                title={isFilterUnique ? 'تصفية التكرار مفعلة (إظهار النتائج الفريدة فقط)' : 'انقر لتصفية النتائج بدون تكرار'}
              >
                <Filter className={`w-3 h-3 ${isFilterUnique ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
                <span>بدون تكرار {isFilterUnique && '✓'}</span>
              </button>
            )}

            {/* Copy Button (Short Caption: نسخ) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className={`px-2 py-1 rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  copiedAll
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs'
                }`}
                title="نسخ جميع النتائج المكتشفة مع تصنيفها إلى الحافظة"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>تم النسخ ({filteredMatches.length})</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" />
                    <span>نسخ ({filteredMatches.length})</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Text Search */}
            {matches.length > 0 && (
              <div className="w-full sm:w-36">
                <input
                  type="text"
                  value={resultsFilter}
                  onChange={(e) => setResultsFilter(e.target.value)}
                  placeholder="بحث سريع..."
                  className="w-full text-xs font-normal px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                />
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Toolbar for Sorting, Length Filtering & Short Captions */}
        {matches.length > 0 && (
          <div className="p-1.5 rounded-lg bg-stone-100/70 dark:bg-stone-850/70 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2 text-3xs font-medium">
            {/* Sorting Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-0.5 shrink-0 ml-0.5">
                <ArrowUpDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>الترتيب:</span>
              </span>
              <div className="inline-flex items-center gap-0.5 bg-white dark:bg-stone-900 p-0.5 rounded-md border border-stone-200 dark:border-stone-750">
                <button
                  type="button"
                  onClick={() => setMatchSortBy('mushaf')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    matchSortBy === 'mushaf'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="الترتيب حسب ورود السور والآيات في المصحف الشريف"
                >
                  المصحف
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('length_asc')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    matchSortBy === 'length_asc'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="ترتيب النتائج من الأقصر إلى الأطول (عدد الكلمات والحروف)"
                >
                  الأقصر أولاً
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('length_desc')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    matchSortBy === 'length_desc'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="ترتيب النتائج من الأطول إلى الأقصر (الآيات والسلاسل الأكبر أولاً)"
                >
                  الأطول أولاً
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('system')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    matchSortBy === 'system'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="إظهار النتائج المشتركة والمتطابقة بين النظامين أولاً"
                >
                  المشترك أولاً
                </button>
              </div>
            </div>

            {/* Length Filter Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-stone-500 dark:text-stone-400 shrink-0 ml-0.5">
                طول النتيجة:
              </span>
              <div className="inline-flex items-center gap-0.5 bg-white dark:bg-stone-900 p-0.5 rounded-md border border-stone-200 dark:border-stone-750">
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('all')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    matchLengthFilter === 'all'
                      ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('single')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    matchLengthFilter === 'single'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="مفردات بكلمة واحدة فقط"
                >
                  مفردة ({countsByLength.single})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('short')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    matchLengthFilter === 'short'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="عبارات قصيرة تتكون من 2 إلى 3 كلمات"
                >
                  قصيرة ({countsByLength.short})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('medium')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    matchLengthFilter === 'medium'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="عبارات متوسطة من 4 إلى 6 كلمات"
                >
                  متوسطة ({countsByLength.medium})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('long')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    matchLengthFilter === 'long'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="عبارات وسلاسل طويلة من 7 كلمات فأكثر"
                >
                  طويلة ({countsByLength.long})
                </button>
              </div>
            </div>

            {/* Additional Quick Toggles & Surah Filtering */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {/* Surah Filter Dropdown (Directly interconnected with Noorani 29 Surahs strip) */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-stone-500 dark:text-stone-400 shrink-0 ml-0.5">
                  السورة:
                </span>
                <select
                  value={
                    filterSurahOrders.length === 1
                      ? String(filterSurahOrders[0])
                      : filterSurahOrders.length > 1
                      ? 'custom_multi'
                      : activeFormula
                      ? 'active_formula'
                      : onlyFawatihSurahs
                      ? 'all_fawatih'
                      : 'all'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      setFilterSurahOrders([]);
                      setSelectedFormulaKey(null);
                      setOnlyFawatihSurahs(false);
                      setLinkWithNooraniSurahs(false);
                    } else if (val === 'all_fawatih') {
                      setFilterSurahOrders([]);
                      setOnlyFawatihSurahs(true);
                      setLinkWithNooraniSurahs(true);
                    } else if (val === 'active_formula') {
                      if (activeFormula && activeFormula.surahOrders) {
                        setFilterSurahOrders(activeFormula.surahOrders);
                        setLinkWithNooraniSurahs(true);
                      }
                    } else {
                      const ord = parseInt(val, 10);
                      if (!isNaN(ord)) {
                        setFilterSurahOrders([ord]);
                        setLinkWithNooraniSurahs(true);
                      }
                    }
                  }}
                  className="text-3xs font-medium px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  title="تصفية النتائج بحسب سورة معينة أو ربطها بسور الفواتح"
                >
                  <option value="all">كافة سور القرآن (114 سورة)</option>
                  <option value="all_fawatih">سور الفواتح الـ 29 (كاملة)</option>
                  {activeFormula && (
                    <option value="active_formula">
                      سور تركيبة «{activeFormula.formula}» ({activeFormulaSurahs.length} سور)
                    </option>
                  )}
                  {filterSurahOrders.length > 1 && (
                    <option value="custom_multi">
                      محدد: {filterSurahOrders.length} سور من الفواتح
                    </option>
                  )}
                  <optgroup label="سور الفواتح النورانية الـ 29">
                    {QURANIC_29_SURAH_FAWATIH.map((s) => {
                      const sMatches = matchCountsBySurahNumber.get(s.surahNumber) || 0;
                      return (
                        <option key={s.orderInFawatih} value={s.orderInFawatih}>
                          #{s.orderInFawatih}: سورة {s.surahName} ({s.formula}) {sMatches > 0 ? `— [${sMatches} مطابقة]` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* Surahs with Fawatih Only Toggle */}
              <button
                type="button"
                onClick={() => {
                  setOnlyFawatihSurahs((prev) => !prev);
                  if (!onlyFawatihSurahs) setLinkWithNooraniSurahs(true);
                }}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 ${
                  onlyFawatihSurahs
                    ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
                }`}
                title="حصر النتائج على سور الفواتح النورانية الـ 29 فقط (كالبقرة وآل عمران ومريم وطه ويس...)"
              >
                <span>فواتح فقط ({fawatihSurahsCount})</span>
                {onlyFawatihSurahs && <span className="text-amber-600">✓</span>}
              </button>

              {/* Link With Noorani Selection Toggle (Always Visible & Connected) */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !linkWithNooraniSurahs;
                  setLinkWithNooraniSurahs(nextVal);
                  // If enabling link and nothing was picked, select active formula or all fawatih surahs
                  if (nextVal && effectiveLinkedSurahNumbers.size === 0 && !onlyFawatihSurahs) {
                    if (activeFormula && activeFormula.surahOrders && activeFormula.surahOrders.length > 0) {
                      setFilterSurahOrders(activeFormula.surahOrders);
                    } else {
                      setOnlyFawatihSurahs(true);
                    }
                  }
                }}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 ${
                  linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || onlyFawatihSurahs)
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                    : linkWithNooraniSurahs
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
                }`}
                title={
                  linkWithNooraniSurahs
                    ? 'ربط النتائج بسور قسم الأحرف المقطعة مفعل - انقر لفك الربط'
                    : 'انقر لتفعيل ربط النتائج بسور الفواتح والتركيبة المحددة'
                }
              >
                <Link2 className={`w-3 h-3 ${linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || onlyFawatihSurahs) ? 'text-white' : 'text-emerald-600'}`} />
                <span>ربط بسور الفواتح</span>
                {linkWithNooraniSurahs && (
                  <span className="font-mono text-3xs font-bold">
                    {effectiveLinkedSurahNumbers.size > 0 ? `(${effectiveLinkedSurahNumbers.size}س)` : '✓'}
                  </span>
                )}
              </button>

              {/* Short Captions Mode Toggle */}
              <button
                type="button"
                onClick={() => setUseShortCaptions((prev) => !prev)}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 ${
                  useShortCaptions
                    ? 'bg-indigo-100 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
                }`}
                title="تفعيل الكابشنات المختصرة لجعل عرض البطاقات أكثر تركيزاً وإيجازاً"
              >
                <span>كابشن مختصر</span>
                {useShortCaptions && <span className="text-indigo-600">✓</span>}
              </button>
            </div>
          </div>
        )}

        {/* Linked Noorani Surahs Active Filter Banner */}
        {linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || onlyFawatihSurahs) && (
          <div className="p-2 sm:p-2.5 rounded-xl bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-amber-950/40 border border-emerald-300/80 dark:border-emerald-700/80 flex items-center justify-between gap-2 flex-wrap text-3xs font-medium animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0">
                <Link2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-stone-700 dark:text-stone-200 font-semibold">
                {filterSurahOrders.length > 0
                  ? `النتائج محصورة في السور المحددة (${effectiveLinkedSurahItems.length} سورة):`
                  : activeFormula
                  ? `النتائج محصورة في سور تركيبة «${activeFormula.formula}» (${effectiveLinkedSurahItems.length} سورة):`
                  : 'النتائج محصورة في سور الفواتح النورانية الـ 29:'}
              </span>

              {/* Clickable Surah Pills to isolate or toggle */}
              <div className="flex items-center gap-1 flex-wrap">
                {effectiveLinkedSurahItems.slice(0, 14).map((surah) => {
                  const surahMatches = matchCountsBySurahNumber.get(surah.surahNumber) || 0;
                  const isSole = filterSurahOrders.length === 1 && filterSurahOrders[0] === surah.orderInFawatih;
                  return (
                    <button
                      key={surah.orderInFawatih}
                      type="button"
                      onClick={() => {
                        // Clicking a pill isolates it or toggles it
                        if (isSole) {
                          setFilterSurahOrders([]);
                        } else {
                          setFilterSurahOrders([surah.orderInFawatih]);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md border text-3xs flex items-center gap-1 shadow-2xs cursor-pointer transition-all ${
                        isSole
                          ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold'
                          : 'bg-white dark:bg-stone-850 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-50'
                      }`}
                      title={`انقر لعزل سورة ${surah.surahName} وحدها`}
                    >
                      <span className="font-bold">سورة {surah.surahName}</span>
                      <span className="text-stone-400 font-mono text-4xs">({surah.formula})</span>
                      {surahMatches > 0 && (
                        <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono text-4xs font-bold">
                          {surahMatches}م
                        </span>
                      )}
                    </button>
                  );
                })}
                {effectiveLinkedSurahItems.length > 14 && (
                  <span className="text-stone-500 font-mono text-4xs">
                    +{effectiveLinkedSurahItems.length - 14} سور أخرى
                  </span>
                )}
              </div>

              <span className="text-emerald-800 dark:text-emerald-300 font-bold font-mono text-2xs mr-1">
                ({filteredMatches.length} من {matches.length} مطابقة)
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setLinkWithNooraniSurahs(false)}
                className="px-2 py-0.5 rounded bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer flex items-center gap-1 font-medium transition-colors text-3xs shadow-2xs"
                title="إيقاف حصر النتائج وعرض كافة سور القرآن الـ 114"
              >
                <span>فك الربط (عرض الكل)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterSurahOrders([]);
                  setSelectedFormulaKey(null);
                  setOnlyFawatihSurahs(false);
                }}
                className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer flex items-center gap-1 font-medium transition-colors text-3xs shadow-2xs"
                title="إلغاء تصفية السور والتركيبة والعودة لكافة السور"
              >
                <span>إلغاء التصفية ✕</span>
              </button>
            </div>
          </div>
        )}

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

                      <a
                        href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs sm:text-sm font-semibold font-quran text-stone-900 dark:text-stone-100 leading-normal truncate hover:underline hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer ${textHoverClass}`}
                        title={`البحث عن «${item.phrase}» في المصحف الشريف بموقع (qran-top)`}
                      >
                        {item.phrase}
                      </a>

                      {isCopied && (
                        <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal shrink-0">
                          تم
                        </span>
                      )}
                    </div>

                    {/* Left side (الجهة المقابلة للنتيجة): Smallest font Surah/Ayah + Muqatta'at + Copy + Notebook */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Small Surah Name + Ayah Number + Disconnected Letters in smallest font -> Searches for the word in Quran on qran-top */}
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400 dark:text-stone-500 font-sans shrink-0 whitespace-nowrap">
                        <a
                          href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-emerald-700 dark:hover:text-emerald-300 text-stone-500 dark:text-stone-400 cursor-pointer inline-flex items-center gap-0.5 font-medium"
                          title={`البحث عن كلمة «${item.phrase}» في المصحف الشريف بموقع (qran-top)`}
                        >
                          <BookOpen className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{useShortCaptions ? `${item.surahName}:${item.ayahNumber}` : `(${item.surahName}:${item.ayahNumber})`}</span>
                          <ExternalLink className="w-2 h-2 opacity-60 shrink-0" />
                        </a>
                        {surahMuqattaat && (
                          <span
                            className={`text-[9px] font-sans px-0.5 font-medium rounded ${
                              effectiveLinkedSurahNumbers.has(item.surahNumber)
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold'
                                : 'text-stone-500 dark:text-stone-400'
                            }`}
                            title={`الأحرف المقطعة في فاتحة سورة ${item.surahName}: ${surahMuqattaat}${
                              effectiveLinkedSurahNumbers.has(item.surahNumber) ? ' (متطابقة مع السور المفلترة ⭐)' : ''
                            }`}
                          >
                            [{surahMuqattaat}]
                            {effectiveLinkedSurahNumbers.has(item.surahNumber) && '⭐'}
                          </span>
                        )}
                        {item.wordCount > 1 && !useShortCaptions && (
                          <span className="text-[9px] font-mono text-stone-400 dark:text-stone-500 px-0.5" title={`عدد الكلمات: ${item.wordCount}`}>
                            ({item.wordCount}ك)
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
                              <a
                                href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
                                title={`البحث عن كلمة «${item.phrase}» في المصحف الشريف بموقع (qran-top)`}
                              >
                                <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>سورة {item.surahName} [الآية {item.ayahNumber}]</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
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
