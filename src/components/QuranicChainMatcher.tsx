import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Book,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useGematria, MAGHRIBI_VALUES, MASHRIQI_VALUES } from '../context/GematriaContext';
import { useTheme } from '../context/ThemeContext';
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
  SynthesizedTextResult,
  countHamimInFormula,
  isStrictlyAuthenticHamimFormula,
} from '../utils/gematriaEngine';
import { useNooraniClassifier } from '../hooks/useNooraniClassifier';
import { useHint } from '../context/HintContext';
import {
  InverseQuranicScanner,
  InverseQuranicMatch,
  ScannerProgress,
} from '../utils/inverseQuranicMatcher';
import { getSurahMuqattaat, getQuranTopSearchUrl, getArabicDictSearchUrl } from '../utils/quranicDictionary';
import { AddToNotebookButton } from './AddToNotebookButton';
import { NOORANI_LETTERS_SET } from '../cipherData';
import { QuranicChainHistory, QuranicChainHistoryItem } from './QuranicChainHistory';
import { DosBlinkBlockInput } from './DosBlinkBlockInput';

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

/**
 * Normalizes Arabic text for flexible, diacritic-insensitive search
 */
function normalizeArabicForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove tashkeel, dagger alif, and quranic symbols
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Highlights searched terms within Quranic full Ayah text
 */
function highlightQuranText(fullText: string, query: string): React.ReactNode {
  if (!fullText || !query.trim()) return fullText;
  const cleanQ = query.trim();
  const normQ = normalizeArabicForSearch(cleanQ);

  // Direct case-insensitive match if simple
  const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const directParts = fullText.split(regex);
  if (directParts.length > 1) {
    return directParts.map((part, idx) =>
      part.toLowerCase() === cleanQ.toLowerCase() ? (
        <mark key={idx} className="bg-amber-300/80 dark:bg-amber-600/60 text-stone-900 dark:text-stone-100 rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  // Word-by-word normalized match for Quranic text with diacritics
  const words = fullText.split(' ');
  return words.map((w, idx) => {
    const normW = normalizeArabicForSearch(w);
    const isMatch = normW.includes(normQ) || (normQ.length >= 3 && normW.length >= 3 && (normW.startsWith(normQ) || normQ.includes(normW)));
    return (
      <React.Fragment key={idx}>
        {idx > 0 && ' '}
        {isMatch ? (
          <mark className="bg-amber-300/80 dark:bg-amber-600/60 text-stone-900 dark:text-stone-100 rounded px-0.5 font-bold">
            {w}
          </mark>
        ) : (
          w
        )}
      </React.Fragment>
    );
  });
}

interface QuranicChainMatcherProps {
  initialQuery?: string;
  isWideMode?: boolean;
  toggleWideMode?: () => void;
}

export function QuranicChainMatcher({
  initialQuery = '',
  isWideMode = false,
  toggleWideMode,
}: QuranicChainMatcherProps) {
  const { activeTable, calculationOptions, findArabicMatches } = useGematria();
  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint, setCurrentQuery } = useHint();

  const [inputQuery, setInputQuery] = useState<string>(() => initialQuery || '');
  const [committedQuery, setCommittedQuery] = useState<string>(() => (initialQuery || '').trim());

  // Domain switcher: 'quran' | 'arabic_dict'
  const [activeDomainTab, setActiveDomainTab] = useState<'quran' | 'arabic_dict'>('quran');
  const [arabicMatches, setArabicMatches] = useState<SynthesizedTextResult[]>([]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim() && initialQuery.trim() !== committedQuery) {
      setInputQuery(initialQuery.trim());
      setCommittedQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  const [selectedScope, setSelectedScope] = useState<'all' | 'verses_and_chains' | 'chains_only' | 'single_words'>('all');
  const [onlyNoorani, setOnlyNoorani] = useState<boolean>(false);
  const [isFilterUnique, setIsFilterUnique] = useState<boolean>(true);
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<'all' | 'common' | 'maghribi' | 'mashriqi' | 'verbatim'>('all');
  const [resultsFilter, setResultsFilter] = useState<string>('');
  const [searchInFullAyah, setSearchInFullAyah] = useState<boolean>(true);

  // Results Grid Sorting & Length Filters (ترتيب وتصفية النتائج والكابشنات المختصرة)
  const [matchSortBy, setMatchSortBy] = useState<'mushaf' | 'length_asc' | 'length_desc' | 'system'>('mushaf');
  const [matchLengthFilter, setMatchLengthFilter] = useState<'all' | 'single' | 'short' | 'medium' | 'long'>('all');
  const [onlyFawatihSurahs, setOnlyFawatihSurahs] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(false);
  const [linkWithNooraniSurahs, setLinkWithNooraniSurahs] = useState<boolean>(false);

  // Noorani Formulas Filtering State
  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(false);
  const [isExplicitlyUnpinned, setIsExplicitlyUnpinned] = useState<boolean>(false);
  const [excludedLetters, setExcludedLetters] = useState<string[]>([]);
  const [repeatFilterMode, setRepeatFilterMode] = useState<'all' | 'repeated_only' | 'highest_repeats' | 'hamim_max' | 'unique_only'>('all');
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

  // Multi-Stage Sequential Pipeline Phase ('idle' | 'noorani' | 'quran' | 'processing' | 'arabic' | 'preparing' | 'completed')
  type ScanPipelinePhase = 'idle' | 'noorani' | 'quran' | 'processing' | 'arabic' | 'preparing' | 'completed';
  const [pipelinePhase, setPipelinePhase] = useState<ScanPipelinePhase>('idle');
  const isPipelineRunning = pipelinePhase === 'noorani' || pipelinePhase === 'quran' || pipelinePhase === 'processing' || pipelinePhase === 'arabic' || pipelinePhase === 'preparing';
  const [isStartBtnDepressed, setIsStartBtnDepressed] = useState<boolean>(false);

  interface ArabicScanProgress {
    isRunning: boolean;
    percent: number;
    message: string;
    foundCount: number;
    isCompleted: boolean;
  }
  const [arabicProgress, setArabicProgress] = useState<ArabicScanProgress>({
    isRunning: false,
    percent: 0,
    message: '',
    foundCount: 0,
    isCompleted: false,
  });
  const nooraniStartedRef = useRef(false);

  // Progressive rendering limit to prevent browser freeze when rendering thousands of items
  const [visibleLimit, setVisibleLimit] = useState<number>(90);

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

  // Multiplier State (مضاعف الكلمة المبحوث عنها)
  const [multiplier, setMultiplier] = useState<number>(1);
  const [multiplierInput, setMultiplierInput] = useState<string>('1');

  useEffect(() => {
    setVisibleLimit(90);
  }, [committedQuery, multiplier, selectedScope, selectedOriginFilter, resultsFilter, matchLengthFilter, onlyFawatihSurahs]);

  // Computed Target Information (calculated only when user presses "ابدأ" or triggers scan)
  interface ComputedTargetInfo {
    isDirectNumber: boolean;
    baseMaghribi?: number;
    baseMashriqi?: number;
    multiplier?: number;
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

  // Helper to compute target info on demand (including multiplier)
  const computeTargetInfo = (
    text: string,
    rules: GematriaCalculationOptions,
    flexOrth: boolean,
    mult: number = 1
  ): ComputedTargetInfo | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const safeMult = Math.max(1, Math.floor(mult || 1));

    const numCheck = parseNumericQuery(trimmed);
    if (numCheck.isNumber) {
      const baseVal = numCheck.value;
      const targetVal = baseVal * safeMult;
      return {
        isDirectNumber: true,
        baseMaghribi: baseVal,
        baseMashriqi: baseVal,
        multiplier: safeMult,
        targetMaghribi: targetVal,
        targetMashriqi: targetVal,
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
    const baseMag = calculateGematriaWithOptions(trimmed, rules, MAGHRIBI_VALUES);
    const baseMash = calculateGematriaWithOptions(trimmed, rules, MASHRIQI_VALUES);
    const magVal = baseMag * safeMult;
    const mashVal = baseMash * safeMult;

    // Compute alternate targets when flexibleOrthography is enabled
    const altTargets: number[] = [];
    if (flexOrth) {
      // 1. Alternate dagger alif (حساب مع الألف الخنجرية وبدونها)
      const altDagger: GematriaCalculationOptions = {
        ...rules,
        daggerAlif: rules.daggerAlif === 'count_as_1' ? 'ignore_0' : 'count_as_1',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altDagger, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(trimmed, altDagger, MASHRIQI_VALUES) * safeMult);

      // 2. Alternate silent waw (أولو / أولئك)
      const altWaw: GematriaCalculationOptions = {
        ...rules,
        silentWawMode: rules.silentWawMode === 'count_as_6' ? 'ignore_0' : 'count_as_6',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altWaw, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(trimmed, altWaw, MASHRIQI_VALUES) * safeMult);

      // 3. Alternate uthmani waw (الصلوة / الزكوة)
      const altUthmaniWaw: GematriaCalculationOptions = {
        ...rules,
        uthmaniWawMode: rules.uthmaniWawMode === 'as_alif_1' ? 'as_waw_6' : 'as_alif_1',
      };
      altTargets.push(calculateGematriaWithOptions(trimmed, altUthmaniWaw, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(trimmed, altUthmaniWaw, MASHRIQI_VALUES) * safeMult);
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
      baseMaghribi: baseMag,
      baseMashriqi: baseMash,
      multiplier: safeMult,
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
    return computeTargetInfo(committedQuery, localRules, flexibleOrthography, multiplier);
  }, [committedQuery, localRules, flexibleOrthography, multiplier]);

  const isTargetDiffering = useMemo(() => {
    return computedTarget ? !computedTarget.isIdentical : false;
  }, [computedTarget]);



  const filteredArabicMatches = useMemo(() => {
    if (!resultsFilter.trim()) return arabicMatches;
    const q = resultsFilter.trim().toLowerCase();
    return arabicMatches.filter((m) => m.text.includes(q));
  }, [arabicMatches, resultsFilter]);

  // Noorani combinations classified and merged across Mashriqi and Maghribi systems
  const NOORANI_14_LETTERS = ['ا', 'ل', 'م', 'ص', 'ر', 'ك', 'ه', 'ي', 'ع', 'ط', 'س', 'ح', 'ق', 'ن'];

  const toggleExcludedLetter = (letter: string) => {
    setExcludedLetters((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
    );
  };

  const clearExcludedLetters = () => {
    setExcludedLetters([]);
  };

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
    uniqueNooraniOnly: uniqueNooraniOnly || repeatFilterMode === 'unique_only',
    excludedLetters,
    onlyRepeated: repeatFilterMode === 'repeated_only' || repeatFilterMode === 'highest_repeats',
    queryText: computedTarget?.queryText || committedQuery,
    maxResults: 100,
  });

  // Helper to determine if a result item matches the exact searched query in the Holy Quran
  const isVerbatimMatch = useCallback((phrase: string, cleanPhrase?: string) => {
    const rawTarget = (committedQuery || inputQuery).trim();
    if (!rawTarget) return false;
    const cleanTarget = cleanArabicTextForGematria(rawTarget);
    if (!cleanTarget) return false;

    const cleanItem = cleanArabicTextForGematria(cleanPhrase || phrase);
    if (cleanItem === cleanTarget) return true;

    const words = cleanItem.split(/\s+/);
    if (words.length === 1 && words[0] === cleanTarget) return true;

    return false;
  }, [committedQuery, inputQuery]);

  // Single Unified Progress Percentage for the entire search pipeline (Smooth 0% -> 100%, never hangs at 100%)
  const unifiedPercent = useMemo(() => {
    if (!isPipelineRunning) return 0;
    if (progress.percent === 100 && (pipelinePhase === 'completed' || progress.currentSurahOrPhase.includes('100%'))) {
      return 100;
    }
    if (pipelinePhase === 'noorani') {
      return Math.min(25, Math.max(5, Math.round((nooraniProgress || 5) * 0.25)));
    }
    if (pipelinePhase === 'quran') {
      return Math.min(80, Math.max(25, 25 + Math.round((progress.percent || 0) * 0.55)));
    }
    if (pipelinePhase === 'processing') {
      return 85;
    }
    if (pipelinePhase === 'arabic') {
      return Math.min(94, Math.max(88, 88 + Math.round((arabicProgress.percent || 0) * 0.06)));
    }
    if (pipelinePhase === 'preparing') {
      return 98;
    }
    return 100;
  }, [isPipelineRunning, pipelinePhase, nooraniProgress, progress.percent, progress.currentSurahOrPhase, arabicProgress.percent]);

  // Count formulas that have repeated elements for badge
  const repeatedFormulasCount = useMemo(() => {
    return mergedNooraniFormulas.filter((f) => f.maxRepeatCount && f.maxRepeatCount > 1).length;
  }, [mergedNooraniFormulas]);

  // Count formulas containing Hamim (حم) that are strictly authentic
  const hamimFormulasCount = useMemo(() => {
    return mergedNooraniFormulas.filter(
      (f) => countHamimInFormula(f.formula) > 0 && isStrictlyAuthenticHamimFormula(f.formula)
    ).length;
  }, [mergedNooraniFormulas]);

  const displayedNooraniFormulas = useMemo(() => {
    let list = [...mergedNooraniFormulas];

    // Strictly hide any invalid Hamim combinations with loose non-fawatih letters
    list = list.filter((f) => isStrictlyAuthenticHamimFormula(f.formula));

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

    // Client-side Excluded Letters Filter
    if (excludedLetters.length > 0) {
      const exclSet = new Set(excludedLetters);
      list = list.filter((f) => !f.letters.some((c) => exclSet.has(c)));
    }

    // Repetition Mode Filter
    if (repeatFilterMode === 'hamim_max') {
      list = list.filter((f) => countHamimInFormula(f.formula) > 0 && isStrictlyAuthenticHamimFormula(f.formula));
    } else if (repeatFilterMode === 'repeated_only') {
      list = list.filter((f) => f.maxRepeatCount && f.maxRepeatCount > 1);
    } else if (repeatFilterMode === 'unique_only') {
      list = list.filter((f) => !f.hasDuplicates && (!f.maxRepeatCount || f.maxRepeatCount <= 1));
    }

    // Sorting: Hamim Max / Highest Repeats / Quranic Match
    if (repeatFilterMode === 'hamim_max') {
      list.sort((a, b) => {
        const hamimA = countHamimInFormula(a.formula);
        const hamimB = countHamimInFormula(b.formula);
        if (hamimB !== hamimA) return hamimB - hamimA;
        const repA = a.maxRepeatCount || 1;
        const repB = b.maxRepeatCount || 1;
        if (repB !== repA) return repB - repA;
        const countA = a.surahOrders?.length || 0;
        const countB = b.surahOrders?.length || 0;
        if (countA !== countB) return countB - countA;
        return a.letters.length - b.letters.length;
      });
    } else if (repeatFilterMode === 'highest_repeats') {
      list.sort((a, b) => {
        const repA = a.maxRepeatCount || 1;
        const repB = b.maxRepeatCount || 1;
        if (repB !== repA) return repB - repA;
        const countA = a.surahOrders?.length || 0;
        const countB = b.surahOrders?.length || 0;
        if (countA !== countB) return countB - countA;
        return a.letters.length - b.letters.length;
      });
    } else if (sortByQuranicMatch) {
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
  }, [
    nooraniSystemFilter,
    mergedNooraniFormulas,
    filterSurahOrders,
    sortByQuranicMatch,
    excludedLetters,
    repeatFilterMode,
  ]);

  // Reset explicit unpin state whenever committed query changes
  useEffect(() => {
    setIsExplicitlyUnpinned(false);
  }, [committedQuery]);

  // Handler to completely unpin formula and reset Surah filter to all 114 Surahs
  const handleUnpinAndClearSurahs = () => {
    setSelectedFormulaKey(null);
    setIsExplicitlyUnpinned(true);
    setFilterSurahOrders([]);
    setLinkWithNooraniSurahs(false);
    setOnlyFawatihSurahs(false);
  };

  // Active formula: activates on click or auto-selects from authentic query match
  const activeFormula = useMemo(() => {
    if (isExplicitlyUnpinned) return null;
    if (selectedFormulaKey) {
      return mergedNooraniFormulas.find((f) => f.key === selectedFormulaKey) || null;
    }
    return null;
  }, [selectedFormulaKey, mergedNooraniFormulas, isExplicitlyUnpinned]);

  // Inferred surah orders directly from input query (e.g. user typed "حم حم حم حم حم حم حم" or "الم")
  const effectiveQuerySurahOrders = useMemo(() => {
    const text = (computedTarget?.cleanText || inputQuery).trim();
    if (!text) return [];
    return inferSurahOrdersFromFormula(text);
  }, [computedTarget, inputQuery]);

  const activeSurahOrdersSet = useMemo(() => {
    if (isExplicitlyUnpinned) return new Set<number>();
    if (activeFormula?.surahOrders && activeFormula.surahOrders.length > 0) {
      return new Set<number>(activeFormula.surahOrders);
    }
    if (effectiveQuerySurahOrders.length > 0) {
      return new Set<number>(effectiveQuerySurahOrders);
    }
    return new Set<number>();
  }, [activeFormula, effectiveQuerySurahOrders, isExplicitlyUnpinned]);

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

  // Surahs associated strictly with the active Noorani formula
  const activeFormulaSurahs = useMemo(() => {
    if (!activeFormula || !activeFormula.surahOrders || activeFormula.surahOrders.length === 0) {
      return [];
    }
    return QURANIC_29_SURAH_FAWATIH.filter((s) => activeFormula.surahOrders.includes(s.orderInFawatih));
  }, [activeFormula]);

  const activeFormulaSurahNumbers = useMemo(() => {
    return new Set<number>(activeFormulaSurahs.map((s) => s.surahNumber));
  }, [activeFormulaSurahs]);

  // Backwards compatibility alias
  const effectiveActiveSurahs = activeFormulaSurahs;
  const effectiveActiveSurahNumbers = activeFormulaSurahNumbers;

  // Effective linked Surahs between the Noorani Muqatta'at section and the Comprehensive Scan results
  // Only applies when explicit Surah filters are active or when user specifically links with active formula
  const effectiveLinkedSurahNumbers = useMemo(() => {
    if (filterSurahOrders.length > 0) {
      return filteredSurahNumbers;
    }
    return new Set<number>();
  }, [filterSurahOrders, filteredSurahNumbers]);

  const effectiveLinkedSurahItems = useMemo(() => {
    if (filterSurahOrders.length > 0) {
      return filteredSurahItems;
    }
    return [];
  }, [filterSurahOrders, filteredSurahItems]);

  // Auto-select formula matching query if none explicitly selected and user hasn't unpinned
  useEffect(() => {
    if (isExplicitlyUnpinned) return;
    if (!selectedFormulaKey && mergedNooraniFormulas.length > 0) {
      const cleanQ = (computedTarget?.cleanText || committedQuery).trim();
      const exact = mergedNooraniFormulas.find((f) => f.formula === cleanQ);
      if (exact) {
        setSelectedFormulaKey(exact.key);
      }
    }
  }, [mergedNooraniFormulas, selectedFormulaKey, isExplicitlyUnpinned, computedTarget, committedQuery]);

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
    matchesTotal?: number,
    mult: number = 1
  ) => {
    if (!queryText.trim()) return;
    setSearchHistory((prev) => {
      const existing = prev.find(
        (item) => item.query === queryText && item.scope === scope && item.onlyNoorani === nooraniOnly && (item.multiplier || 1) === mult
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
        multiplier: mult,
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

  // Start Phase 3: Arabic Lexicon Scan (runs asynchronously with UI yielding)
  const startArabicScanPhaseAsync = async (targetMag: number, targetMash: number, isIdenticalVal: boolean) => {
    try {
      setArabicProgress({
        isRunning: true,
        percent: 50,
        message: 'جاري فحص واستخراج مطابقات المعجم العربي...',
        foundCount: 0,
        isCompleted: false,
      });

      // Yield to let browser update DOM
      await new Promise((r) => setTimeout(r, 40));

      const targetVal = isIdenticalVal ? targetMag : targetMash;
      let finalResults: SynthesizedTextResult[] = [];
      if (targetVal > 0) {
        const res = findArabicMatches(targetVal, { maxResults: 300, tableId: activeTable.id });
        if (!isIdenticalVal && targetMag !== targetMash) {
          const magRes = findArabicMatches(targetMag, { maxResults: 150, tableId: activeTable.id });
          const map = new Map<string, SynthesizedTextResult>();
          res.forEach((r) => map.set(r.text, r));
          magRes.forEach((r) => map.set(r.text, r));
          finalResults = Array.from(map.values());
        } else {
          finalResults = res;
        }
      }

      setArabicMatches(finalResults);
      setArabicProgress({
        isRunning: false,
        percent: 100,
        message: `تم العثور على ${finalResults.length} مفردة معجمية مطابقة`,
        foundCount: finalResults.length,
        isCompleted: true,
      });

      await new Promise((r) => setTimeout(r, 40));
    } catch (err) {
      console.error('Arabic scan error:', err);
      setArabicProgress({
        isRunning: false,
        percent: 100,
        message: 'اكتمل البحث في المعجم العربي',
        foundCount: 0,
        isCompleted: true,
      });
    }
  };

  // Start Phase 2: Comprehensive Quran Scan (runs automatically after Noorani completes)
  const startQuranScanPhase = async (
    customQuery?: string,
    customScope?: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words',
    customOnlyNoorani?: boolean,
    customMultiplier?: number
  ) => {
    const q = (customQuery || committedQuery || inputQuery).trim();
    if (!q) return;

    if (!scannerRef.current) {
      scannerRef.current = new InverseQuranicScanner();
    }

    const scopeToUse = customScope !== undefined ? customScope : selectedScope;
    const nooraniToUse = customOnlyNoorani !== undefined ? customOnlyNoorani : onlyNoorani;
    const multToUse = customMultiplier !== undefined ? customMultiplier : multiplier;

    const targetDetails = computeTargetInfo(q, localRules, flexibleOrthography, multToUse);
    const targetMag = targetDetails ? targetDetails.targetMaghribi : 0;
    const targetMash = targetDetails ? targetDetails.targetMashriqi : 0;
    const isIdenticalVal = targetDetails ? targetDetails.isIdentical : true;

    setProgress({
      percent: 0,
      scannedCount: 0,
      totalCount: 114,
      matchesCount: 0,
      itemsPerSecond: 0,
      currentSurahOrPhase: 'المرحلة 2: بدء المسح القرآني المدمج (الشرقي + الغربي)...',
      isRunning: true,
      isCompleted: false,
      isCancelled: false,
    });

    recordSearchInHistory(q, scopeToUse, nooraniToUse, targetMag, targetMash, isIdenticalVal, undefined, multToUse);

    let matchBatch: InverseQuranicMatch[] = [];
    let lastFlushTime = Date.now();

    try {
      await scannerRef.current.scan(
        targetMag,
        targetMash,
        {
          calcOptions: localRules,
          scope: scopeToUse,
          onlyNoorani: nooraniToUse,
          maxResults: 2500,
          maxPhraseLength: 16,
          alternateTargets: targetDetails?.alternateTargets || [],
          onProgress: (p) => {
            setProgress(p);
          },
          onMatch: (newMatch) => {
            matchBatch.push(newMatch);
            const now = Date.now();
            if (now - lastFlushTime > 120) {
              lastFlushTime = now;
              setMatches([...matchBatch]);
            }
          },
          onComplete: async (allMatches, cancelled) => {
            if (cancelled) {
              setPipelinePhase('idle');
              return;
            }

            // Step 1: Processing matches (82%)
            setPipelinePhase('processing');
            setProgress((prev) => ({
              ...prev,
              percent: 82,
              currentSurahOrPhase: `[المرحلة 3/4]: جاري فرز وترتيب وتدقيق ${allMatches.length} مطابقة قرآنية...`,
            }));
            await new Promise((r) => setTimeout(r, 40));

            setMatches(allMatches);
            recordSearchInHistory(
              q,
              scopeToUse,
              nooraniToUse,
              targetMag,
              targetMash,
              isIdenticalVal,
              allMatches.length,
              multToUse
            );

            // Step 2: Arabic lexicon scan (90%)
            setPipelinePhase('arabic');
            setProgress((prev) => ({
              ...prev,
              percent: 90,
              currentSurahOrPhase: '[المرحلة 4/4]: جاري استخراج مطابقات المعجم العربي العام...',
            }));
            await startArabicScanPhaseAsync(targetMag, targetMash, isIdenticalVal);

            // Step 3: Instant Display Ready (100% Completed)
            // Set visible limit and mark completed at the same instant with sound
            setVisibleLimit(90);
            setProgress((prev) => ({
              ...prev,
              percent: 100,
              currentSurahOrPhase: `[اكتمل بنجاح 100%]: تم استخراج ${allMatches.length} مطابقة قرآنية!`,
              isRunning: false,
              isCompleted: true,
            }));
            setPipelinePhase('completed');

            try {
              playDosBeep(880, 60);
              setTimeout(() => playDosBeep(1174, 80), 70);
            } catch {
              // ignore
            }
          },
        }
      );
    } catch (err) {
      console.error('Scan error:', err);
      setPipelinePhase('idle');
    }
  };

  // Start Multi-Stage Pipeline: Initiates Phase 1 (Noorani Formulas & Combinations)
  const handleStartScan = async (overrideParams?: {
    query?: string;
    multiplier?: number;
    scope?: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words';
    onlyNoorani?: boolean;
  }) => {
    const activeQuery = overrideParams?.query !== undefined ? overrideParams.query : inputQuery;
    const activeMult = overrideParams?.multiplier !== undefined ? overrideParams.multiplier : multiplier;
    const activeScope = overrideParams?.scope !== undefined ? overrideParams.scope : selectedScope;
    const activeOnlyNoorani = overrideParams?.onlyNoorani !== undefined ? overrideParams.onlyNoorani : onlyNoorani;

    const trimmed = activeQuery.trim();
    if (!trimmed) return;

    if (overrideParams?.scope) setSelectedScope(overrideParams.scope);
    if (overrideParams?.onlyNoorani !== undefined) setOnlyNoorani(overrideParams.onlyNoorani);
    if (overrideParams?.multiplier !== undefined) {
      setMultiplier(activeMult);
      setMultiplierInput(String(activeMult));
    }

    // Cancel any running scanners
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    cancelNooraniCalculation();

    setCommittedQuery(trimmed);
    setCurrentQuery(trimmed);
    setMatches([]);
    setArabicMatches([]);
    setExpandedMatchId(null);

    // Visual button depress animation and retro sound
    setIsStartBtnDepressed(true);
    if (isDos) playDosBeep(880, 45);
    setTimeout(() => setIsStartBtnDepressed(false), 180);

    // Reset progress with immediate isRunning flag
    setProgress({
      percent: 5,
      scannedCount: 0,
      totalCount: 114,
      matchesCount: 0,
      itemsPerSecond: 0,
      currentSurahOrPhase: 'المرحلة ١: جاري توليف الصيغ والتراكيب النورانية...',
      isRunning: true,
      isCompleted: false,
      isCancelled: false,
    });

    setArabicProgress({
      isRunning: false,
      percent: 0,
      message: 'في انتظار اكتمال مرحلتي الصيغ ومسح القرآن...',
      foundCount: 0,
      isCompleted: false,
    });

    // Start Phase 1
    setPipelinePhase('noorani');
    nooraniStartedRef.current = true;
    retryNooraniCalculation();
  };

  // Orchestrate Transition: Phase 1 (Noorani) -> Phase 2 (Quran Scan)
  useEffect(() => {
    if (pipelinePhase !== 'noorani') return;
    if (!nooraniStartedRef.current) return;

    if (!isNooraniCalculating && (nooraniProgress === 100 || mergedNooraniFormulas.length > 0)) {
      nooraniStartedRef.current = false;
      const timer = setTimeout(() => {
        setPipelinePhase('quran');
        startQuranScanPhase();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [pipelinePhase, isNooraniCalculating, nooraniProgress, mergedNooraniFormulas.length]);

  const handleSelectHistoryItem = (item: QuranicChainHistoryItem) => {
    const itemMult = item.multiplier || 1;
    setInputQuery(item.query);
    setMultiplier(itemMult);
    setMultiplierInput(String(itemMult));
    setSelectedScope(item.scope);
    setOnlyNoorani(item.onlyNoorani);
    handleStartScan({
      query: item.query,
      multiplier: itemMult,
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

  // Stop / Cancel scanner across all phases
  const handleStopScan = () => {
    if (pipelinePhase === 'noorani') {
      cancelNooraniCalculation();
    }
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setArabicProgress((prev) => ({
      ...prev,
      isRunning: false,
      message: 'تم إلغاء الأمر',
    }));
    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      isCancelled: true,
      currentSurahOrPhase: 'تم إلغاء الأمر',
    }));
    setPipelinePhase('idle');
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
    let verbatim = 0;

    for (const m of matches) {
      if (isVerbatimMatch(m.phrase, m.cleanPhrase)) verbatim++;
      if (isTargetDiffering) {
        // When targets differ, results belong strictly to Eastern or Western
        if (computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi') {
          mashriqi++;
        } else {
          maghribi++;
        }
      } else {
        // When targets are identical, all results are common/unified
        common++;
        maghribi++;
        mashriqi++;
      }
    }
    return { common, maghribi, mashriqi, verbatim, total: matches.length };
  }, [matches, computedTarget, isTargetDiffering, isVerbatimMatch]);

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

    // 1. Filter by Origin tab (الكل / الكلمة المبحوثة / مغربي / شرقي)
    if (selectedOriginFilter !== 'all') {
      if (selectedOriginFilter === 'verbatim') {
        list = list.filter((m) => isVerbatimMatch(m.phrase, m.cleanPhrase));
      } else if (selectedOriginFilter === 'common') {
        if (!isTargetDiffering) {
          list = list; // All matches are common
        }
      } else if (selectedOriginFilter === 'maghribi') {
        list = list.filter((m) =>
          computedTarget ? m.maghribiValue === computedTarget.targetMaghribi : m.systemOrigin === 'maghribi'
        );
      } else if (selectedOriginFilter === 'mashriqi') {
        list = list.filter((m) =>
          computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi'
        );
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

    // 2.2 Filter by Search Scope (الكل / آيات وسلاسل / مفردات)
    if (selectedScope === 'verses_and_chains') {
      list = list.filter((m) => m.wordCount >= 2);
    } else if (selectedScope === 'single_words') {
      list = list.filter((m) => m.wordCount === 1);
    }

    // 2.3 Filter by Pure Noorani Letters if enabled
    if (onlyNoorani) {
      list = list.filter((m) => m.isPureNoorani === true);
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

    // 5. Quick Text Search in results (Supports matched phrase, full Ayah text, Surah name, and Ayah number)
    if (resultsFilter.trim()) {
      const rawQ = resultsFilter.trim();
      const normQ = normalizeArabicForSearch(rawQ);
      const isNum = !isNaN(Number(rawQ));
      const targetAyahNum = isNum ? parseInt(rawQ, 10) : null;

      list = list.filter((m) => {
        // Direct or normalized match in phrase
        if (m.phrase.includes(rawQ) || normalizeArabicForSearch(m.phrase).includes(normQ)) {
          return true;
        }

        // Direct or normalized match in Surah name
        if (m.surahName.includes(rawQ) || normalizeArabicForSearch(m.surahName).includes(normQ)) {
          return true;
        }

        // Check if query is Surah:Ayah (e.g. "2:255" or "البقرة:255")
        if (rawQ.includes(':')) {
          const [sPart, aPart] = rawQ.split(':');
          const aNum = parseInt(aPart?.trim() || '', 10);
          if (!isNaN(aNum) && m.ayahNumber === aNum) {
            const sTrim = sPart?.trim();
            if (!sTrim || m.surahName.includes(sTrim) || String(m.surahNumber) === sTrim) {
              return true;
            }
          }
        }

        // Match by Ayah number directly if numeric query
        if (targetAyahNum !== null && m.ayahNumber === targetAyahNum) {
          return true;
        }

        // Match within the full noble Ayah text (enabled by default)
        if (searchInFullAyah && m.fullAyahText) {
          if (m.fullAyahText.includes(rawQ)) return true;
          const normAyah = normalizeArabicForSearch(m.fullAyahText);
          if (normAyah.includes(normQ)) return true;
        }

        // Match system label or match type label
        if (m.systemLabel.includes(rawQ) || m.matchTypeLabel.includes(rawQ)) {
          return true;
        }

        return false;
      });
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
  }, [
    matches,
    resultsFilter,
    searchInFullAyah,
    isFilterUnique,
    selectedOriginFilter,
    matchLengthFilter,
    onlyFawatihSurahs,
    matchSortBy,
    computedTarget,
    selectedScope,
    onlyNoorani,
    FAWATIH_SURAH_NUMBERS,
    linkWithNooraniSurahs,
    effectiveLinkedSurahNumbers,
  ]);

  // Check if any filter or search term is actively applied to Quran results
  const isAnyQuranFilterActive = useMemo(() => {
    return (
      resultsFilter.trim().length > 0 ||
      selectedOriginFilter !== 'all' ||
      matchLengthFilter !== 'all' ||
      onlyFawatihSurahs ||
      filterSurahOrders.length > 0 ||
      linkWithNooraniSurahs ||
      !isFilterUnique
    );
  }, [
    resultsFilter,
    selectedOriginFilter,
    matchLengthFilter,
    onlyFawatihSurahs,
    filterSurahOrders,
    linkWithNooraniSurahs,
    isFilterUnique,
  ]);

  const handleResetAllQuranFilters = () => {
    setResultsFilter('');
    setSelectedOriginFilter('all');
    setMatchLengthFilter('all');
    setOnlyFawatihSurahs(false);
    setFilterSurahOrders([]);
    setLinkWithNooraniSurahs(false);
    setIsFilterUnique(true);
    setSearchInFullAyah(true);
  };

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
        {/* Header Area: Shows Live Progress Banner during scanning, or Normal Title & Letters Breakdown when idle */}
        {/* 1. SINGLE UNIFIED PROMINENT RETRO DOS PROGRESS BAR (Top of screen) */}
        {isPipelineRunning ? (
          <div
            style={{ backgroundColor: 'var(--dos-panel, #000088)', borderColor: 'var(--dos-border, #55ffff)' }}
            className="border-2 p-3.5 sm:p-4 font-mono shadow-lg select-none space-y-2.5 w-full animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-[var(--dos-border)] pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#ffff55] text-black px-2 py-0.5 text-xs font-black shadow-xs tracking-wider">
                  [MS-DOS SCANNER]
                </span>
                <span className="text-[#55ffff] font-bold text-xs sm:text-base">
                  {pipelinePhase === 'noorani' && `[المرحلة 1/4]: ${nooraniProgressMessage || 'توليف الصيغ والتراكيب النورانية...'}`}
                  {pipelinePhase === 'quran' && `[المرحلة 2/4]: مسح المصحف - ${progress.currentSurahOrPhase || 'جاري مسح الآيات والسلاسل...'}`}
                  {pipelinePhase === 'processing' && `[المرحلة 3/4]: ${progress.currentSurahOrPhase || 'فرز وتدقيق المطابقات القرآنية...'}`}
                  {pipelinePhase === 'arabic' && `[المرحلة 4/4]: ${arabicProgress.message || progress.currentSurahOrPhase || 'استخراج مفردات المعجم العربي...'}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#55ff55] font-black text-base sm:text-xl tracking-wider">
                  {unifiedPercent}%
                </span>
                <button
                  type="button"
                  onClick={handleStopScan}
                  onMouseEnter={() => setHintText('إلغاء أمر المسح القرآني الجاري فوراً وتحرير النظام')}
                  onMouseLeave={clearHint}
                  className="px-2.5 py-1 bg-[#aa0000] text-white hover:bg-[#ff5555] font-black border border-white cursor-pointer text-xs active:translate-y-0.5 shadow-xs"
                  title="إلغاء المعالجة والمسح القرآني فوراً (ESC)"
                >
                  [ESC إلغاء]
                </button>
              </div>
            </div>

            {/* Classic Big ASCII Block Progress Bar */}
            <div className="bg-black/90 p-3 border-2 border-[var(--dos-border)] text-center shadow-inner">
              <div className="text-base sm:text-lg md:text-xl tracking-widest font-mono font-black break-all dir-ltr text-center select-none">
                {(() => {
                  const totalBlocks = 36;
                  const filledBlocks = Math.min(totalBlocks, Math.max(1, Math.round((unifiedPercent / 100) * totalBlocks)));
                  const emptyBlocks = totalBlocks - filledBlocks;
                  return (
                    <span>
                      <span className="text-white">[</span>
                      <span className="text-[#55ff55]">{'█'.repeat(filledBlocks)}</span>
                      <span className="text-[#004422]">{'░'.repeat(emptyBlocks)}</span>
                      <span className="text-white">]</span>
                      <span className="text-[#ffff55] mr-2"> {unifiedPercent}%</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#ffff55] flex-wrap gap-2 font-mono font-bold">
              <span>[►] {progress.currentSurahOrPhase || `تم فحص: ${progress.scannedCount} تركيبة قرآنية`}</span>
              <span className="text-[#55ff55] font-black">المطابقات: {matches.length + arabicMatches.length}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-[#00aaaa] text-black px-1.5 py-0.5 font-black text-xs shadow-xs">[►]</span>
              <span className="text-[#ffff55] font-black text-sm sm:text-base tracking-wide font-mono">
                {(committedQuery || inputQuery).trim() || 'نظام مطابقة السلاسل القرآنية'}
              </span>
            </div>

            {/* Display Letter Values Breakdown & Totals in Eastern & Western Colors */}
            {computedTarget ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-850/80 border border-stone-200 dark:border-stone-800 text-3xs font-mono flex-wrap self-start sm:self-auto max-w-full overflow-hidden shadow-2xs">
                {/* Letters breakdown */}
                {computedTarget.magBreakdown.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 py-0.5 border-l border-stone-250 dark:border-stone-700 pl-1.5 ml-0.5">
                    {computedTarget.magBreakdown.map((item, idx) => {
                      const mashVal = computedTarget.mashBreakdown[idx]?.val ?? item.val;
                      const isDiff = item.val !== mashVal;
                      return (
                        <span
                          key={idx}
                          onMouseEnter={() => setHintText(`حرف [${item.char}] ۞ غربي: ${item.val} ${isDiff ? `| شرقي: ${mashVal}` : ''}`)}
                          onMouseLeave={clearHint}
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

                {/* Totals in distinct Western (Amber) and Eastern (Sky) and Common (Emerald) colors with explicit labels */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {computedTarget.multiplier && computedTarget.multiplier > 1 && (
                    <span
                      className="inline-flex items-center px-2 py-1 rounded bg-[#330033] text-[#ff55ff] border border-[#ff55ff] font-bold font-mono text-xs shadow-xs"
                      title={`مضاعف القيمة: × ${computedTarget.multiplier}`}
                    >
                      × {computedTarget.multiplier}
                    </span>
                  )}

                  {computedTarget.isIdentical ? (
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-mono">
                      {/* Western & Eastern Identical: Prominently show 'مشترك (شرقي وغربي)' */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع متطابق ومشترك في كلا النظامين الشرقي والغربي: ${computedTarget.targetMaghribi}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#00290a] text-[#55ff55] border-2 border-[#33ff33] shadow-sm select-text"
                        title="المجموع متطابق ومشترك في كلا النظامين الشرقي والغربي"
                      >
                        <span className="text-[#ffff55] font-black text-xs sm:text-sm">مشترك (شرقي وغربي):</span>
                        <strong className="text-xl sm:text-2xl md:text-3xl text-white font-black tracking-wide font-mono">
                          {computedTarget.targetMaghribi}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-mono">
                      {/* Western (غربي) */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع بحساب الجُمّل الغربي (المغربي): ${computedTarget.targetMaghribi}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#2b1200] text-[#ffbb33] border-2 border-[#ffaa00] shadow-sm select-text"
                        title={`المجموع وفق الجُمّل الغربي (المغربي): ${computedTarget.targetMaghribi}`}
                      >
                        <span className="text-[#ffff55] font-black text-xs sm:text-sm">غربي:</span>
                        <strong className="text-xl sm:text-2xl md:text-3xl text-white font-black tracking-wide font-mono">
                          {computedTarget.targetMaghribi}
                        </strong>
                      </div>

                      <span className="text-stone-400 font-bold text-lg hidden sm:inline">|</span>

                      {/* Eastern (شرقي) */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع بحساب الجُمّل الشرقي (المشرقي): ${computedTarget.targetMashriqi}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#001c38] text-[#55ffff] border-2 border-[#00e5ff] shadow-sm select-text"
                        title={`المجموع وفق الجُمّل الشرقي (المشرقي): ${computedTarget.targetMashriqi}`}
                      >
                        <span className="text-[#55ffff] font-black text-xs sm:text-sm">شرقي:</span>
                        <strong className="text-xl sm:text-2xl md:text-3xl text-white font-black tracking-wide font-mono">
                          {computedTarget.targetMashriqi}
                        </strong>
                      </div>
                    </div>
                  )}

                  {computedTarget.alternateTargets && computedTarget.alternateTargets.length > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-black/60 text-[#ffff55] border border-[var(--dos-border)] text-3xs font-mono"
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
        )}

        {/* Input & Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
          {/* Main Query Input + Multiplier Box */}
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

            <div className="flex items-center gap-1.5">
              {/* Search Query Input with AutoFocus */}
              <div className="relative flex-1">
                <DosBlinkBlockInput
                  autoFocus={true}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onFocus={() => {
                    if (isDos) playDosBeep(980, 20);
                  }}
                  enterKeyHint="search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                      e.preventDefault();
                      (e.target as HTMLElement)?.blur();
                      if (!progress.isRunning) {
                        handleStartScan();
                      }
                    }
                  }}
                  placeholder={
                    isDos
                      ? "C:\\> أدخل عبارة أو رقماً واضغط Enter..."
                      : "اكتب عبارة (مثل: كهيعص أو لا إله إلا الله) أو رقماً (مثل: 165 أو 518)..."
                  }
                  className="w-full text-xs sm:text-sm font-quran font-normal p-2 sm:p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-right"
                />
                {inputQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputQuery('');
                      if (isDos) playDosBeep(440, 20);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
                    title="مسح"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Multiplier Input Box: × [ 1 ] */}
              <div
                className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 dark:bg-stone-850 px-2 py-1.5 sm:py-2 rounded-xl border border-stone-300 dark:border-stone-700 shadow-2xs shrink-0"
                title="مضاعف الكلمة: ضرب القيمة الجملية للكلمة في هذا المعامل (مثال: ضرب حم × 7 للوصول لقيمة 336)"
              >
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 select-none">×</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={multiplierInput}
                  enterKeyHint="search"
                  onChange={(e) => {
                    const val = e.target.value;
                    setMultiplierInput(val);
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setMultiplier(parsed);
                    } else if (val === '') {
                      setMultiplier(1);
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(multiplierInput, 10);
                    if (!multiplierInput || isNaN(parsed) || parsed < 1) {
                      setMultiplierInput('1');
                      setMultiplier(1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                      e.preventDefault();
                      (e.target as HTMLElement)?.blur();
                      if (!progress.isRunning) {
                        handleStartScan();
                      }
                    }
                  }}
                  className="w-9 sm:w-12 text-center font-mono font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 bg-transparent border-none focus:outline-none p-0"
                  placeholder="1"
                  aria-label="مضاعف الكلمة المبحوث عنها"
                />
              </div>
            </div>
          </div>

          {/* Scan Action Button & History Drawer Trigger */}
          <div className="lg:col-span-4 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStartScan()}
              disabled={!inputQuery.trim() || isPipelineRunning}
              className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-white text-xs font-normal inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                isStartBtnDepressed
                  ? 'translate-y-1 scale-95 shadow-inner bg-emerald-800 border-t-2 border-l-2 border-black border-b-2 border-r-2 border-white'
                  : isPipelineRunning
                  ? 'bg-emerald-600/80 cursor-wait opacity-90'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isPipelineRunning ? 'animate-pulse fill-current' : 'fill-current'}`} />
              <span>
                {pipelinePhase === 'noorani'
                  ? 'جاري توليف الصيغ (١/٣)...'
                  : pipelinePhase === 'quran'
                  ? 'جاري مسح القرآن (٢/٣)...'
                  : pipelinePhase === 'arabic'
                  ? 'جاري مسح المعجم (٣/٣)...'
                  : 'ابدأ'}
              </span>
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
            <div className="flex flex-wrap items-center gap-1 min-w-0 max-w-full py-0.5">
              {searchHistory.slice(0, 10).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleSelectHistoryItem(h)}
                  onMouseEnter={() => setHintText(`سجل بحث: «${h.query}» ۞ قيمة: ${h.targetMaghribi} (مغربي) / ${h.targetMashriqi} (مشرقي) ۞ انقر لإعادة المسح الفوري`)}
                  onMouseLeave={clearHint}
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
        {computedTarget && (mergedNooraniFormulas.length > 0 || isNooraniCalculating || isNooraniCancelled || excludedLetters.length > 0) && (
          <div className="p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/70 space-y-2 shadow-2xs">
            {/* Header Row: Title, System Filters & Repetition Mode Filter */}
            <div className="flex items-center justify-between flex-wrap gap-1.5 text-2xs font-normal">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-emerald-900 dark:text-emerald-200 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>صيغ وتراكيب الأحرف المقطعة ({displayedNooraniFormulas.length})</span>
                </div>

                {mergedNooraniFormulas.length > 0 && isTargetDiffering && (
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
                    <button
                      type="button"
                      onClick={() => setNooraniSystemFilter('mashriqi')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                        nooraniSystemFilter === 'mashriqi'
                          ? 'bg-sky-600 text-white shadow-2xs font-bold'
                          : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                      }`}
                      title={`صيغ النظام المشرقي (= ${computedTarget?.targetMashriqi})`}
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
                      title={`صيغ النظام المغربي (= ${computedTarget?.targetMaghribi})`}
                    >
                      <span>مغربي</span>
                      <span className="font-mono text-3xs">({magCount})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Repetition Mode Filter Tabs (الكل / تكرارات فقط / الأعلى تكراراً / دون تكرار) */}
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-850 p-0.5 rounded text-3xs font-medium border border-stone-200 dark:border-stone-750">
                  <button
                    type="button"
                    onClick={() => setRepeatFilterMode('all')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      repeatFilterMode === 'all'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                    title="عرض كافة التراكيب"
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatFilterMode('repeated_only')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                      repeatFilterMode === 'repeated_only'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                    }`}
                    title="إظهار التراكيب التي تحتوي على تكرارات فقط (مثل طه×2، حم×7، يس×2)"
                  >
                    <Repeat className="w-2.5 h-2.5" />
                    <span>تكرارات فقط</span>
                    <span className="font-mono text-[9px] font-bold">({repeatedFormulasCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatFilterMode('highest_repeats')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                      repeatFilterMode === 'highest_repeats'
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50'
                    }`}
                    title="ترتيب النتائج بالأعلى تكراراً في المقدمة"
                  >
                    <span>الأعلى تكراراً ⚡</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatFilterMode((prev) => (prev === 'hamim_max' ? 'all' : 'hamim_max'))}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 font-bold ${
                      repeatFilterMode === 'hamim_max'
                        ? 'bg-rose-600 text-white shadow-2xs font-bold'
                        : 'text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50'
                    }`}
                    title="استخراج وحصر التراكيب بالأعلى تكراراً لفاتحة (حم)"
                  >
                    <span>أكثر تكرار لـ حم 🔥</span>
                    {hamimFormulasCount > 0 && (
                      <span className="font-mono text-[9px] font-bold">({hamimFormulasCount})</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatFilterMode('unique_only')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                      repeatFilterMode === 'unique_only'
                        ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                        : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                    }`}
                    title="تراكيب دون تكرار الحروف"
                  >
                    <span>دون تكرار</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Letter Exclusion Sub-Bar (استبعاد أحرف معينة مثل النون أو الحاء) */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap py-1 px-1.5 rounded-md bg-stone-100/80 dark:bg-stone-850/80 border border-stone-200/70 dark:border-stone-750">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-3xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1 shrink-0">
                  <span className="text-red-500 font-bold">🚫</span>
                  <span>استبعاد أحرف من التوليد:</span>
                </span>

                <div className="flex items-center gap-1 flex-wrap">
                  {NOORANI_14_LETTERS.map((char) => {
                    const isExcluded = excludedLetters.includes(char);
                    return (
                      <button
                        key={char}
                        type="button"
                        onClick={() => toggleExcludedLetter(char)}
                        className={`w-5 h-5 rounded text-xs font-quran font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isExcluded
                            ? 'bg-red-500 text-white font-black scale-110 shadow-2xs line-through ring-1 ring-red-400'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400'
                        }`}
                        title={
                          isExcluded
                            ? `الحرف [${char}] مستبعد حالياً (انقر لإلغاء الاستبعاد وإعادته)`
                            : `انقر لاستبعاد الحرف [${char}] من التوليد والنتائج`
                        }
                      >
                        {char}
                      </button>
                    );
                  })}
                </div>
              </div>

              {excludedLetters.length > 0 && (
                <button
                  type="button"
                  onClick={clearExcludedLetters}
                  className="text-4xs font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 hover:bg-red-200 cursor-pointer border border-red-300 dark:border-red-800 flex items-center gap-0.5"
                  title="إلغاء استبعاد كافة الأحرف وإظهارها جميعاً"
                >
                  <span>إلغاء الاستبعاد ({excludedLetters.length})</span>
                  <span>✕</span>
                </button>
              )}
            </div>

            {/* 5 Specialized Algorithm Selector Buttons & Quranic Sort */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap py-1 border-y border-[var(--dos-border)]/50 bg-black/30 px-1.5 rounded-md w-full">
              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                <span className="text-3xs text-[#ffff55] font-sans font-bold shrink-0 ml-1">
                  الخوارزمية:
                </span>
                {NOORANI_ALGORITHMS.map((algo) => {
                  const isSelected = selectedAlgorithm === algo.id;
                  return (
                    <button
                      key={algo.id}
                      type="button"
                      onClick={() => setSelectedAlgorithm(algo.id)}
                      onMouseEnter={() => setHintText(`خوارزمية [${algo.id}. ${algo.name}]: ${algo.description} - انقر لتفعيلها فوراً`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-none border flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-[#ffff55] text-black border-white shadow-xs font-black'
                          : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/50 hover:bg-[#000088] hover:text-white'
                      }`}
                      title={algo.description}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                          isSelected
                            ? 'bg-black text-[#ffff55]'
                            : 'bg-[#002233] text-[#55ffff]'
                        }`}
                      >
                        {isSelected && isNooraniCalculating ? (
                          <span className="text-[#ffff55] font-black">*</span>
                        ) : (
                          algo.id
                        )}
                      </span>
                      <span>{algo.shortName || algo.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSortByQuranicMatch(!sortByQuranicMatch)}
                onMouseEnter={() => setHintText('ترتيب نتائج الفواتح بحسب الأكثر مطابقة مع سور المصحف الشريف')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium cursor-pointer transition-none border flex items-center gap-1 shrink-0 ${
                  sortByQuranicMatch
                    ? 'bg-[#00aa00] text-white border-white shadow-xs font-bold'
                    : 'bg-[#000044] text-white border-[#55ffff]/50 hover:bg-[#000088]'
                }`}
                title="ترتيب النتائج بحسب الأكثر تطابقاً مع سور المصحف الشريف"
              >
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>الأكثر مطابقة للمصحف</span>
              </button>
            </div>



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
                      <button
                        type="button"
                        onClick={handleUnpinAndClearSurahs}
                        className="text-4xs px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-750 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer font-sans"
                        title="إلغاء التثبيت وفك حصر النتائج"
                      >
                        إلغاء التثبيت ✕
                      </button>
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
                      onClick={() => {
                        setFilterSurahOrders([]);
                        setLinkWithNooraniSurahs(false);
                      }}
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

              {/* The 29 Surahs Sequence Track: Fully responsive wrapped grid without horizontal scroll */}
              <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-1.5 w-full justify-start border border-[var(--dos-border)]/60 rounded bg-black/40">
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
                        setFilterSurahOrders((prev) => {
                          const next = prev.includes(surah.orderInFawatih)
                            ? prev.filter((o) => o !== surah.orderInFawatih)
                            : [...prev, surah.orderInFawatih];
                          if (next.length === 0) {
                            setLinkWithNooraniSurahs(false);
                          } else {
                            setLinkWithNooraniSurahs(true);
                          }
                          return next;
                        });
                      }}
                      onMouseEnter={() => setHintText(`سورة ${surah.surahName} (${surah.surahNumber}) ۞ ترتيب الفاتحة #${surah.orderInFawatih} ۞ الفاتحة: [${surah.formula}] ۞ مطابقات المسح: ${surahScanMatches} - انقر لتصفية النتائج`)}
                      onMouseLeave={clearHint}
                      className={`relative shrink-0 flex flex-col items-center justify-center p-1 rounded cursor-pointer min-w-[50px] text-center border font-mono transition-none ${
                        isFiltered
                          ? 'bg-[#ffff55] text-black border-white font-bold opacity-100 z-10 shadow-xs ring-1 ring-white'
                          : isMatchedInFormula
                          ? 'bg-[#008800] text-white border-[#55ff55] font-bold opacity-100 shadow-xs ring-1 ring-[#55ff55]'
                          : 'bg-[#000044] text-[#ffff55] border-[#55ffff]/50 hover:bg-[#000088] hover:text-white opacity-100 font-bold'
                      }`}
                      title={`#${surah.orderInFawatih}: سورة ${surah.surahName} (${surah.surahNumber}) - الفاتحة: ${surah.formula} | مطابقات: ${surahScanMatches}`}
                    >
                      <div className="flex items-center justify-between w-full text-[8.5px] font-mono leading-none mb-0.5 px-0.5 font-bold">
                        <span className={isFiltered ? 'text-black' : isMatchedInFormula ? 'text-white' : 'text-[#55ffff]'}>
                          #{surah.orderInFawatih}
                        </span>
                        <span className={isFiltered ? 'text-black' : isMatchedInFormula ? 'text-[#ffff55]' : 'text-[#ffff55]'}>
                          {surah.surahNumber}
                        </span>
                      </div>

                      <div className="text-xs font-quran font-bold leading-tight flex items-center justify-center">
                        {surah.orderInFawatih === 23 ? (
                          <span className="flex items-center gap-0.5" title="سورة الشورى: الآية 1 {حم} • الآية 2 {عسق}">
                            <span
                              className={`px-0.5 rounded transition-none ${
                                hasHamimActive
                                  ? 'bg-[#ffff55] text-black font-extrabold ring-1 ring-white'
                                  : isMatchedInFormula
                                  ? 'text-white'
                                  : 'text-[#ffff55]'
                              }`}
                            >
                              حم
                            </span>
                            <span className="text-[9px] opacity-60 font-sans">•</span>
                            <span
                              className={`px-0.5 rounded transition-none ${
                                hasAynSinQafActive
                                  ? 'bg-[#ffff55] text-black font-extrabold ring-1 ring-white'
                                  : hasHamimActive
                                  ? 'text-[#55ffff] text-[10px]'
                                  : isMatchedInFormula
                                  ? 'text-white'
                                  : 'text-[#ffff55]'
                              }`}
                            >
                              عسق
                            </span>
                          </span>
                        ) : (
                          surah.formula
                        )}
                      </div>

                      <div className={`text-[9px] truncate max-w-[48px] font-sans mt-0.5 font-bold ${isFiltered ? 'text-black' : 'text-white'}`}>
                        {surah.surahName}
                      </div>

                      {/* Real-time Match Count Badge from Comprehensive Scan */}
                      {surahScanMatches > 0 && (
                        <div
                          className={`mt-0.5 text-[8px] font-mono font-bold px-1 rounded-full ${
                            isFiltered
                              ? 'bg-black text-[#ffff55]'
                              : isMatchedInFormula
                              ? 'bg-white text-black'
                              : 'bg-[#00aa00] text-white border border-[#55ff55]'
                          }`}
                          title={`يوجد ${surahScanMatches} مطابقة في سورة ${surah.surahName}`}
                        >
                          {surahScanMatches}م
                        </div>
                      )}

                      {isMatchedInFormula && !isFiltered && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ffff55] ring-1 ring-white animate-pulse" />
                      )}
                      {isFiltered && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white ring-1 ring-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {displayedNooraniFormulas.length === 0 ? (
              <div className="p-3 text-center bg-stone-100/60 dark:bg-stone-850/50 rounded-lg border border-stone-200 dark:border-stone-750 text-xs text-stone-500 dark:text-stone-400">
                {excludedLetters.length > 0
                  ? `لا توجد صيغ بعد استبعاد الأحرف [${excludedLetters.join('، ')}]. انقر على زر مسح الاستبعاد لإظهار باقي التراكيب.`
                  : 'لا توجد صيغ مطابقة للفلاتر المحددة.'}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap max-h-40 overflow-y-auto pr-0.5">
                {displayedNooraniFormulas.map((n) => {
                  const isCopied = copiedFormula === `noorani_${n.key}`;
                  const isActive = activeFormula?.key === n.key;

                  let chipStyle = '';

                  if (!isTargetDiffering) {
                    chipStyle = 'dos-chip-common hover:border-white';
                  } else if (n.system === 'mashriqi') {
                    chipStyle = 'dos-chip-mashriqi hover:border-white';
                  } else {
                    chipStyle = 'dos-chip-maghribi hover:border-white';
                  }

                  if (isActive) {
                    chipStyle += ' ring-2 ring-white font-black shadow-md';
                  }

                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => {
                        if (selectedFormulaKey === n.key) {
                          handleUnpinAndClearSurahs();
                        } else {
                          setSelectedFormulaKey(n.key);
                          setIsExplicitlyUnpinned(false);
                        }
                        navigator.clipboard.writeText(n.formula);
                        setCopiedFormula(`noorani_${n.key}`);
                        setTimeout(() => setCopiedFormula(null), 1800);
                      }}
                      onMouseEnter={() => setHintText(`صيغة نورانية: [${n.formula}] ۞ الجُمّل: ${n.displaySum} ۞ تفكيك: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')}${n.repeatSummary ? ` ۞ تكرار: ${n.repeatSummary}` : ''}`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-1 rounded-lg border text-xs font-quran flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${chipStyle}`}
                      title={`الصيغة: ${n.formula} | الحساب: ${n.displaySum} | تفكيك الحروف: ${n.letters.map((c, idx) => `${c}(${n.values[idx]})`).join(' + ')} ${n.repeatSummary ? `| التكرارات: ${n.repeatSummary}` : ''} ${n.description ? `| ${n.description}` : ''} - انقر لتلوين السور المطابقة في شريط المصحف ونسخ التركيبة`}
                    >
                      <span className="font-bold">{n.formula}</span>
                      {n.isAuthenticQuranicFawatih && (
                        <span className="text-3xs text-amber-500" title="فاتحة سورة أو تركيب قرآني تّام">⭐</span>
                      )}

                      {/* Hamim Specific Multiplicity Badge */}
                      {countHamimInFormula(n.formula) > 0 && (
                        <span
                          className={`font-mono text-[9px] px-1 py-0.2 rounded font-bold flex items-center gap-0.5 shrink-0 ${
                            countHamimInFormula(n.formula) >= 7
                              ? 'bg-amber-500 text-stone-950 border border-amber-400 shadow-2xs'
                              : 'bg-rose-500/20 text-rose-950 dark:text-rose-200 border border-rose-400/40'
                          }`}
                          title={`تكرار فاتحة حم في هذه التركيبة: ${countHamimInFormula(n.formula)} مرات`}
                        >
                          <span>🔥</span>
                          <span>حم ×{countHamimInFormula(n.formula)}</span>
                        </span>
                      )}

                      {/* Repetition Multiplicity Badge */}
                      {n.repeatSummary && (
                        <span
                          className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/40 font-bold flex items-center gap-0.5 shrink-0"
                          title={`تكرار مجمع: ${n.repeatSummary}`}
                        >
                          <span>🔁</span>
                          <span>{n.repeatSummary}</span>
                        </span>
                      )}

                      <span className="font-mono text-4xs font-semibold opacity-75">
                        ({n.displaySum})
                      </span>

                      {n.surahOrders && n.surahOrders.length > 0 && (
                        <span
                          className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-stone-600 dark:text-stone-300 font-bold"
                          title="عدد السور المطابقة في فواتح المصحف الـ 29"
                        >
                          {n.surahOrders.length} سورة
                        </span>
                      )}
                      {isCopied && <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Scope & Noorani Filters (يعمل قبل البحث لتحديد النطاق وبعد البحث لتصفية النتائج فوراً) */}
        <div className="pt-1.5 border-t border-[var(--dos-border)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-2xs font-normal text-white">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#ffff55] font-black shrink-0 text-3xs font-mono">نطاق الفحص والتصفية:</span>
            <div className="inline-flex items-center gap-1 rounded border-2 border-[var(--dos-border)] p-0.5 bg-black/70 text-3xs font-mono flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedScope('all');
                  setOnlyNoorani(false);
                  playDosBeep(880, 20);
                }}
                onMouseEnter={() => setHintText('نطاق البحث والتصفية [الكل]: الآيات الكريمة والسلاسل القرآنية والمفردات')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded cursor-pointer transition-none font-bold ${
                  selectedScope === 'all' && !onlyNoorani
                    ? 'dos-btn-pressed'
                    : 'bg-[#000044] text-[#55ffff] hover:bg-[#000088] hover:text-white border border-[#55ffff]/40'
                }`}
                title="عرض وبحث كافة النتائج دون تقييد"
              >
                {selectedScope === 'all' && !onlyNoorani && '✓ '}الكل
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedScope('verses_and_chains');
                  setOnlyNoorani(false);
                  playDosBeep(880, 20);
                }}
                onMouseEnter={() => setHintText('نطاق البحث والتصفية [آيات]: حصر النتائج على الآيات والسلاسل القرآنية (كلمتين فأكثر)')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded cursor-pointer transition-none font-bold ${
                  selectedScope === 'verses_and_chains' && !onlyNoorani
                    ? 'dos-btn-pressed'
                    : 'bg-[#000044] text-[#55ffff] hover:bg-[#000088] hover:text-white border border-[#55ffff]/40'
                }`}
                title="آيات وسلاسل قرآنية متعددة الكلمات (2+ كلمات)"
              >
                {selectedScope === 'verses_and_chains' && !onlyNoorani && '✓ '}آيات
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedScope('single_words');
                  setOnlyNoorani(false);
                  playDosBeep(880, 20);
                }}
                onMouseEnter={() => setHintText('نطاق البحث والتصفية [مفردات]: حصر النتائج على الكلمات والمفردات القرآنية المفردة')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded cursor-pointer transition-none font-bold ${
                  selectedScope === 'single_words' && !onlyNoorani
                    ? 'dos-btn-pressed'
                    : 'bg-[#000044] text-[#55ffff] hover:bg-[#000088] hover:text-white border border-[#55ffff]/40'
                }`}
                title="مفردات بكلمة واحدة فقط"
              >
                {selectedScope === 'single_words' && !onlyNoorani && '✓ '}مفردات
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyNoorani(!onlyNoorani);
                  playDosBeep(980, 25);
                }}
                onMouseEnter={() => setHintText('نطاق البحث والتصفية [أحرف نورانية]: حصر النتائج حصراً على الأحرف النورانية الـ 14 (نص حكيم قاطع له سر)')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded cursor-pointer transition-none font-bold ${
                  onlyNoorani
                    ? 'dos-btn-pressed'
                    : 'bg-[#000044] text-[#ffff55] hover:bg-[#000088] hover:text-white border border-[#ffff55]/50'
                }`}
                title="تصفية النتائج للأحرف النورانية الـ 14 فقط"
              >
                {onlyNoorani && '✓ '}أحرف نورانية (14)
              </button>
            </div>
          </div>
        </div>

        {/* Quranic Orthography & Scan Rules Toggle Bar */}
        <div className="pt-1.5 border-t border-[var(--dos-border)]/40 flex items-center justify-between gap-1 flex-wrap text-3xs font-mono">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRulesPanel(!showRulesPanel)}
              onMouseEnter={() => setHintText('فتح/إغلاق لوحة قواعد رسم المصحف (الألف الخنجرية، التاء المربوطة، الشدة، الواو الصامتة)')}
              onMouseLeave={clearHint}
              className={`px-2 py-0.5 rounded border font-bold transition-none cursor-pointer flex items-center gap-1 shadow-xs ${
                showRulesPanel
                  ? 'bg-[#ffff55] text-black border-white'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/60 hover:bg-[#000088] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-[#ffff55]" />
              <span>شروط وقواعد الرسم القرآني</span>
              {showRulesPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Quick Badges of Active Rules */}
            <span
              className={`px-1.5 py-0.5 rounded font-mono border font-bold ${
                localRules.daggerAlif === 'count_as_1'
                  ? 'bg-[#002b14] text-[#55ff55] border-[#55ff55]'
                  : 'bg-[#222222] text-[#888888] border-[#555555]'
              }`}
              title="الألف الخنجرية في رسم المصحف (الرحمن، هذا، ذلك، إله...)"
            >
              {localRules.daggerAlif === 'count_as_1' ? 'ألف خنجرية (+1)' : 'ألف مهملة (0)'}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded font-mono border font-bold ${
                localRules.silentWawMode === 'count_as_6'
                  ? 'bg-[#002b14] text-[#55ff55] border-[#55ff55]'
                  : 'bg-[#222222] text-[#888888] border-[#555555]'
              }`}
              title="الواو غير المقروءة في أولو وأولئك وأولات"
            >
              {localRules.silentWawMode === 'count_as_6' ? 'واو رسم (+6)' : 'واو صامتة (0)'}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded font-mono border font-bold ${
                localRules.uthmaniWawMode === 'as_waw_6'
                  ? 'bg-[#002b14] text-[#55ff55] border-[#55ff55]'
                  : 'bg-[#3b1d00] text-[#ffbb33] border-[#ffaa00]'
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
            onMouseEnter={() => setHintText('تفعيل/تعطيل البحث المتوازي بالأوجه الإملائية والقرآنية المتعددة للعبارة')}
            onMouseLeave={clearHint}
            className={`px-2 py-0.5 rounded border font-bold transition-none cursor-pointer flex items-center gap-1 shadow-xs ${
              flexibleOrthography
                ? 'bg-[#3b1d00] text-[#ffbb33] border-[#ffaa00]'
                : 'bg-[#000044] text-[#888888] border-[#555555]'
            }`}
            title="فحص متزامن لكافة الأوجه الإملائية والقرآنية المحتملة (مع الألف الخنجرية وبدونها، ومع الواو وبدونها)"
          >
            <ShieldCheck className={`w-3 h-3 ${flexibleOrthography ? 'text-[#ffbb33]' : 'text-stone-400'}`} />
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



      {/* Discovered Results Section */}
      <div className="space-y-2">
        {/* Domain Switcher: Quranic Matches vs General Arabic Dictionary Matches */}
        {computedTarget && (
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-250 dark:border-stone-750 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveDomainTab('quran')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeDomainTab === 'quran'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>نتائج القرآن الكريم ({filteredMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDomainTab('arabic_dict')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeDomainTab === 'arabic_dict'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Book className="w-3.5 h-3.5" />
                <span>المعجم العربي العام ({filteredArabicMatches.length})</span>
              </button>
            </div>

            {activeDomainTab === 'arabic_dict' && (
              <div className="text-3xs text-stone-500 dark:text-stone-400 font-medium">
                مفردات لغوية عامة خارج القرآن تطابق قيمة الجُمَّل ({computedTarget.isIdentical ? computedTarget.targetMaghribi : `${computedTarget.targetMaghribi} / ${computedTarget.targetMashriqi}`})
              </div>
            )}
          </div>
        )}

        {activeDomainTab === 'arabic_dict' ? (
          <div className="space-y-2 animate-in fade-in duration-150">
            {/* Arabic Dictionary Results Toolbar */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-100/70 dark:bg-stone-850/70 border border-stone-200/80 dark:border-stone-800 text-3xs font-medium flex-wrap">
              <span className="text-stone-700 dark:text-stone-300">
                إجمالي المفردات المعجمية المطابقة: <strong className="text-amber-700 dark:text-amber-400 font-mono font-bold text-xs">{filteredArabicMatches.length}</strong>
              </span>

              {/* Quick search input in Arabic results */}
              <div className="relative flex items-center w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute right-2.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={resultsFilter}
                  onChange={(e) => setResultsFilter(e.target.value)}
                  placeholder="بحث سريع في المفردات..."
                  className="w-full text-xs font-normal pr-8 pl-7 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                />
                {resultsFilter && (
                  <button
                    type="button"
                    onClick={() => setResultsFilter('')}
                    className="absolute left-2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {filteredArabicMatches.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pr-0.5">
                {filteredArabicMatches.map((item, idx) => (
                  <a
                    key={`${item.text}_${idx}`}
                    href={`https://www.google.com/search?q=${encodeURIComponent(item.text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setHintText(`مفردة معجمية: «${item.text}» ۞ القيمة: ${item.value} ۞ انقر للبحث في Google`)}
                    onMouseLeave={clearHint}
                    className="px-2.5 py-2 rounded-lg bg-[#0000aa] border-2 border-[#ffaa00] hover:border-[#ffff55] hover:bg-[#332200] text-[#ffff55] hover:text-[#ffffff] shadow-sm flex items-center justify-center text-center font-serif font-bold text-sm sm:text-base transition-none select-text cursor-pointer leading-normal"
                    title={`البحث عن «${item.text}» في Google`}
                  >
                    <span>{item.text}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-1.5">
                <Book className="w-6 h-6 text-stone-400 mx-auto" />
                <div className="text-xs font-normal text-stone-700 dark:text-stone-300">
                  لم يتم العثور على مفردات معجمية مطابقة لهذه القيمة
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Results Header & Quick Search & System Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>المطابقات ({filteredMatches.length} / {matches.length})</span>
            </h3>

            {/* System Color Distinction Badges / Filter Tabs (Concise Captions) */}
            {matches.length > 0 && (
              <div className="inline-flex items-center gap-1 rounded border-2 border-[var(--dos-border)] p-1 bg-black/70 text-xs font-mono flex-wrap">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('all')}
                  onMouseEnter={() => setHintText(`تصفية النتائج: عرض كافة المطابقات المكتشفة في القرآن الكريم (${countsByOrigin.total})`)}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-none text-xs font-bold ${
                    selectedOriginFilter === 'all'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#000088] hover:text-white border border-[#55ffff]/50'
                  }`}
                  title="عرض كافة المطابقات في القرآن الكريم"
                >
                  {selectedOriginFilter === 'all' && '✓ '}الكل ({countsByOrigin.total})
                </button>

                {/* Verbatim Match if found in the Quran */}
                {countsByOrigin.verbatim > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedOriginFilter('verbatim')}
                    onMouseEnter={() => setHintText(`تصفية الكلمة المبحوثة: عرض النتائج التي وردت فيها الكلمة المبحوثة ذاتها نصياً في القرآن الكريم (${countsByOrigin.verbatim})`)}
                    onMouseLeave={clearHint}
                    className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 text-xs transition-none font-bold ${
                      selectedOriginFilter === 'verbatim'
                        ? 'dos-btn-pressed'
                        : 'bg-[#3b003b] text-[#ff77ff] hover:bg-[#550055] border border-[#ff55ff]'
                    }`}
                    title="المطابقات النصية الصريحة للكلمة المبحوثة في المصحف"
                  >
                    <span>{selectedOriginFilter === 'verbatim' && '✓ '}★ الكلمة المبحوثة ({countsByOrigin.verbatim})</span>
                  </button>
                )}

                {/* When search targets differ: DO NOT show "مشترك" button! Show "غربي" and "شرقي" */}
                {isTargetDiffering && (
                  <>
                    {/* Maghribi (غربي) - Amber */}
                    <button
                      type="button"
                      onClick={() => setSelectedOriginFilter('maghribi')}
                      onMouseEnter={() => setHintText(`تصفية النتائج: عرض المطابقات الخاصة بحساب الجُمّل الغربي/المغربي فقط (${countsByOrigin.maghribi})`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 text-xs transition-none font-bold ${
                        selectedOriginFilter === 'maghribi'
                          ? 'dos-btn-pressed'
                          : 'bg-[#331600] text-[#ffbb33] hover:bg-[#4a2200] border border-[#ffaa00]'
                      }`}
                      title="المطابقات وفق الجُمَّل الغربي (المغربي)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00]" />
                      <span>{selectedOriginFilter === 'maghribi' && '✓ '}غربي ({countsByOrigin.maghribi})</span>
                    </button>

                    {/* Mashriqi (شرقي) - Sky */}
                    <button
                      type="button"
                      onClick={() => setSelectedOriginFilter('mashriqi')}
                      onMouseEnter={() => setHintText(`تصفية النتائج: عرض المطابقات الخاصة بحساب الجُمّل الشرقي/المشرقي فقط (${countsByOrigin.mashriqi})`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 text-xs transition-none font-bold ${
                        selectedOriginFilter === 'mashriqi'
                          ? 'dos-btn-pressed'
                          : 'bg-[#001e38] text-[#55ffff] hover:bg-[#002e52] border border-[#00e5ff]'
                      }`}
                      title="المطابقات وفق الجُمَّل الشرقي (المشرقي)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                      <span>{selectedOriginFilter === 'mashriqi' && '✓ '}شرقي ({countsByOrigin.mashriqi})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {/* Filter Toggle Button (Short Caption: بدون تكرار) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFilterUnique((prev) => !prev)}
                onMouseEnter={() => setHintText(isFilterUnique ? 'إلغاء تصفية التكرار: عرض كافة تكرارات الآيات' : 'تفعيل تصفية التكرار: إبقاء المطابقات الفريدة فقط')}
                onMouseLeave={clearHint}
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
                onMouseEnter={() => setHintText(`نسخ الحافظة: نسخ كافة النتائج المكتشفة (${filteredMatches.length}) مرتبة مع حساباتها`)}
                onMouseLeave={clearHint}
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

            {/* Show / Hide Captions Toggle Button - Prominently in top bar */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCaptions((prev) => !prev)}
                onMouseEnter={() => setHintText(showCaptions ? 'إخفاء كابشن البطاقات: لتوفير المساحة والتركيز على العبارة القرآنية' : 'إظهار كابشن البطاقات: إبراز اسم السورة ورقم الآية وأزرار النسخ')}
                onMouseLeave={clearHint}
                className={`px-2 py-1 rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  showCaptions
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-bold'
                    : 'bg-white dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
                title={
                  showCaptions
                    ? 'الكابشن ظاهر على البطاقات - انقر للإخفاء والاعتماد على التفاصيل الموسعة'
                    : 'الكابشن مخفي افتراضياً - انقر لإظهار اسم السورة والأزرار على وجه البطاقة'
                }
              >
                {showCaptions ? (
                  <EyeOff className="w-3 h-3 text-white" />
                ) : (
                  <Eye className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{showCaptions ? 'إخفاء الكابشن' : 'إظهار الكابشن'}</span>
                {showCaptions && <span className="font-bold text-white">✓</span>}
              </button>
            )}

            {/* Quick Text Search with Full Ayah Toggle and Reset Filters */}
            {matches.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                <div className="relative flex items-center w-full sm:w-60 md:w-72">
                  <Search className="w-3.5 h-3.5 absolute right-2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={resultsFilter}
                    onChange={(e) => setResultsFilter(e.target.value)}
                    placeholder={
                      searchInFullAyah
                        ? 'بحث في العبارة أو الآية الكريمة كاملة...'
                        : 'بحث في العبارة المطابقة فقط...'
                    }
                    className="w-full text-xs font-normal pr-7 pl-6 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                  {resultsFilter && (
                    <button
                      type="button"
                      onClick={() => setResultsFilter('')}
                      className="absolute left-1.5 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      title="مسح نص البحث"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Toggle to search inside the full Quranic Ayah */}
                <button
                  type="button"
                  onClick={() => setSearchInFullAyah((prev) => !prev)}
                  onMouseEnter={() => setHintText(searchInFullAyah ? 'البحث يشمل نص الآية الكريمة كاملة: انقر للبحث في العبارة فقط' : 'البحث في العبارة فقط: انقر لشمول نص الآية الكريمة كاملة')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-1 rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                    searchInFullAyah
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 shadow-2xs font-semibold'
                      : 'bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                  }`}
                  title={
                    searchInFullAyah
                      ? 'البحث مفعل داخل نص الآية الكريمة كاملة والعبارة معاً (انقر للبحث في العبارة فقط)'
                      : 'البحث مقصور على العبارة فقط (انقر للبحث في الآية الكريمة كاملة)'
                  }
                >
                  <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>الآية كاملة</span>
                  <span className={`text-[10px] font-bold ${searchInFullAyah ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`}>
                    {searchInFullAyah ? '✓' : '○'}
                  </span>
                </button>

                {/* Reset all filters button if any filter or search is active */}
                {isAnyQuranFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetAllQuranFilters}
                    onMouseEnter={() => setHintText('إعادة ضبط كافة الفلاتر والخيارات وإظهار كافة النتائج')}
                    onMouseLeave={clearHint}
                    className="px-2 py-1 rounded-lg text-3xs font-medium border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                    title="إعادة ضبط ومسح كافة فلاتر البحث والخيارات"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>إعادة ضبط</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Toolbar for Sorting, Length Filtering & Short Captions */}
        {matches.length > 0 && (
          <div
            style={{ backgroundColor: 'var(--dos-panel, #0000a8)', borderColor: 'var(--dos-border, #55ffff)' }}
            className="p-2 border-2 flex items-center justify-between flex-wrap gap-2 text-xs font-mono shadow-md"
          >
            {/* Sorting Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#ffff55] font-black flex items-center gap-1 shrink-0 ml-1 text-xs font-mono">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#ffff55]" />
                <span>الترتيب:</span>
              </span>
              <div className="inline-flex items-center gap-1 bg-black/70 p-1 rounded border border-[var(--dos-border)]/70">
                <button
                  type="button"
                  onClick={() => setMatchSortBy('mushaf')}
                  onMouseEnter={() => setHintText('ترتيب المصحف: فرز المطابقات بحسب تسلسل السور والآيات في المصحف الشريف')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchSortBy === 'mushaf'
                      ? 'bg-[#ffff55] text-black font-black border border-white shadow-xs'
                      : 'bg-[#000044] text-[#55ffff] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="الترتيب حسب ورود السور والآيات في المصحف الشريف"
                >
                  المصحف
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('length_asc')}
                  onMouseEnter={() => setHintText('ترتيب الأقصر: إظهار المفردات والعبارات القرآنية القصيرة أولاً')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchSortBy === 'length_asc'
                      ? 'bg-[#ffff55] text-black font-black border border-white shadow-xs'
                      : 'bg-[#000044] text-[#55ffff] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="ترتيب النتائج من الأقصر إلى الأطول (عدد الكلمات والحروف)"
                >
                  الأقصر أولاً
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('length_desc')}
                  onMouseEnter={() => setHintText('ترتيب الأطول: إظهار السلاسل القرآنية الطويلة والآيات الكبرى أولاً')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchSortBy === 'length_desc'
                      ? 'bg-[#ffff55] text-black font-black border border-white shadow-xs'
                      : 'bg-[#000044] text-[#55ffff] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="ترتيب النتائج من الأطول إلى الأقصر (الآيات والسلاسل الأكبر أولاً)"
                >
                  الأطول أولاً
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSortBy('system')}
                  onMouseEnter={() => setHintText('ترتيب المشترك: تقديم الآيات المتطابقة حسابياً بين النظامين الشرقي والغربي أولاً')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchSortBy === 'system'
                      ? 'bg-[#ffff55] text-black font-black border border-white shadow-xs'
                      : 'bg-[#000044] text-[#55ffff] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="إظهار النتائج المشتركة والمتطابقة بين النظامين أولاً"
                >
                  المشترك أولاً
                </button>
              </div>
            </div>

            {/* Length Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#ffff55] font-black shrink-0 ml-1 text-xs font-mono">
                طول النتيجة:
              </span>
              <div className="inline-flex items-center gap-1 bg-black/70 p-1 rounded border border-[var(--dos-border)]/70 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('all')}
                  onMouseEnter={() => setHintText('تصفية الطول: إظهار كافة الأطوال دون استثناء (مفردات، قصيرة، متوسطة، وطويلة)')}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchLengthFilter === 'all'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                >
                  {matchLengthFilter === 'all' && '✓ '}الكل
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('single')}
                  onMouseEnter={() => setHintText(`تصفية المفردات: إظهار الكلمات القرآنية المفردة المكونة من كلمة واحدة فقط (${countsByLength.single})`)}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchLengthFilter === 'single'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="مفردات بكلمة واحدة فقط"
                >
                  {matchLengthFilter === 'single' && '✓ '}مفردة ({countsByLength.single})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('short')}
                  onMouseEnter={() => setHintText(`تصفية العبارات القصيرة: إظهار العبارات المكونة من 2 إلى 3 كلمات (${countsByLength.short})`)}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchLengthFilter === 'short'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="عبارات قصيرة تتكون من 2 إلى 3 كلمات"
                >
                  {matchLengthFilter === 'short' && '✓ '}قصيرة ({countsByLength.short})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('medium')}
                  onMouseEnter={() => setHintText(`تصفية العبارات المتوسطة: إظهار العبارات المكونة من 4 إلى 6 كلمات (${countsByLength.medium})`)}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchLengthFilter === 'medium'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="عبارات متوسطة من 4 إلى 6 كلمات"
                >
                  {matchLengthFilter === 'medium' && '✓ '}متوسطة ({countsByLength.medium})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchLengthFilter('long')}
                  onMouseEnter={() => setHintText(`تصفية السلاسل الطويلة: إظهار الآيات والسلاسل المكونة من 7 كلمات فأكثر (${countsByLength.long})`)}
                  onMouseLeave={clearHint}
                  className={`px-2 py-0.5 rounded transition-none cursor-pointer text-xs font-bold ${
                    matchLengthFilter === 'long'
                      ? 'dos-btn-pressed'
                      : 'bg-[#000044] text-[#ffff55] hover:bg-[#0000aa] hover:text-white border border-[#55ffff]/40'
                  }`}
                  title="عبارات وسلاسل طويلة من 7 كلمات فأكثر"
                >
                  {matchLengthFilter === 'long' && '✓ '}طويلة ({countsByLength.long})
                </button>
              </div>
            </div>

            {/* Additional Quick Toggles & Surah Filtering */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {/* Surah Filter Dropdown (Directly interconnected with Noorani 29 Surahs strip) */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[#ffff55] font-black shrink-0 ml-1 text-xs font-mono">
                  السورة:
                </span>
                <select
                  value={
                    filterSurahOrders.length === 1
                      ? String(filterSurahOrders[0])
                      : filterSurahOrders.length > 1
                      ? 'custom_multi'
                      : (linkWithNooraniSurahs && activeFormula && activeFormula.surahOrders && activeFormula.surahOrders.length > 0)
                      ? 'active_formula'
                      : onlyFawatihSurahs
                      ? 'all_fawatih'
                      : 'all'
                  }
                  onMouseEnter={() => setHintText('قائمة السور: حصر البحث داخل سورة معينة من الـ 114 أو ربطها بسور الفواتح الـ 29')}
                  onMouseLeave={clearHint}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      handleUnpinAndClearSurahs();
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
                  className="text-xs font-mono font-bold px-2 py-1 rounded border-2 border-[var(--dos-border)] bg-black text-[#55ff55] focus:outline-none cursor-pointer"
                  title="تصفية النتائج بحسب سورة معينة أو ربطها بسور الفواتح"
                >
                  <option value="all">كافة سور القرآن (114 سورة)</option>
                  <option value="all_fawatih">سور الفواتح الـ 29 (كاملة)</option>
                  {activeFormula && activeFormula.surahOrders && activeFormula.surahOrders.length > 0 && (
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
                onMouseEnter={() => setHintText('تصفية الفواتح: حصر النتائج على سور الفواتح النورانية الـ 29 فقط (كالبقرة، آل عمران، مريم، طه، يس...)')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded text-xs font-bold border transition-none cursor-pointer inline-flex items-center gap-1 ${
                  onlyFawatihSurahs
                    ? 'bg-[#ffaa00] text-black font-black border-white shadow-xs'
                    : 'bg-[#331600] text-[#ffbb33] border-[#ffaa00]/50 hover:bg-[#4a2200]'
                }`}
                title="حصر النتائج على سور الفواتح النورانية الـ 29 فقط (كالبقرة وآل عمران ومريم وطه ويس...)"
              >
                <span>فواتح فقط ({fawatihSurahsCount})</span>
                {onlyFawatihSurahs && <span className="text-black font-black">✓</span>}
              </button>

              {/* Link With Noorani Selection Toggle (Always Visible & Connected) */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !linkWithNooraniSurahs;
                  setLinkWithNooraniSurahs(nextVal);
                  // If disabling link, clear restricted surahs so results show all 114 surahs
                  if (!nextVal) {
                    setFilterSurahOrders([]);
                    setOnlyFawatihSurahs(false);
                  } else if (effectiveLinkedSurahNumbers.size === 0 && !onlyFawatihSurahs) {
                    if (activeFormula && activeFormula.surahOrders && activeFormula.surahOrders.length > 0) {
                      setFilterSurahOrders(activeFormula.surahOrders);
                    } else {
                      setOnlyFawatihSurahs(true);
                    }
                  }
                }}
                onMouseEnter={() => setHintText('ربط بسور الفواتح: مزامنة نتائج البحث وتصفيتها مع السور المحددة في شريط الـ 29 سورة')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded text-xs font-bold border transition-none cursor-pointer inline-flex items-center gap-1 ${
                  linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || onlyFawatihSurahs)
                    ? 'bg-[#00aa00] text-white font-black border-[#55ff55] shadow-xs'
                    : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/50 hover:bg-[#000088]'
                }`}
                title={
                  linkWithNooraniSurahs
                    ? 'ربط النتائج بسور قسم الأحرف المقطعة مفعل - انقر لفك الربط'
                    : 'انقر لتفعيل ربط النتائج بسور الفواتح والتركيبة المحددة'
                }
              >
                <Link2 className={`w-3.5 h-3.5 ${linkWithNooraniSurahs && (effectiveLinkedSurahNumbers.size > 0 || onlyFawatihSurahs) ? 'text-white' : 'text-[#55ffff]'}`} />
                <span>ربط بسور الفواتح</span>
                {linkWithNooraniSurahs && (
                  <span className="font-mono text-xs font-black text-white">
                    {effectiveLinkedSurahNumbers.size > 0 ? `(${effectiveLinkedSurahNumbers.size}س)` : '✓'}
                  </span>
                )}
              </button>

              {/* Show / Hide Captions Mode Toggle */}
              <button
                type="button"
                onClick={() => setShowCaptions((prev) => !prev)}
                onMouseEnter={() => setHintText(showCaptions ? 'إخفاء الكابشن: إخفاء اسم السورة ورقم الآية على وجه البطاقة لتوفير المساحة' : 'إظهار الكابشن: عرض اسم السورة ورقم الآية وأزرار النسخ على وجه البطاقة مباشرة')}
                onMouseLeave={clearHint}
                className={`px-2 py-0.5 rounded text-xs font-bold border transition-none cursor-pointer inline-flex items-center gap-1 ${
                  showCaptions
                    ? 'bg-[#ffff55] text-black font-black border-white shadow-xs'
                    : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/50 hover:bg-[#000088]'
                }`}
                title={
                  showCaptions
                    ? 'الكابشن ظاهر على البطاقات - انقر للإخفاء والاعتماد على التفاصيل الموسعة'
                    : 'الكابشن مخفي افتراضياً - انقر لإظهار اسم السورة والأزرار على وجه البطاقة'
                }
              >
                {showCaptions ? (
                  <EyeOff className="w-3.5 h-3.5 text-black" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-[#55ffff]" />
                )}
                <span>{showCaptions ? 'إخفاء الكابشن' : 'إظهار الكابشن'}</span>
                {showCaptions && <span className="font-black text-black">✓</span>}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-0.5">
              {filteredMatches.slice(0, visibleLimit).map((item) => {
              const isExpanded = expandedMatchId === item.id;
              const isCopied = copiedId === item.id;
              const surahMuqattaat = getSurahMuqattaat(item.surahNumber, item.surahName);

              // Verbatim Match detection (الكلمة المبحوثة ذاتها في المصحف)
              const isVerbatim = isVerbatimMatch(item.phrase, item.cleanPhrase);

              // Color Scheme based on System Origin:
              // When targets differ (isTargetDiffering is true):
              // Matches are STRICTLY either Maghribi or Mashriqi. NO COMMON COLOR!
              // When targets are identical (isTargetDiffering is false):
              // ALL non-verbatim matches have uniform common/unified color.
              const isCommon = !isTargetDiffering && !isVerbatim;
              const isMaghribi = isTargetDiffering && !isVerbatim && (computedTarget ? item.maghribiValue === computedTarget.targetMaghribi : item.systemOrigin === 'maghribi');
              const isMashriqi = isTargetDiffering && !isVerbatim && (computedTarget ? item.mashriqiValue === computedTarget.targetMashriqi : item.systemOrigin === 'mashriqi');

              const cardClasses = isVerbatim
                ? 'dos-card-verbatim ring-1 ring-[#ff55ff]'
                : isCommon
                ? 'dos-card-common'
                : isMaghribi
                ? 'dos-card-maghribi'
                : 'dos-card-mashriqi';

              const phraseTextClass = isVerbatim
                ? 'dos-phrase-verbatim font-black'
                : isCommon
                ? 'dos-phrase-common'
                : isMaghribi
                ? 'dos-phrase-maghribi'
                : 'dos-phrase-mashriqi';

              // Calculate total verification equation
              const wordEquation = item.breakdown.map((b) => `${b.word} (${b.value})`).join(' + ');
              const numSumEquation = item.breakdown.map((b) => b.value).join(' + ');
              const letterFullEquation = item.breakdown
                .map((b) => `[${b.letters.map((l) => `${l.char}=${isMaghribi ? l.magVal : isMashriqi ? l.mashVal : l.magVal}`).join('+')}]`)
                .join(' + ');

              const targetHighlightWord = resultsFilter.trim() || (committedQuery || inputQuery).trim();

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedMatchId(isExpanded ? null : item.id)}
                  onMouseEnter={() => {
                    const sysName = isVerbatim
                      ? '★ الكلمة المبحوثة ذاتها نصياً في القرآن الكريم'
                      : !isTargetDiffering
                      ? 'حساب موحد (متطابق بالنظامين)'
                      : isMaghribi
                      ? 'مغربي (غربي)'
                      : 'مشرقي (شرقي)';
                    const cleanEq = item.breakdown.map((b) => `${b.word}(${b.value})`).join(' + ');
                    const fawatihInfo = surahMuqattaat ? ` ۞ فواتح: [${surahMuqattaat}]` : '';
                    const fullAyah = item.fullAyahText ? `«${item.fullAyahText}»` : `«${item.phrase}»`;
                    const partInfo = item.fullAyahText && item.fullAyahText !== item.phrase ? ` ۞ المقطع: «${item.phrase}»` : '';
                    setHintText(`الآية الكريمة كاملة: ${fullAyah} ۞ سورة ${item.surahName} [آية ${item.ayahNumber}] ۞ جُمّل: ${item.value} ۞ [${sysName}]${partInfo} ۞ التفكيك: ${cleanEq}${fawatihInfo}`);
                  }}
                  onMouseLeave={clearHint}
                  className={`px-2.5 py-1.5 border shadow-2xs select-none group flex flex-col justify-center gap-1 cursor-pointer transition-none ${cardClasses} ${
                    isExpanded ? 'ring-2 ring-white shadow-xs' : ''
                  }`}
                  title={isExpanded ? 'انقر لإخفاء التفاصيل' : 'انقر لعرض تفاصيل الآية والتفكيك'}
                >
                  {/* Clean Single Row: Clickable Full Quranic Phrase (Right) & Small Surah/Ayah/Muqattaat (Left) */}
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    {/* Right side: Clickable Full Quranic Phrase (no sum badge, card color identifies system) */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isVerbatim && (
                        <span className="dos-badge-verbatim text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-mono font-black shrink-0 shadow-xs animate-pulse">
                          ★ الكلمة المبحوثة
                        </span>
                      )}

                      {!showCaptions ? (
                        <span
                          className={`text-xs sm:text-sm font-bold font-quran leading-normal truncate ${phraseTextClass}`}
                        >
                          {targetHighlightWord ? highlightQuranText(item.phrase, targetHighlightWord) : item.phrase}
                        </span>
                      ) : (
                        <a
                          href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs sm:text-sm font-bold font-quran leading-normal truncate hover:underline hover:text-white cursor-pointer ${phraseTextClass}`}
                          title={`البحث عن «${item.phrase}» في المصحف الشريف بموقع (qran-top)`}
                        >
                          {targetHighlightWord ? highlightQuranText(item.phrase, targetHighlightWord) : item.phrase}
                        </a>
                      )}

                      {/* Badge if matched inside full noble Ayah */}
                      {resultsFilter.trim() && searchInFullAyah && (() => {
                        const q = resultsFilter.trim();
                        const normQ = normalizeArabicForSearch(q);
                        const inPhrase = item.phrase.includes(q) || normalizeArabicForSearch(item.phrase).includes(normQ);
                        const inAyah = item.fullAyahText && (item.fullAyahText.includes(q) || normalizeArabicForSearch(item.fullAyahText).includes(normQ));
                        if (!inPhrase && inAyah) {
                          return (
                            <span
                              className="text-[9px] px-1 py-0.5 bg-[#003810] text-[#55ff55] font-sans inline-flex items-center gap-0.5 shrink-0 font-medium border border-[#33ff33]"
                              title={`الكلمة المبحوثة «${q}» وردت ضمن سياق الآية الكريمة لهذه النتيجة`}
                            >
                              <BookOpen className="w-2.5 h-2.5 text-[#55ff55]" />
                              <span>في سياق الآية</span>
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {isCopied && (
                        <span className="text-3xs text-[#55ff55] font-bold shrink-0">
                          [تم النسخ]
                        </span>
                      )}
                    </div>

                    {/* Left side: When captions are hidden (default), render nothing to maximize phrase space */}
                    {!showCaptions ? null : (
                      /* Left side when Captions are Visible: Smallest font Surah/Ayah + Muqatta'at + Copy + Notebook */
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
                            <span>({item.surahName}:{item.ayahNumber})</span>
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
                          {item.wordCount > 1 && (
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
                    )}
                  </div>

                  {/* Expanded Details: Shows Full Ayah + Surah Reference + Comprehensive Actions & Equation */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2.5 mt-1 border-t-2 border-white/60 text-3xs space-y-2.5 bg-black/90 p-3 font-mono shadow-md"
                    >
                      {/* Full Quranic Ayah Box */}
                      {item.fullAyahText && (
                        <div className="p-2 bg-black border border-white/40 space-y-1.5">
                          <div className="flex items-center justify-between text-3xs text-[#ffff55] flex-wrap gap-1">
                            <span className="font-bold">الآية الكريمة كاملة:</span>
                            <span className="font-sans font-medium text-[#55ffff] flex items-center gap-1.5">
                              <a
                                href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                                title={`البحث عن كلمة «${item.phrase}» في المصحف الشريف بموقع (qran-top)`}
                              >
                                <BookOpen className="w-3 h-3 text-[#55ff55]" />
                                <span>سورة {item.surahName} [الآية {item.ayahNumber}]</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                              {surahMuqattaat && (
                                <span
                                  className="text-4xs font-quran px-1.5 py-0.5 bg-[#4a4a00] text-[#ffff55] border border-[#ffff55] font-bold"
                                  title={`الأحرف المقطعة في فاتحة سورة ${item.surahName}`}
                                >
                                  فاتحة السورة: {surahMuqattaat}
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-quran leading-loose text-white text-right select-text">
                            ﴿ {resultsFilter.trim() && searchInFullAyah ? highlightQuranText(item.fullAyahText, resultsFilter.trim()) : item.fullAyahText} ﴾
                          </p>
                        </div>
                      )}

                      {/* Action Bar inside Expanded Details: Copy Phrase, Copy Ayah, Notebook, Quran Search */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Copy Phrase */}
                          <button
                            type="button"
                            onClick={() => handleCopyPhrase(item.id, item.phrase)}
                            className="px-2 py-1 bg-[#222222] hover:bg-[#ffff55] hover:text-black text-white border border-white cursor-pointer inline-flex items-center gap-1 text-3xs font-mono font-bold"
                            title="نسخ العبارة المطابقة"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-[#55ff55]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{isCopied ? 'تم النسخ' : 'نسخ العبارة'}</span>
                          </button>

                          {/* Copy Full Ayah */}
                          {item.fullAyahText && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`﴿ ${item.fullAyahText} ﴾ [سورة ${item.surahName}: ${item.ayahNumber}]`);
                                handleCopyPhrase(item.id + '_ayah', item.fullAyahText);
                              }}
                              className="px-2 py-1 bg-[#222222] hover:bg-[#ffff55] hover:text-black text-white border border-white cursor-pointer inline-flex items-center gap-1 text-3xs font-mono font-bold"
                              title="نسخ نص الآية الكريمة كاملة مع السورة ورقم الآية"
                            >
                              <BookOpen className="w-3 h-3 text-[#55ff55]" />
                              <span>نسخ الآية كاملة</span>
                            </button>
                          )}

                          {/* Add to Notebook */}
                          <AddToNotebookButton
                            word={item.phrase}
                            cipher={`= ${item.value} [${item.systemLabel}]`}
                            surahInfo={`سورة ${item.surahName}`}
                            ayahNum={item.ayahNumber}
                            type="quranic"
                            className="px-2 py-1 bg-[#222222] hover:bg-[#ffff55] hover:text-black text-white border border-white inline-flex items-center gap-1 text-3xs font-bold"
                          />

                          {/* Search in Quran (qran-top) */}
                          <a
                            href={item.quranUrl || getQuranTopSearchUrl(item.phrase)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-[#003810] hover:bg-[#55ff55] hover:text-black text-[#55ff55] border border-[#33ff33] inline-flex items-center gap-1 text-3xs font-bold cursor-pointer"
                            title="فتح محرك بحث القرآن الكريم (qran-top) لكافة مواضع هذه الكلمة"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>بحث بالمصحف</span>
                          </a>
                        </div>

                        {/* System Value */}
                        <div className="flex items-center gap-1 font-mono text-3xs">
                          {isCommon ? (
                            <span className="text-[#55ff55] font-bold px-1.5 py-0.5 bg-[#003810] border border-[#33ff33]">
                              المجموع المشترك = {item.value}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-black border border-white flex items-center gap-1">
                              <span className="text-[#ffaa00] font-bold">
                                غربي: {item.maghribiValue}
                              </span>
                              <span className="text-white">|</span>
                              <span className="text-[#55ffff] font-bold">
                                شرقي: {item.mashriqiValue}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Word Summation */}
                      <div className="p-2 bg-[#001800] border border-[#33ff33] space-y-1">
                        <div className="flex items-center gap-1 flex-wrap text-white font-mono">
                          <span className="font-bold text-[#ffff55]">{wordEquation}</span>
                          <span className="text-white">=</span>
                          <span className="font-bold text-[#55ff55]">{numSumEquation} = {item.value} ✓</span>
                        </div>

                        {/* Letter Breakdown Summation */}
                        <div className="text-[#aaffaa] font-mono text-4xs opacity-90 leading-relaxed">
                          {letterFullEquation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            {filteredMatches.length > visibleLimit && (
              <div className="pt-3 pb-1 flex justify-center w-full">
                <button
                  type="button"
                  onClick={() => {
                    setVisibleLimit((prev) => prev + 90);
                    if (isDos) playDosBeep(750, 20);
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-[#0000aa] hover:bg-[#55ffff] hover:text-black text-[#ffff55] border-2 border-[#55ffff] font-mono font-bold text-xs cursor-pointer active:translate-y-0.5 transition-none select-none text-center shadow-md"
                >
                  [▼ عرض 90 نتيجة إضافية ({filteredMatches.length - visibleLimit} نتيجة متبقية)]
                </button>
              </div>
            )}
          </>
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
          </>
        )}
        {/* Generous bottom spacer so the fixed DOS bottom hint bar never obscures the last result card */}
        <div className="h-24 sm:h-32 w-full shrink-0" aria-hidden="true" />
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
