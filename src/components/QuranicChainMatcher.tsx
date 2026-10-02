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
  Eye,
  EyeOff,
  Scissors,
  Scale,
  Moon,
  Calendar,
  Wand2,
} from 'lucide-react';
import {
  useGematria,
  MAGHRIBI_VALUES,
  MASHRIQI_VALUES,
  JAFR_MASHRIQI_VALUES,
  JAFR_MAGHRIBI_VALUES,
  BAYAT_MASHRIQI_VALUES,
  BAYAT_MAGHRIBI_VALUES,
  JAFR_VALUES,
  BAYAT_VALUES,
} from '../context/GematriaContext';
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
  countHamimInFormula,
  isStrictlyAuthenticHamimFormula,
  isNooraniChar,
  stripTrailingZeros,
  NOORANI_14_SET,
  getCurrentHijriLunarDay,
  getJabirPositionalMultiplier,
  deriveAamiriyaFromText,
  AamiriyaResult,
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
  const { calculationOptions } = useGematria();
  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint, setCurrentQuery } = useHint();

  const [inputQuery, setInputQuery] = useState<string>(() => initialQuery || '');
  const [committedQuery, setCommittedQuery] = useState<string>(() => (initialQuery || '').trim());

  useEffect(() => {
    if (initialQuery && initialQuery.trim() && initialQuery.trim() !== committedQuery) {
      setInputQuery(initialQuery.trim());
      setCommittedQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  const [selectedScope, setSelectedScope] = useState<'all' | 'verses_and_chains' | 'chains_only' | 'single_words'>('all');
  const [onlyNoorani, setOnlyNoorani] = useState<boolean>(false);
  const [isFilterUnique, setIsFilterUnique] = useState<boolean>(true);
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<'all' | 'common' | 'maghribi' | 'mashriqi' | 'jafr' | 'bayat' | 'verbatim'>('all');
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

  // Multi-Stage Sequential Pipeline Phase ('idle' | 'noorani' | 'quran' | 'processing' | 'completed')
  type ScanPipelinePhase = 'idle' | 'noorani' | 'quran' | 'processing' | 'completed';
  const [pipelinePhase, setPipelinePhase] = useState<ScanPipelinePhase>('idle');
  const isPipelineRunning = pipelinePhase === 'noorani' || pipelinePhase === 'quran' || pipelinePhase === 'processing';
  const [isStartBtnDepressed, setIsStartBtnDepressed] = useState<boolean>(false);
  const nooraniStartedRef = useRef(false);

  // Progressive rendering limit to prevent browser freeze when rendering thousands of items
  const [visibleLimit, setVisibleLimit] = useState<number>(90);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedPure, setCopiedPure] = useState<boolean>(false);
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

  // Query Gematria Calculation Options:
  // 'standard' = حساب الجُمّل الاعتيادي
  // 'noorani_only' = حساب النوراني فقط (إسقاط الحروف الظلمانية = 0)
  // 'strip_non_noorani_zeros' = شطب أصفار الظلماني (ت=4 بدلاً من 400)
  // 'jabir_scale' = ميزان جابر طردي تصاعدي (1 ← N)
  // 'jabir_desc' = ميزان جابر عكسي تنازلي (N ← 1)
  // 'jabir_pyramid' = ميزان جابر هرمي صعود وهبوط (1 ← M ← 1)
  // 'jabir_valley' = ميزان جابر قمعي هبوط وصعود (M ← 1 ← M)
  // 'lunar_scale' = الميزان القمري الزماني (تزايد النور في النصف الأول 1-14 والمحو في النصف الثاني 15-28)
  // 'amiriyyah' = الطريقة العامرية (اشتقاق بسط الحروف: الأول من 1، الثاني من 2، والأخير من الباقي)
  const todayHijriInfo = useMemo(() => getCurrentHijriLunarDay(), []);
  type NooraniQueryCalcMode =
    | 'standard'
    | 'noorani_only'
    | 'strip_non_noorani_zeros'
    | 'jabir_scale'
    | 'jabir_desc'
    | 'jabir_pyramid'
    | 'jabir_valley'
    | 'lunar_scale'
    | 'amiriyyah';

  const [nooraniQueryMode, setNooraniQueryMode] = useState<NooraniQueryCalcMode>('standard');
  const [lunarDay, setLunarDay] = useState<number>(() => {
    return calculationOptions?.lunarDay || getCurrentHijriLunarDay().lunarDay;
  });
  const [lunarCeilFraction, setLunarCeilFraction] = useState<boolean>(true);

  useEffect(() => {
    setVisibleLimit(90);
  }, [committedQuery, multiplier, selectedScope, selectedOriginFilter, resultsFilter, matchLengthFilter, onlyFawatihSurahs, nooraniQueryMode, lunarDay]);

  // Computed Target Information
  interface ComputedTargetInfo {
    isDirectNumber: boolean;
    baseMaghribi?: number;
    baseMashriqi?: number;
    baseJafr?: number;
    baseBayat?: number;
    multiplier?: number;
    targetMaghribi: number;
    targetMashriqi: number;
    targetJafr: number;
    targetBayat: number;
    rawFractionMaghribi?: number;
    rawFractionMashriqi?: number;
    rawFractionJafr?: number;
    rawFractionBayat?: number;
    hasFractionCeiled?: boolean;
    lunarDay?: number;
    isIdentical: boolean;
    alternateTargets: number[];
    queryText: string;
    cleanText: string;
    magBreakdown: { char: string; val: number; isNoorani?: boolean; originalVal?: number; charIndexInWord?: number; wordLetterCount?: number; jabirMultiplier?: number; wordIndex?: number }[];
    mashBreakdown: { char: string; val: number; isNoorani?: boolean; originalVal?: number; charIndexInWord?: number; wordLetterCount?: number; jabirMultiplier?: number; wordIndex?: number }[];
    jafrBreakdown: { char: string; val: number; isNoorani?: boolean; originalVal?: number; charIndexInWord?: number; wordLetterCount?: number; jabirMultiplier?: number; wordIndex?: number }[];
    bayatBreakdown: { char: string; val: number; isNoorani?: boolean; originalVal?: number; charIndexInWord?: number; wordLetterCount?: number; jabirMultiplier?: number; wordIndex?: number }[];
    isPureNoorani: boolean;
    calcMode?: 'standard' | 'noorani_only' | 'strip_non_noorani_zeros' | 'jabir_scale' | 'jabir_desc' | 'jabir_pyramid' | 'jabir_valley' | 'lunar_scale' | 'amiriyyah';
    amiriyyahResult?: AamiriyaResult | null;
  }

  // Helper to compute target info on demand (including multiplier and calculation options)
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
        baseJafr: baseVal,
        baseBayat: baseVal,
        multiplier: safeMult,
        targetMaghribi: targetVal,
        targetMashriqi: targetVal,
        targetJafr: targetVal,
        targetBayat: targetVal,
        isIdentical: true,
        alternateTargets: [] as number[],
        queryText: trimmed,
        cleanText: trimmed,
        magBreakdown: [],
        mashBreakdown: [],
        jafrBreakdown: [],
        bayatBreakdown: [],
        isPureNoorani: false,
        calcMode: nooraniQueryMode,
      };
    }

    const amiriyyah = deriveAamiriyaFromText(trimmed);
    const effectiveText = nooraniQueryMode === 'amiriyyah' ? (amiriyyah.derivedText || trimmed) : trimmed;
    const clean = cleanArabicTextForGematria(effectiveText);
    const baseMag = calculateGematriaWithOptions(effectiveText, rules, MAGHRIBI_VALUES);
    const baseMash = calculateGematriaWithOptions(effectiveText, rules, MASHRIQI_VALUES);
    const baseJafr = calculateGematriaWithOptions(effectiveText, rules, JAFR_VALUES);
    const baseBayat = calculateGematriaWithOptions(effectiveText, rules, BAYAT_VALUES);
    const magVal = baseMag * safeMult;
    const mashVal = baseMash * safeMult;
    const jafrVal = baseJafr * safeMult;
    const bayatVal = baseBayat * safeMult;

    // Compute alternate targets when flexibleOrthography is enabled
    const altTargets: number[] = [];
    if (flexOrth) {
      // 1. Alternate dagger alif (حساب مع الألف الخنجرية وبدونها)
      const altDagger: GematriaCalculationOptions = {
        ...rules,
        daggerAlif: rules.daggerAlif === 'count_as_1' ? 'ignore_0' : 'count_as_1',
      };
      altTargets.push(calculateGematriaWithOptions(effectiveText, altDagger, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altDagger, MASHRIQI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altDagger, JAFR_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altDagger, BAYAT_VALUES) * safeMult);

      // 2. Alternate silent waw (أولو / أولئك)
      const altWaw: GematriaCalculationOptions = {
        ...rules,
        silentWawMode: rules.silentWawMode === 'count_as_6' ? 'ignore_0' : 'count_as_6',
      };
      altTargets.push(calculateGematriaWithOptions(effectiveText, altWaw, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altWaw, MASHRIQI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altWaw, JAFR_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altWaw, BAYAT_VALUES) * safeMult);

      // 3. Alternate uthmani waw (الصلوة / الزكوة)
      const altUthmaniWaw: GematriaCalculationOptions = {
        ...rules,
        uthmaniWawMode: rules.uthmaniWawMode === 'as_alif_1' ? 'as_waw_6' : 'as_alif_1',
      };
      altTargets.push(calculateGematriaWithOptions(effectiveText, altUthmaniWaw, MAGHRIBI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altUthmaniWaw, MASHRIQI_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altUthmaniWaw, JAFR_VALUES) * safeMult);
      altTargets.push(calculateGematriaWithOptions(effectiveText, altUthmaniWaw, BAYAT_VALUES) * safeMult);
    }
    const alternateTargets = Array.from(new Set(altTargets)).filter((v) => v > 0 && v !== magVal && v !== mashVal && v !== jafrVal && v !== bayatVal);

    const words = effectiveText.split(/\s+/).filter(Boolean);
    const parsedChars: { char: string; wordIndex: number; charIndexInWord: number; wordLetterCount: number; jabirMultiplier: number }[] = [];
    words.forEach((w, wIdx) => {
      const wClean = cleanArabicTextForGematria(w);
      const wLetters = wClean.split('').filter((c) => c !== ' ');
      const wCount = wLetters.length;
      const jMode = rules.jabirMode || 'asc';
      wLetters.forEach((ch, cIdx) => {
        const pos = cIdx + 1;
        const jMult = rules.jabirScaleMode ? getJabirPositionalMultiplier(pos, wCount, jMode) : 1;
        parsedChars.push({
          char: ch,
          wordIndex: wIdx,
          charIndexInWord: pos,
          wordLetterCount: wCount,
          jabirMultiplier: jMult,
        });
      });
    });

    const isTaHa = rules.taMarbuta !== 'ta_400';
    const isPure = parsedChars.every((p) => isNooraniChar(p.char, isTaHa));

    const getOriginalCharVal = (c: string, table: Record<string, number>) => {
      if (c === 'ة' || c === 'ۃ') {
        return rules.taMarbuta === 'ta_400' ? (table['ت'] || 400) : (table['ه'] || table['ة'] || (table === JAFR_VALUES ? 6 : table === BAYAT_VALUES ? 1 : 5));
      }
      if (c === 'ى') {
        return rules.alifMaqsura === 'alif_1' ? (table['ا'] || (table === JAFR_VALUES ? 111 : table === BAYAT_VALUES ? 110 : 1)) : (table['ي'] || table['ى'] || (table === JAFR_VALUES ? 11 : table === BAYAT_VALUES ? 1 : 10));
      }
      if (['أ', 'إ', 'آ', 'ٱ'].includes(c)) {
        return table['ا'] || (table === JAFR_VALUES ? 111 : table === BAYAT_VALUES ? 110 : 1);
      }
      return table[c] ?? 0;
    };

    const getAdjustedCharVal = (c: string, jabirMult: number, table: Record<string, number>) => {
      const orig = getOriginalCharVal(c, table);
      const isNoorani = isNooraniChar(c, isTaHa);
      let val = orig;
      if (rules.nooraniOnlyMode) {
        val = isNoorani ? orig : 0;
      } else if (rules.stripNonNooraniZerosMode) {
        val = isNoorani ? orig : stripTrailingZeros(orig);
      }
      if (rules.jabirScaleMode) {
        val = val * jabirMult;
      }
      if (rules.lunarScaleMode) {
        const day = Math.min(28, Math.max(1, Math.round(rules.lunarDay ?? 14)));
        if (day <= 14) {
          if (isNoorani) {
            val = val * day;
          }
        } else {
          if (!isNoorani) {
            const divisor = day - 14;
            val = divisor > 0 ? val / divisor : val;
          }
        }
      }
      return val;
    };

    const magBreakdown = parsedChars.map((p) => ({
      char: p.char,
      val: getAdjustedCharVal(p.char, p.jabirMultiplier, MAGHRIBI_VALUES),
      isNoorani: isNooraniChar(p.char, isTaHa),
      originalVal: getOriginalCharVal(p.char, MAGHRIBI_VALUES),
      charIndexInWord: p.charIndexInWord,
      wordLetterCount: p.wordLetterCount,
      jabirMultiplier: p.jabirMultiplier,
      wordIndex: p.wordIndex,
    }));

    const mashBreakdown = parsedChars.map((p) => ({
      char: p.char,
      val: getAdjustedCharVal(p.char, p.jabirMultiplier, MASHRIQI_VALUES),
      isNoorani: isNooraniChar(p.char, isTaHa),
      originalVal: getOriginalCharVal(p.char, MASHRIQI_VALUES),
      charIndexInWord: p.charIndexInWord,
      wordLetterCount: p.wordLetterCount,
      jabirMultiplier: p.jabirMultiplier,
      wordIndex: p.wordIndex,
    }));

    const jafrBreakdown = parsedChars.map((p) => ({
      char: p.char,
      val: getAdjustedCharVal(p.char, p.jabirMultiplier, JAFR_VALUES),
      isNoorani: isNooraniChar(p.char, isTaHa),
      originalVal: getOriginalCharVal(p.char, JAFR_VALUES),
      charIndexInWord: p.charIndexInWord,
      wordLetterCount: p.wordLetterCount,
      jabirMultiplier: p.jabirMultiplier,
      wordIndex: p.wordIndex,
    }));

    const bayatBreakdown = parsedChars.map((p) => ({
      char: p.char,
      val: getAdjustedCharVal(p.char, p.jabirMultiplier, BAYAT_VALUES),
      isNoorani: isNooraniChar(p.char, isTaHa),
      originalVal: getOriginalCharVal(p.char, BAYAT_VALUES),
      charIndexInWord: p.charIndexInWord,
      wordLetterCount: p.wordLetterCount,
      jabirMultiplier: p.jabirMultiplier,
      wordIndex: p.wordIndex,
    }));

    const rawMag = magBreakdown.reduce((s, i) => s + i.val, 0) * safeMult;
    const rawMash = mashBreakdown.reduce((s, i) => s + i.val, 0) * safeMult;
    const rawJafr = jafrBreakdown.reduce((s, i) => s + i.val, 0) * safeMult;
    const rawBayat = bayatBreakdown.reduce((s, i) => s + i.val, 0) * safeMult;

    const hasFractionCeiled = rules.lunarScaleMode && (!Number.isInteger(rawMag) || !Number.isInteger(rawMash) || !Number.isInteger(rawJafr) || !Number.isInteger(rawBayat));

    return {
      isDirectNumber: false,
      baseMaghribi: baseMag,
      baseMashriqi: baseMash,
      baseJafr: baseJafr,
      baseBayat: baseBayat,
      multiplier: safeMult,
      targetMaghribi: magVal,
      targetMashriqi: mashVal,
      targetJafr: jafrVal,
      targetBayat: bayatVal,
      rawFractionMaghribi: rawMag,
      rawFractionMashriqi: rawMash,
      rawFractionJafr: rawJafr,
      rawFractionBayat: rawBayat,
      hasFractionCeiled,
      lunarDay: rules.lunarDay,
      isIdentical: magVal === mashVal && magVal === jafrVal && magVal === bayatVal,
      alternateTargets,
      queryText: trimmed,
      cleanText: clean,
      magBreakdown,
      mashBreakdown,
      jafrBreakdown,
      bayatBreakdown,
      isPureNoorani: isPure,
      calcMode: nooraniQueryMode,
      amiriyyahResult: amiriyyah,
    };
  };

  const effectiveRules = useMemo<GematriaCalculationOptions>(() => {
    const isJabir = ['jabir_scale', 'jabir_desc', 'jabir_pyramid', 'jabir_valley'].includes(nooraniQueryMode);
    let jabirMode: 'asc' | 'desc' | 'pyramid' | 'valley' = 'asc';
    if (nooraniQueryMode === 'jabir_desc') jabirMode = 'desc';
    else if (nooraniQueryMode === 'jabir_pyramid') jabirMode = 'pyramid';
    else if (nooraniQueryMode === 'jabir_valley') jabirMode = 'valley';

    return {
      ...localRules,
      nooraniOnlyMode: nooraniQueryMode === 'noorani_only',
      stripNonNooraniZerosMode: nooraniQueryMode === 'strip_non_noorani_zeros',
      jabirScaleMode: isJabir,
      jabirMode: jabirMode,
      lunarScaleMode: nooraniQueryMode === 'lunar_scale',
      lunarDay: lunarDay,
      lunarCeilFraction: lunarCeilFraction,
    };
  }, [localRules, nooraniQueryMode, lunarDay, lunarCeilFraction]);

  const computedTarget = useMemo<ComputedTargetInfo | null>(() => {
    return computeTargetInfo(committedQuery, effectiveRules, flexibleOrthography, multiplier);
  }, [committedQuery, effectiveRules, flexibleOrthography, multiplier]);

  const isTargetDiffering = useMemo(() => {
    return computedTarget ? !computedTarget.isIdentical : false;
  }, [computedTarget]);



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
      return Math.min(88, Math.max(25, 25 + Math.round((progress.percent || 0) * 0.63)));
    }
    if (pipelinePhase === 'processing') {
      return 95;
    }
    return 100;
  }, [isPipelineRunning, pipelinePhase, nooraniProgress, progress.percent, progress.currentSurahOrPhase]);

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
    mult: number = 1,
    mode?: NooraniQueryCalcMode,
    targetJafrVal?: number,
    targetBayatVal?: number
  ) => {
    if (!queryText.trim()) return;
    const activeMode = mode !== undefined ? mode : nooraniQueryMode;
    setSearchHistory((prev) => {
      const existing = prev.find(
        (item) => item.query === queryText && item.scope === scope && item.onlyNoorani === nooraniOnly && (item.multiplier || 1) === mult && (item.nooraniQueryMode || 'standard') === activeMode
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
        targetJafr: targetJafrVal,
        targetBayat: targetBayatVal,
        isIdentical: isIdenticalVal,
        multiplier: mult,
        matchesCount: matchesTotal !== undefined ? matchesTotal : existing?.matchesCount,
        isFavorite: isFav,
        nooraniQueryMode: activeMode,
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

    const targetDetails = computeTargetInfo(q, effectiveRules, flexibleOrthography, multToUse);
    const targetMag = targetDetails ? targetDetails.targetMaghribi : 0;
    const targetMash = targetDetails ? targetDetails.targetMashriqi : 0;
    const targetJafr = targetDetails ? targetDetails.targetJafr : 0;
    const targetBayat = targetDetails ? targetDetails.targetBayat : 0;
    const isIdenticalVal = targetDetails ? targetDetails.isIdentical : true;

    setProgress({
      percent: 0,
      scannedCount: 0,
      totalCount: 114,
      matchesCount: 0,
      itemsPerSecond: 0,
      currentSurahOrPhase: 'المرحلة 2: بدء المسح القرآني المدمج (الشرقي + الغربي + الجفر + البيات)...',
      isRunning: true,
      isCompleted: false,
      isCancelled: false,
    });

    recordSearchInHistory(q, scopeToUse, nooraniToUse, targetMag, targetMash, isIdenticalVal, undefined, multToUse, nooraniQueryMode, targetJafr, targetBayat);

    let matchBatch: InverseQuranicMatch[] = [];
    let lastFlushTime = Date.now();

    try {
      await scannerRef.current.scan(
        targetMag,
        targetMash,
        {
          calcOptions: effectiveRules,
          scope: scopeToUse,
          onlyNoorani: nooraniToUse,
          maxResults: 2500,
          maxPhraseLength: 16,
          alternateTargets: targetDetails?.alternateTargets || [],
          targetJafr,
          targetBayat,
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

            // Step 1: Processing matches (92%)
            setPipelinePhase('processing');
            setProgress((prev) => ({
              ...prev,
              percent: 92,
              currentSurahOrPhase: `[فرز وتدقيق]: جاري فرز وترتيب وتدقيق ${allMatches.length} مطابقة قرآنية...`,
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
              multToUse,
              nooraniQueryMode,
              targetJafr,
              targetBayat
            );

            // Step 2: Instant Display Ready (100% Completed)
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
        },
        targetJafr,
        targetBayat
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
    nooraniMode?: NooraniQueryCalcMode;
  }) => {
    const activeQuery = overrideParams?.query !== undefined ? overrideParams.query : inputQuery;
    const activeMult = overrideParams?.multiplier !== undefined ? overrideParams.multiplier : multiplier;
    const activeScope = overrideParams?.scope !== undefined ? overrideParams.scope : selectedScope;
    const activeOnlyNoorani = overrideParams?.onlyNoorani !== undefined ? overrideParams.onlyNoorani : onlyNoorani;

    const trimmed = activeQuery.trim();
    if (!trimmed) return;

    if (overrideParams?.scope) setSelectedScope(overrideParams.scope);
    if (overrideParams?.onlyNoorani !== undefined) setOnlyNoorani(overrideParams.onlyNoorani);
    if (overrideParams?.nooraniMode !== undefined) setNooraniQueryMode(overrideParams.nooraniMode);
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
    const mode = item.nooraniQueryMode || 'standard';
    setNooraniQueryMode(mode);
    handleStartScan({
      query: item.query,
      multiplier: itemMult,
      scope: item.scope,
      onlyNoorani: item.onlyNoorani,
      nooraniMode: mode,
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
    let jafr = 0;
    let bayat = 0;
    let verbatim = 0;

    for (const m of matches) {
      if (isVerbatimMatch(m.phrase, m.cleanPhrase)) verbatim++;
      if (isTargetDiffering) {
        // When targets differ, results belong to Eastern, Western, Jafr, or Bayat
        if (computedTarget && computedTarget.targetBayat > 0 && m.bayatValue === computedTarget.targetBayat) {
          bayat++;
        }
        if (computedTarget && computedTarget.targetJafr > 0 && m.jafrValue === computedTarget.targetJafr) {
          jafr++;
        }
        if (computedTarget ? m.mashriqiValue === computedTarget.targetMashriqi : m.systemOrigin === 'mashriqi') {
          mashriqi++;
        }
        if (computedTarget ? m.maghribiValue === computedTarget.targetMaghribi : m.systemOrigin === 'maghribi') {
          maghribi++;
        }
      } else {
        // When targets are identical, all results are common/unified
        common++;
        maghribi++;
        mashriqi++;
        jafr++;
        bayat++;
      }
    }
    return { common, maghribi, mashriqi, jafr, bayat, verbatim, total: matches.length };
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

    // 1. Filter by Origin tab (الكل / الكلمة المبحوثة / مغربي / شرقي / جفر / بيات)
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
      } else if (selectedOriginFilter === 'jafr') {
        list = list.filter((m) =>
          computedTarget && computedTarget.targetJafr > 0
            ? m.jafrValue === computedTarget.targetJafr
            : m.systemOrigin === 'jafr'
        );
      } else if (selectedOriginFilter === 'bayat') {
        list = list.filter((m) =>
          computedTarget && computedTarget.targetBayat > 0
            ? m.bayatValue === computedTarget.targetBayat
            : m.systemOrigin === 'bayat'
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


  const handleCopyPure = () => {
    if (filteredMatches.length === 0) return;
    // Extract pure, clean phrases/words only, one per line, without any numbering, headers, or details
    const purePhrases = filteredMatches.map((m) => m.phrase.trim()).filter(Boolean);
    const pureText = purePhrases.join('\n');

    navigator.clipboard.writeText(pureText);
    setCopiedPure(true);
    setTimeout(() => setCopiedPure(false), 2500);
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
                  {pipelinePhase === 'noorani' && `[المرحلة 1/3]: ${nooraniProgressMessage || 'توليف الصيغ والتراكيب النورانية...'}`}
                  {pipelinePhase === 'quran' && `[المرحلة 2/3]: مسح المصحف - ${progress.currentSurahOrPhase || 'جاري مسح الآيات والسلاسل...'}`}
                  {pipelinePhase === 'processing' && `[المرحلة 3/3]: ${progress.currentSurahOrPhase || 'فرز وتدقيق المطابقات القرآنية...'}`}
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
              <span className="text-[#55ff55] font-black">المطابقات القرآنية: {matches.length}</span>
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
                {/* Active Mode Indicator Badge */}
                {['jabir_scale', 'jabir_desc', 'jabir_pyramid', 'jabir_valley'].includes(nooraniQueryMode) && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-700 text-3xs shrink-0 select-none shadow-2xs"
                    title={
                      nooraniQueryMode === 'jabir_desc'
                        ? 'ميزان عكسي: ضرب الحرف الأول بأكبر رقم (طول الكلمة N) تنازلياً حتى الحرف الأخير × 1'
                        : nooraniQueryMode === 'jabir_pyramid'
                        ? 'ميزان هرمي: الحرف الأوسط هو أعلى معامل والأطراف أقل معامل (1 → M → 1)'
                        : nooraniQueryMode === 'jabir_valley'
                        ? 'ميزان وادي: الأطراف هي أعلى معامل والحرف الأوسط هو الأقل (M → 1 → M)'
                        : 'ميزان جابر: ضرب قيمة كل حرف بترتيبه تصاعدياً (1 → N) مع تصفير العداد لكل كلمة'
                    }
                  >
                    <Scale className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                    <span>
                      {nooraniQueryMode === 'jabir_desc'
                        ? 'عكسي'
                        : nooraniQueryMode === 'jabir_pyramid'
                        ? 'هرمي'
                        : nooraniQueryMode === 'jabir_valley'
                        ? 'وادي'
                        : 'جابر'}
                    </span>
                  </span>
                )}
                {nooraniQueryMode === 'lunar_scale' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-700 text-3xs shrink-0 select-none shadow-2xs"
                    title={`الميزان الزماني القمري (اليوم ${lunarDay} من 28): ${lunarDay <= 14 ? `فترة تزايد النور (الشرف ☀️) - النوراني × ${lunarDay}` : `فترة المحو (الظلمة 🌑) - الظلماني ÷ (${lunarDay} - 14 = ${lunarDay - 14})`} مع جبر الكسور`}
                  >
                    <Moon className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                    <span>الميزان القمري (اليوم {lunarDay} • {lunarDay <= 14 ? 'الشرف' : 'المحو'})</span>
                    {computedTarget?.hasFractionCeiled && (
                      <span className="text-4xs bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-1 rounded font-mono" title="تم جبر الكسور للناتج الصحيح">
                        جبر كسور
                      </span>
                    )}
                  </span>
                )}
                {nooraniQueryMode === 'noorani_only' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 text-3xs shrink-0 select-none"
                    title="الحساب مقتصر على الحروف النورانية فقط، مع إسقاط الحروف الظلمانية (0)"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>نوراني فقط</span>
                  </span>
                )}
                {nooraniQueryMode === 'strip_non_noorani_zeros' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700 text-3xs shrink-0 select-none"
                    title="تم شطب الأصفار من قيم الحروف الظلمانية (مثال: ت=4 بدلاً من 400)"
                  >
                    <Scissors className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                    <span>شطب أصفار الظلماني</span>
                  </span>
                )}
                {nooraniQueryMode === 'amiriyyah' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border border-amber-600 text-3xs shrink-0 select-none shadow-xs"
                    title={`الطريقة العامرية: تم اشتقاق الكلمة [${computedTarget?.amiriyyahResult?.derivedText || ''}] بحساب بسط أسماء الحروف`}
                  >
                    <Wand2 className="w-2.5 h-2.5 text-white" />
                    <span>العامرية: «{computedTarget?.amiriyyahResult?.derivedText || ''}»</span>
                  </span>
                )}

                {/* Letters breakdown */}
                {computedTarget.magBreakdown.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 py-0.5 border-l border-stone-250 dark:border-stone-700 pl-1.5 ml-0.5">
                    {computedTarget.magBreakdown.map((item, idx) => {
                      const mashVal = computedTarget.mashBreakdown[idx]?.val ?? item.val;
                      const jafrVal = computedTarget.jafrBreakdown[idx]?.val ?? item.val;
                      const bayatVal = computedTarget.bayatBreakdown[idx]?.val ?? item.val;
                      const origMagVal = item.originalVal ?? item.val;
                      const origMashVal = computedTarget.mashBreakdown[idx]?.originalVal ?? origMagVal;
                      const origJafrVal = computedTarget.jafrBreakdown[idx]?.originalVal ?? origMagVal;
                      const origBayatVal = computedTarget.bayatBreakdown[idx]?.originalVal ?? origMagVal;
                      const isDiff = item.val !== mashVal || item.val !== jafrVal || item.val !== bayatVal;
                      const isNoorani = item.isNoorani;
                      const isJabirActive = ['jabir_scale', 'jabir_desc', 'jabir_pyramid', 'jabir_valley'].includes(nooraniQueryMode);

                      let hint = `حرف [${item.char}] ۞ غربي: ${item.val} | شرقي: ${mashVal} | جفر: ${jafrVal} | بيات: ${bayatVal}`;
                      if (isJabirActive) {
                        const pos = item.charIndexInWord ?? (idx + 1);
                        const wCount = item.wordLetterCount ?? 1;
                        const factor = item.jabirMultiplier ?? pos;
                        const modeTitle =
                          nooraniQueryMode === 'jabir_desc'
                            ? `عكسي (الحرف ${pos} من ${wCount} × ${factor})`
                            : nooraniQueryMode === 'jabir_pyramid'
                            ? `هرمي (الحرف ${pos} من ${wCount} × ${factor})`
                            : nooraniQueryMode === 'jabir_valley'
                            ? `وادي (الحرف ${pos} من ${wCount} × ${factor})`
                            : `جابر (الحرف ${pos} من ${wCount} × ${factor})`;

                        hint = `حرف [${item.char}] [${modeTitle}] ۞ غربي: ${origMagVal} × ${factor} = ${item.val} | شرقي: ${origMashVal} × ${factor} = ${mashVal} | جفر: ${origJafrVal} × ${factor} = ${jafrVal} | بيات: ${origBayatVal} × ${factor} = ${bayatVal}`;
                      } else if (nooraniQueryMode === 'lunar_scale') {
                        if (lunarDay <= 14) {
                          if (isNoorani) {
                            hint = `حرف [${item.char}] نوراني (فترة الشرف والنور - اليوم ${lunarDay}): غربي = ${origMagVal} × ${lunarDay} = ${item.val} | شرقي = ${origMashVal} × ${lunarDay} = ${mashVal} | جفر = ${origJafrVal} × ${lunarDay} = ${jafrVal} | بيات = ${origBayatVal} × ${lunarDay} = ${bayatVal}`;
                          } else {
                            hint = `حرف [${item.char}] ظلماني (فترة الشرف): خامل لا يتغير = غربي: ${item.val} | شرقي: ${mashVal} | جفر: ${jafrVal} | بيات: ${bayatVal}`;
                          }
                        } else {
                          const divisor = lunarDay - 14;
                          if (isNoorani) {
                            hint = `حرف [${item.char}] نوراني (فترة المحو والظلمة): ثابت لا يتغير = غربي: ${item.val} | شرقي: ${mashVal} | جفر: ${jafrVal} | بيات: ${bayatVal}`;
                          } else {
                            const formattedMag = Number.isInteger(item.val) ? item.val : item.val.toFixed(2).replace(/\.?0+$/, '');
                            const formattedMash = Number.isInteger(mashVal) ? mashVal : mashVal.toFixed(2).replace(/\.?0+$/, '');
                            hint = `حرف [${item.char}] ظلماني (فترة المحو وتزايد الظلمة - اليوم ${lunarDay}): غربي = ${origMagVal} ÷ ${divisor} = ${formattedMag} | شرقي = ${origMashVal} ÷ ${divisor} = ${formattedMash} (تم جبر الكسر الكلي)`;
                          }
                        }
                      } else if (nooraniQueryMode === 'noorani_only' && !isNoorani) {
                        hint = `حرف [${item.char}] ظلماني (غير نوراني): أُسقط من الحساب = 0 (أصله: غربي=${origMagVal}، شرقي=${origMashVal}، جفر=${origJafrVal}، بيات=${origBayatVal})`;
                      } else if (nooraniQueryMode === 'strip_non_noorani_zeros' && !isNoorani && (origMagVal !== item.val || origMashVal !== mashVal || origJafrVal !== jafrVal || origBayatVal !== bayatVal)) {
                        hint = `حرف [${item.char}] ظلماني شُطبت أصفاره: غربي = ${item.val} (أصله: ${origMagVal}) | شرقي = ${mashVal} (أصله: ${origMashVal}) | جفر = ${jafrVal} (أصله: ${origJafrVal}) | بيات = ${bayatVal} (أصله: ${origBayatVal})`;
                      }

                      return (
                        <span
                          key={idx}
                          onMouseEnter={() => setHintText(hint)}
                          onMouseLeave={clearHint}
                          className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded border text-3xs ${
                            nooraniQueryMode === 'noorani_only' && !isNoorani
                              ? 'bg-stone-100/50 dark:bg-stone-850/50 border-dashed border-stone-300 dark:border-stone-700 opacity-60'
                              : isJabirActive
                              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                              : nooraniQueryMode === 'lunar_scale'
                              ? isNoorani
                                ? (lunarDay <= 14 ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700' : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-650')
                                : (lunarDay > 14 ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700' : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-650')
                              : isDiff
                              ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600'
                              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750'
                          }`}
                          title={hint}
                        >
                          <span className={`font-quran font-medium ${nooraniQueryMode === 'noorani_only' && !isNoorani ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                            {item.char}
                          </span>
                          {isJabirActive && (
                            <span className="text-purple-600 dark:text-purple-400 font-mono text-5xs font-bold select-none">
                              ×{item.jabirMultiplier ?? item.charIndexInWord ?? (idx + 1)}
                            </span>
                          )}
                          {nooraniQueryMode === 'lunar_scale' && (
                            <span className={`font-mono text-5xs font-bold select-none ${isNoorani ? (lunarDay <= 14 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400') : (lunarDay > 14 ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400')}`}>
                              {isNoorani ? (lunarDay <= 14 ? `×${lunarDay}` : '•نور') : (lunarDay > 14 ? `÷${lunarDay - 14}` : '•ظلم')}
                            </span>
                          )}
                          {isDiff ? (
                            <span className="flex items-center gap-0.5 text-4xs">
                              <span className="text-amber-600 dark:text-amber-400 font-bold" title="غربي">{Number.isInteger(item.val) ? item.val : item.val.toFixed(1)}</span>
                              <span className="text-stone-300">/</span>
                              <span className="text-sky-600 dark:text-sky-400 font-bold" title="شرقي">{Number.isInteger(mashVal) ? mashVal : mashVal.toFixed(1)}</span>
                              <span className="text-stone-300">/</span>
                              <span className="text-fuchsia-600 dark:text-fuchsia-400 font-bold" title="جفر">{Number.isInteger(jafrVal) ? jafrVal : jafrVal.toFixed(1)}</span>
                              <span className="text-stone-300">/</span>
                              <span className="text-teal-600 dark:text-teal-400 font-bold" title="بيات">{Number.isInteger(bayatVal) ? bayatVal : bayatVal.toFixed(1)}</span>
                            </span>
                          ) : (
                            <span className={`font-bold text-4xs ${nooraniQueryMode === 'noorani_only' && !isNoorani ? 'text-stone-400' : nooraniQueryMode === 'strip_non_noorani_zeros' && !isNoorani && origMagVal !== item.val ? 'text-amber-600 dark:text-amber-400' : nooraniQueryMode === 'jabir_scale' ? 'text-purple-700 dark:text-purple-300' : nooraniQueryMode === 'lunar_scale' ? 'text-indigo-700 dark:text-indigo-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                              {Number.isInteger(item.val) ? item.val : item.val.toFixed(1)}
                            </span>
                          )}
                          {nooraniQueryMode === 'strip_non_noorani_zeros' && !isNoorani && origMagVal !== item.val && (
                            <span className="text-stone-400 text-5xs line-through select-none">
                              ({origMagVal})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Totals in distinct Western (Amber), Eastern (Sky), Jafr (Fuchsia), and Bayat (Teal) colors with explicit labels */}
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
                      {/* All Systems Identical */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع متطابق ومشترك في كافة الأنظمة (شرقي وغربي وجفر وبيات): ${computedTarget.targetMaghribi}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#00290a] text-[#55ff55] border-2 border-[#33ff33] shadow-sm select-text"
                        title="المجموع متطابق ومشترك في كافة الأنظمة"
                      >
                        <span className="text-[#ffff55] font-black text-xs sm:text-sm">مشترك (شرقي وغربي وجفر وبيات):</span>
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

                      <span className="text-stone-400 font-bold text-lg hidden sm:inline">|</span>

                      {/* Jafr (جفر) */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع بحساب الجفر (بسط الحروف): ${computedTarget.targetJafr}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#2a0836] text-[#e879f9] border-2 border-[#d946ef] shadow-sm select-text"
                        title={`المجموع وفق حساب الجفر (بسط الحروف): ${computedTarget.targetJafr}`}
                      >
                        <span className="text-[#f5d0fe] font-black text-xs sm:text-sm">جفر:</span>
                        <strong className="text-xl sm:text-2xl md:text-3xl text-white font-black tracking-wide font-mono">
                          {computedTarget.targetJafr}
                        </strong>
                      </div>

                      <span className="text-stone-400 font-bold text-lg hidden sm:inline">|</span>

                      {/* Bayat (بيات) */}
                      <div
                        onMouseEnter={() => setHintText(`المجموع بحساب البيات المخصوص: ${computedTarget.targetBayat}`)}
                        onMouseLeave={clearHint}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-sm bg-[#002b28] text-[#2dd4bf] border-2 border-[#14b8a6] shadow-sm select-text"
                        title={`المجموع وفق حساب البيات: ${computedTarget.targetBayat}`}
                      >
                        <span className="text-[#99f6e4] font-black text-xs sm:text-sm">بيات:</span>
                        <strong className="text-xl sm:text-2xl md:text-3xl text-white font-black tracking-wide font-mono">
                          {computedTarget.targetBayat}
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

        {/* Single Row: Search Input + Multiplier + Start Action Button + History Trigger */}
        <div className="space-y-1.5">
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

          {/* Main Controls Row (Input, Multiplier, Start Button, History Button) - Unified Height & flex-nowrap */}
          <div className="flex items-center gap-1.5 w-full flex-nowrap">
            {/* Search Query Input with AutoFocus */}
            <div className="relative flex-1 min-w-0">
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
                className="w-full text-xs sm:text-sm font-quran font-normal h-9 sm:h-10 px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-right"
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
              className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 dark:bg-stone-850 px-2 h-9 sm:h-10 rounded-xl border border-stone-300 dark:border-stone-700 shadow-2xs shrink-0"
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
                className="w-7 sm:w-9 text-center font-mono font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 bg-transparent border-none focus:outline-none p-0"
                placeholder="1"
                aria-label="مضاعف الكلمة المبحوث عنها"
              />
            </div>

            {/* Compact Start Button (ابدأ) directly beside the input box */}
            <button
              type="button"
              onClick={() => handleStartScan()}
              disabled={!inputQuery.trim() || isPipelineRunning}
              className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 min-w-[70px] sm:min-w-[78px] ${
                isStartBtnDepressed
                  ? 'translate-y-1 scale-95 shadow-inner bg-emerald-800 border-t-2 border-l-2 border-black border-b-2 border-r-2 border-white'
                  : isPipelineRunning
                  ? 'bg-emerald-600/80 cursor-wait opacity-90'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
              title="بدء المسح القرآني الشامل (Enter)"
            >
              <Play className={`w-3.5 h-3.5 ${isPipelineRunning ? 'animate-pulse fill-current' : 'fill-current'}`} />
              <span>
                {pipelinePhase === 'noorani'
                  ? 'توليف'
                  : pipelinePhase === 'quran'
                  ? 'مسح'
                  : 'ابدأ'}
              </span>
            </button>

            {/* History Drawer Trigger Button beside Start button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="h-9 sm:h-10 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-all cursor-pointer shadow-2xs shrink-0 relative flex items-center justify-center min-w-[38px] sm:min-w-[42px]"
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

          {/* Query Gematria Calculation Options Row (حساب النوراني فقط | شطب أصفار الظلماني) */}
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <span className="text-3xs text-stone-400 dark:text-stone-500 font-mono select-none flex items-center gap-0.5 shrink-0">
              <SlidersHorizontal className="w-2.5 h-2.5 text-stone-400" />
              <span>حساب الكلمة:</span>
            </span>

            {/* Option 1: النوراني فقط */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'noorani_only' ? 'standard' : 'noorani_only';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'noorani_only' ? 660 : 440, 20);
              }}
              onMouseEnter={() => setHintText('حساب النوراني فقط: احتساب قيم الحروف النورانية الـ 14 فقط من الكلمة وإسقاط الحروف الظلمانية (قيمة 0)')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[100px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'noorani_only'
                  ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="احتساب الحروف النورانية فقط من الكلمة المدخلة وإسقاط غيرها (قيمتها = 0)"
            >
              <Sparkles className={`w-2.5 h-2.5 ${nooraniQueryMode === 'noorani_only' ? 'text-white' : 'text-emerald-500'}`} />
              <span>النوراني فقط</span>
              {nooraniQueryMode === 'noorani_only' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 2: شطب الأصفار */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'strip_non_noorani_zeros' ? 'standard' : 'strip_non_noorani_zeros';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'strip_non_noorani_zeros' ? 740 : 440, 20);
              }}
              onMouseEnter={() => setHintText('شطب أصفار الظلماني: اختزال وحذف الأصفار من قيم أي حرف غير نوراني (مثال: ت=400 تصبح 4، ف=80 تصبح 8، ش=3 أو 1) للشرقي والغربي')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[100px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'strip_non_noorani_zeros'
                  ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="شطب الأصفار من قيم أي حرف غير نوراني (مثال: ت=4 بدلاً من 400)"
            >
              <Scissors className={`w-2.5 h-2.5 ${nooraniQueryMode === 'strip_non_noorani_zeros' ? 'text-white' : 'text-amber-500'}`} />
              <span>شطب الأصفار</span>
              {nooraniQueryMode === 'strip_non_noorani_zeros' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 3A: جابر */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'jabir_scale' ? 'standard' : 'jabir_scale';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'jabir_scale' ? 880 : 440, 20);
              }}
              onMouseEnter={() => setHintText('ميزان جابر (تصاعدي 1 ← N): ضرب كل حرف بترتيبه تصاعدياً في الكلمة (الحرف 1 × 1، 2 × 2، ... N × N) مع تصفير العداد لكل كلمة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[70px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'jabir_scale'
                  ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="ميزان جابر (تصاعدي): الحرف 1 × 1، 2 × 2 ... N × N وتصفير العداد لكل كلمة"
            >
              <Scale className={`w-2.5 h-2.5 ${nooraniQueryMode === 'jabir_scale' ? 'text-white' : 'text-purple-500'}`} />
              <span>جابر</span>
              {nooraniQueryMode === 'jabir_scale' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 3B: عكسي */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'jabir_desc' ? 'standard' : 'jabir_desc';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'jabir_desc' ? 880 : 440, 20);
              }}
              onMouseEnter={() => setHintText('ميزان عكسي (تنازلي N ← 1): ضرب الحرف الأول بأكبر رقم (طول الكلمة N) والأخير برقم 1 (مثال كلمة 4 أحرف: 4، 3، 2، 1) مع تصفير العداد لكل كلمة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[70px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'jabir_desc'
                  ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="ميزان عكسي (تنازلي): الحرف الأول × N ... الأخير × 1 وتصفير العداد لكل كلمة"
            >
              <Scale className={`w-2.5 h-2.5 ${nooraniQueryMode === 'jabir_desc' ? 'text-white' : 'text-purple-500'}`} />
              <span>عكسي</span>
              {nooraniQueryMode === 'jabir_desc' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 3C: هرمي */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'jabir_pyramid' ? 'standard' : 'jabir_pyramid';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'jabir_pyramid' ? 880 : 440, 20);
              }}
              onMouseEnter={() => setHintText('ميزان هرمي (صعود وهبوط 1 ← M ← 1): الحرف الأوسط هو أعلى معامل والأطراف أقل معامل (مثال 5 أحرف: 1، 2، 3، 2، 1)')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[70px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'jabir_pyramid'
                  ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="ميزان هرمي (صعود وهبوط): الوسط أعلى معامل والأطراف أقل معامل (1 ← M ← 1)"
            >
              <Scale className={`w-2.5 h-2.5 ${nooraniQueryMode === 'jabir_pyramid' ? 'text-white' : 'text-purple-500'}`} />
              <span>هرمي</span>
              {nooraniQueryMode === 'jabir_pyramid' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 3D: وادي */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'jabir_valley' ? 'standard' : 'jabir_valley';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'jabir_valley' ? 880 : 440, 20);
              }}
              onMouseEnter={() => setHintText('ميزان وادي (هبوط وصعود M ← 1 ← M): الأطراف هي أعلى معامل والحرف الأوسط هو أقل معامل (مثال 5 أحرف: 3، 2، 1، 2، 3)')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[70px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'jabir_valley'
                  ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="ميزان وادي (هبوط وصعود): الأطراف أعلى معامل والوسط أقل معامل (M ← 1 ← M)"
            >
              <Scale className={`w-2.5 h-2.5 ${nooraniQueryMode === 'jabir_valley' ? 'text-white' : 'text-purple-500'}`} />
              <span>وادي</span>
              {nooraniQueryMode === 'jabir_valley' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 4: الميزان القمري (حساب الشرف والمحو) */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'lunar_scale' ? 'standard' : 'lunar_scale';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'lunar_scale' ? 980 : 440, 20);
              }}
              onMouseEnter={() => setHintText('الميزان الزماني القمري (حساب الشرف والمحو): تزايد النور في النصف الأول 1-14 (النوراني × اليوم)، وتزايد الظلمة والمحو في النصف الثاني 15-28 (الظلماني ÷ (اليوم - 14)) مع جبر الكسور')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[105px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'lunar_scale'
                  ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="الميزان الزماني القمري: حساب الشرف للنور في الأيام 1-14، وحساب المحو للظلمة في الأيام 15-28 مع جبر الكسور"
            >
              <Moon className={`w-2.5 h-2.5 ${nooraniQueryMode === 'lunar_scale' ? 'text-white' : 'text-indigo-500'}`} />
              <span>الميزان القمري</span>
              {nooraniQueryMode === 'lunar_scale' && <span className="text-2xs leading-none">✓</span>}
            </button>

            {/* Option 5: الطريقة العامرية (اشتقاق بسط الحروف) */}
            <button
              type="button"
              onClick={() => {
                const nextMode = nooraniQueryMode === 'amiriyyah' ? 'standard' : 'amiriyyah';
                setNooraniQueryMode(nextMode);
                if (isDos) playDosBeep(nextMode === 'amiriyyah' ? 920 : 440, 20);
              }}
              onMouseEnter={() => setHintText('الطريقة العامرية: بسط الحروف واشتقاق الأول من اسم 1، الثاني من اسم 2، والأخير من باقي الأسماء (مثال: علم -> عام، محمد -> مامل)')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 h-7 min-w-[90px] rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs ${
                nooraniQueryMode === 'amiriyyah'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-700 font-bold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750'
              }`}
              title="الطريقة العامرية: بسط كل حرف لاسمه، أخذ 1 من اسم الحرف الأول، و 2 من اسم الحرف الثاني، والأخير من باقي الأسماء"
            >
              <Wand2 className={`w-2.5 h-2.5 ${nooraniQueryMode === 'amiriyyah' ? 'text-white' : 'text-amber-500'}`} />
              <span>العامرية ✨</span>
              {nooraniQueryMode === 'amiriyyah' && <span className="text-2xs leading-none">✓</span>}
            </button>
          </div>

          {/* Dedicated Concise Caption & Rule Panel for Active Positional Scale Mode */}
          {['jabir_scale', 'jabir_desc', 'jabir_pyramid', 'jabir_valley'].includes(nooraniQueryMode) && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 text-3xs space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-purple-900 dark:text-purple-200">
                  <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    {nooraniQueryMode === 'jabir_desc'
                      ? 'ميزان عكسي (تنازلي N ← 1):'
                      : nooraniQueryMode === 'jabir_pyramid'
                      ? 'ميزان هرمي (صعود وهبوط 1 ← M ← 1):'
                      : nooraniQueryMode === 'jabir_valley'
                      ? 'ميزان وادي (هبوط وصعود M ← 1 ← M):'
                      : 'ميزان جابر (تصاعدي 1 ← N):'}
                  </span>
                  <span className="font-normal text-stone-600 dark:text-stone-300">
                    {nooraniQueryMode === 'jabir_desc'
                      ? 'ضرب الحرف الأول بأكبر رقم (طول الكلمة N) والأخير برقم 1'
                      : nooraniQueryMode === 'jabir_pyramid'
                      ? 'الحرف الأوسط هو أعلى معامل والأطراف أقل معامل'
                      : nooraniQueryMode === 'jabir_valley'
                      ? 'الأطراف هي أعلى معامل والحرف الأوسط هو أقل معامل'
                      : 'ضرب كل حرف بترتيبه تصاعدياً (الحرف 1 × 1، الحرف 2 × 2 ...)'}
                  </span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-mono text-4xs font-bold border border-purple-200 dark:border-purple-700">
                  تصفير العداد لكل كلمة
                </span>
              </div>
            </div>
          )}

          {/* Dedicated Interactive Lunar Day Control Panel when Lunar Scale is active */}
          {nooraniQueryMode === 'lunar_scale' && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2 animate-in fade-in duration-150">
              {/* Today's Real-time Hijri Hint & Auto-Sync Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40 border border-indigo-250 dark:border-indigo-800 text-3xs">
                <div className="flex items-center gap-1.5 flex-wrap text-indigo-950 dark:text-indigo-200">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>تاريخ اليوم هجرياً:</span>
                  <strong className="font-bold text-indigo-900 dark:text-indigo-100 bg-white/80 dark:bg-stone-900/80 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-700">
                    {todayHijriInfo.formattedHijriDate}
                  </strong>
                  <span className="text-stone-500 dark:text-stone-400">
                    (اليوم {todayHijriInfo.lunarDay} • {todayHijriInfo.phaseLabel})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setLunarDay(todayHijriInfo.lunarDay);
                      if (isDos) playDosBeep(880, 20);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs ${
                      lunarDay === todayHijriInfo.lunarDay
                        ? 'bg-emerald-600 text-white border border-emerald-700 cursor-default'
                        : 'bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/60'
                    }`}
                    title="ضبط العداد تلقائياً ليتطابق مع رقم اليوم القمري الفعلي للتاريخ الحالي"
                  >
                    {lunarDay === todayHijriInfo.lunarDay ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>مُطابق لليوم الفعلي ({todayHijriInfo.lunarDay})</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>مزامنة مع اليوم الفعلي ({todayHijriInfo.lunarDay})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>تعديل اليوم القمري (1 - 28):</span>
                  </span>

                  {/* Day Stepper Selector */}
                  <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-indigo-300 dark:border-indigo-700 rounded-lg px-1 py-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setLunarDay((prev) => Math.max(1, prev - 1))}
                      disabled={lunarDay <= 1}
                      className="px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="اليوم السابق"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm px-2 text-indigo-950 dark:text-indigo-100 min-w-[28px] text-center">
                      {lunarDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLunarDay((prev) => Math.min(28, prev + 1))}
                      disabled={lunarDay >= 28}
                      className="px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="اليوم التالي"
                    >
                      +
                    </button>
                  </div>

                  {/* Slider Control */}
                  <input
                    type="range"
                    min="1"
                    max="28"
                    step="1"
                    value={lunarDay}
                    onChange={(e) => setLunarDay(parseInt(e.target.value, 10))}
                    className="w-28 sm:w-36 h-2 bg-indigo-200 dark:bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    title={`اليوم القمري: ${lunarDay}`}
                  />

                  {lunarDay !== todayHijriInfo.lunarDay && (
                    <span className="text-4xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                      تخصيص يدوي
                    </span>
                  )}
                </div>

                {/* Quick Phase Tag */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                  {lunarDay <= 14 ? (
                    <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      <span>☀️ النصف الأول: فترة تزايد النور (حساب الشَرَف)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-950 dark:text-indigo-100 border border-indigo-300 dark:border-indigo-700">
                      <span>🌑 النصف الثاني: فترة المحو وتزايد الظلمة (حساب المَحْو)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Formula Explanation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-3xs text-indigo-900 dark:text-indigo-300 bg-white/70 dark:bg-stone-900/70 p-2 rounded-lg border border-indigo-200/80 dark:border-indigo-800/50">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {lunarDay <= 14 ? (
                    <span>
                      القاعدة (اليوم {lunarDay}): الحرف النوراني يُضرب في <strong className="text-amber-700 dark:text-amber-300 font-mono">({lunarDay})</strong> والظلماني يبقى بقيمته الأصلية دون تغيير.
                    </span>
                  ) : (
                    <span>
                      القاعدة (اليوم {lunarDay}): الحرف النوراني يبقى ثابتاً، والظلماني يُقسم على <strong className="text-indigo-700 dark:text-indigo-300 font-mono">({lunarDay} - 14 = {lunarDay - 14})</strong>.
                    </span>
                  )}
                  {computedTarget?.hasFractionCeiled && (
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      (تنبيه: العملية تشتمل على جبر للكسور للأعداد الصحيحة).
                    </span>
                  )}
                </div>

                {/* Day Presets Buttons */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  <span className="text-stone-400">أيام معيارية:</span>
                  {[
                    { day: 1, label: '1 (هلال)' },
                    { day: 10, label: '10 (شرف)' },
                    { day: 14, label: '14 (بدر)' },
                    { day: 24, label: '24 (محو)' },
                    { day: 28, label: '28 (محاق)' },
                  ].map((p) => (
                    <button
                      key={p.day}
                      type="button"
                      onClick={() => setLunarDay(p.day)}
                      className={`px-1.5 py-0.5 rounded text-4xs font-mono font-bold transition-all cursor-pointer ${
                        lunarDay === p.day
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Al-Amiriyyah Transformation Box (Shows when Amiriyyah mode is active or whenever text is typed) */}
          {computedTarget?.amiriyyahResult && computedTarget.amiriyyahResult.derivedText && (
            <div
              className={`p-2.5 sm:p-3 rounded-xl border space-y-2 transition-all animate-in fade-in duration-150 shadow-2xs ${
                nooraniQueryMode === 'amiriyyah'
                  ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/10 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-850/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                    ع
                  </span>
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1">
                    <span>الطريقة العامرية (اشتقاق بسط الحروف):</span>
                  </span>
                  <span className="text-3xs text-stone-500 dark:text-stone-400">
                    (أول حرف من اسم 1، ثاني حرف من اسم 2، وآخر حرف من باقي الأسماء)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500 dark:text-stone-400 text-3xs font-mono">الناتج:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-quran font-bold text-sm shadow-xs border border-amber-600">
                      «{computedTarget.amiriyyahResult.derivedText}»
                    </span>
                  </div>

                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800 text-3xs font-mono">
                    <span className="text-sky-700 dark:text-sky-300 font-bold">
                      شرقي: {computedTarget.amiriyyahResult.mashriqiSum}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">|</span>
                    <span className="text-amber-700 dark:text-amber-300 font-bold">
                      غربي: {computedTarget.amiriyyahResult.maghribiSum}
                    </span>
                  </div>

                  {nooraniQueryMode !== 'amiriyyah' && (
                    <button
                      type="button"
                      onClick={() => {
                        setNooraniQueryMode('amiriyyah');
                        if (isDos) playDosBeep(920, 20);
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-3xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                      title="تفعيل الطريقة العامرية لمطابقة السلاسل القرآنية على الكلمة المشتقة"
                    >
                      <Wand2 className="w-2.5 h-2.5" />
                      <span>تفعيل العامرية في البحث</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Step-by-Step letter derivation steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40">
                {computedTarget.amiriyyahResult.words.map((wRes, wIdx) =>
                  wRes.steps.map((st, sIdx) => (
                    <div
                      key={`amiri_matcher_step_${wIdx}_${sIdx}`}
                      className="px-2 py-1 rounded-lg bg-white/90 dark:bg-stone-850 border border-amber-200/80 dark:border-amber-800/80 text-3xs flex items-center justify-between gap-1 shadow-2xs"
                      title={st.ruleExplanation}
                    >
                      <span className="text-stone-700 dark:text-stone-300 font-quran font-medium">
                        [{st.char}] <span className="text-stone-400 dark:text-stone-500 text-4xs">({st.letterName})</span>
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">←</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold font-quran text-xs shadow-2xs">
                        {st.selectedChar}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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

                  if (n.system === 'both' || n.system === 'dual_match') {
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



      {/* Discovered Quranic Results Section (Maximized Direct Quranic View) */}
      <div className="space-y-2">
        {/* Results Header & Quick Search & System Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>المطابقات القرآنية ({filteredMatches.length} / {matches.length})</span>
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
                  className={`px-2 py-0.5 rounded cursor-pointer transition-none text-xs font-bold min-w-[85px] sm:min-w-[95px] inline-flex items-center justify-center text-center ${
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
                    className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center justify-center text-center gap-1 text-xs transition-none font-bold min-w-[95px] sm:min-w-[110px] ${
                      selectedOriginFilter === 'verbatim'
                        ? 'dos-btn-pressed'
                        : 'bg-[#3b003b] text-[#ff77ff] hover:bg-[#550055] border border-[#ff55ff]'
                    }`}
                    title="المطابقات النصية الصريحة للكلمة المبحوثة في المصحف"
                  >
                    <span>{selectedOriginFilter === 'verbatim' && '✓ '}★ اللفظية ({countsByOrigin.verbatim})</span>
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
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center justify-center text-center gap-1 text-xs transition-none font-bold min-w-[85px] sm:min-w-[95px] ${
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
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center justify-center text-center gap-1 text-xs transition-none font-bold min-w-[85px] sm:min-w-[95px] ${
                        selectedOriginFilter === 'mashriqi'
                          ? 'dos-btn-pressed'
                          : 'bg-[#001e38] text-[#55ffff] hover:bg-[#002e52] border border-[#00e5ff]'
                      }`}
                      title="المطابقات وفق الجُمَّل الشرقي (المشرقي)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                      <span>{selectedOriginFilter === 'mashriqi' && '✓ '}شرقي ({countsByOrigin.mashriqi})</span>
                    </button>

                    {/* Jafr (جفر) - Fuchsia */}
                    <button
                      type="button"
                      onClick={() => setSelectedOriginFilter('jafr')}
                      onMouseEnter={() => setHintText(`تصفية النتائج: عرض المطابقات الخاصة بحساب الجفر فقط (${countsByOrigin.jafr})`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center justify-center text-center gap-1 text-xs transition-none font-bold min-w-[85px] sm:min-w-[95px] ${
                        selectedOriginFilter === 'jafr'
                          ? 'dos-btn-pressed'
                          : 'bg-[#2a0836] text-[#f5d0fe] hover:bg-[#3f0c52] border border-[#d946ef]'
                      }`}
                      title="المطابقات وفق حساب الجفر (بسط الحروف)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d946ef]" />
                      <span>{selectedOriginFilter === 'jafr' && '✓ '}جفر ({countsByOrigin.jafr})</span>
                    </button>

                    {/* Bayat (بيات) - Teal */}
                    <button
                      type="button"
                      onClick={() => setSelectedOriginFilter('bayat')}
                      onMouseEnter={() => setHintText(`تصفية النتائج: عرض المطابقات الخاصة بحساب البيات فقط (${countsByOrigin.bayat})`)}
                      onMouseLeave={clearHint}
                      className={`px-2 py-0.5 rounded cursor-pointer inline-flex items-center justify-center text-center gap-1 text-xs transition-none font-bold min-w-[85px] sm:min-w-[95px] ${
                        selectedOriginFilter === 'bayat'
                          ? 'dos-btn-pressed'
                          : 'bg-[#002b28] text-[#99f6e4] hover:bg-[#00403c] border border-[#14b8a6]'
                      }`}
                      title="المطابقات وفق حساب البيات"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]" />
                      <span>{selectedOriginFilter === 'bayat' && '✓ '}بيات ({countsByOrigin.bayat})</span>
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

            {/* 1. Pure Copy Button (نسخ مجرد: العبارات والمفردات فقط صافية) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleCopyPure}
                onMouseEnter={() => setHintText(`نسخ مجرد: نسخ العبارات والمفردات القرآنية المكتشفة (${filteredMatches.length}) فقط صافية دون أي أرقام أو تفاصيل إضافية`)}
                onMouseLeave={clearHint}
                className={`px-2.5 py-1 rounded-lg text-3xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  copiedPure
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                }`}
                title="نسخ العبارات والمفردات القرآنية فقط صافية بدون تفاصيل أو أرقام أو أسماء السور"
              >
                {copiedPure ? (
                  <>
                    <Check className="w-3 h-3 text-white" />
                    <span>تم نسخ المجرد ({filteredMatches.length})</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>نسخ مجرد ({filteredMatches.length})</span>
                  </>
                )}
              </button>
            )}

            {/* 2. Detailed Copy Button (نسخ مفصل مع الحسابات والسور) */}
            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                onMouseEnter={() => setHintText(`نسخ مفصل: نسخ كافة النتائج المكتشفة (${filteredMatches.length}) مع أسماء السور وأرقام الآيات والقيم الحسابية`)}
                onMouseLeave={clearHint}
                className={`px-2 py-1 rounded-lg text-3xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                  copiedAll
                    ? 'bg-stone-200 dark:bg-stone-700 border-stone-400 text-stone-900 dark:text-stone-100 shadow-xs font-bold'
                    : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs'
                }`}
                title="نسخ جميع النتائج المكتشفة مفصلة مع السور والآيات والقيم الحسابية"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>تم النسخ المفصل</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" />
                    <span>نسخ مفصل</span>
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
              const isBayat = isTargetDiffering && !isVerbatim && (computedTarget && computedTarget.targetBayat > 0 ? item.bayatValue === computedTarget.targetBayat : item.systemOrigin === 'bayat');
              const isJafr = !isBayat && isTargetDiffering && !isVerbatim && (computedTarget && computedTarget.targetJafr > 0 ? item.jafrValue === computedTarget.targetJafr : item.systemOrigin === 'jafr');
              const isMaghribi = !isBayat && !isJafr && isTargetDiffering && !isVerbatim && (computedTarget ? item.maghribiValue === computedTarget.targetMaghribi : item.systemOrigin === 'maghribi');
              const isMashriqi = !isBayat && !isJafr && isTargetDiffering && !isVerbatim && (computedTarget ? item.mashriqiValue === computedTarget.targetMashriqi : item.systemOrigin === 'mashriqi');

              const cardClasses = isVerbatim
                ? 'dos-card-verbatim ring-1 ring-[#ff55ff]'
                : isCommon
                ? 'dos-card-common'
                : isBayat
                ? 'dos-card-bayat'
                : isJafr
                ? 'dos-card-jafr'
                : isMaghribi
                ? 'dos-card-maghribi'
                : 'dos-card-mashriqi';

              const phraseTextClass = isVerbatim
                ? 'dos-phrase-verbatim font-black'
                : isCommon
                ? 'dos-phrase-common'
                : isBayat
                ? 'dos-phrase-bayat font-bold'
                : isJafr
                ? 'dos-phrase-jafr font-bold'
                : isMaghribi
                ? 'dos-phrase-maghribi'
                : 'dos-phrase-mashriqi';

              // Calculate total verification equation
              const wordEquation = item.breakdown.map((b) => `${b.word} (${b.value})`).join(' + ');
              const numSumEquation = item.breakdown.map((b) => b.value).join(' + ');
              const letterFullEquation = item.breakdown
                .map((b) => `[${b.letters.map((l) => `${l.char}=${isBayat ? (l.bayatVal ?? l.magVal) : isJafr ? (l.jafrVal ?? l.magVal) : isMaghribi ? l.magVal : isMashriqi ? l.mashVal : l.magVal}`).join('+')}]`)
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
                      ? 'حساب موحد (متطابق بكافة الأنظمة)'
                      : isBayat
                      ? 'بيات (حساب البيات المخصوص)'
                      : isJafr
                      ? 'جفر (بسط الحروف)'
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
                              {item.jafrValue !== undefined && (
                                <>
                                  <span className="text-white">|</span>
                                  <span className="text-[#f5d0fe] font-bold">
                                    جفر: {item.jafrValue}
                                  </span>
                                </>
                              )}
                              {item.bayatValue !== undefined && (
                                <>
                                  <span className="text-white">|</span>
                                  <span className="text-[#99f6e4] font-bold">
                                    بيات: {item.bayatValue}
                                  </span>
                                </>
                              )}
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
