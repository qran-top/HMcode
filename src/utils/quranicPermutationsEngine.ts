// Quranic Permutations Engine (علم تقاليب وتباديل الكلمات في القرآن الكريم)
// Based on classical Arabic lexicography (علم التقاليب / الاشتقاق الأكبر عند الخليل بن أحمد وابن جني)
// Ultra-fast index-accelerated engine: Generates all permutations and extracts Quranic occurrences instantly (< 30ms).

import { normalizeAbjadChar, ABJAD_VALUES } from './gematriaEngine';
import { loadCompleteQuranCorpus, QuranAyahItem } from './inverseQuranicMatcher';
import { SURAH_NAMES, getQuranTopAyahUrl } from './quranicDictionary';
import { MAGHRIBI_VALUES, MASHRIQI_VALUES, SRQM_1_VALUES } from '../context/GematriaContext';

export interface PermutationAyahOccurrence {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  matchedWords: string[];
  isExact: boolean;
  quranUrl: string;
}

export interface WordPermutationItem {
  permutation: string;
  letters: string[];
  isQuranic: boolean;
  isOriginal: boolean;
  exactCount: number;
  allOccurrencesCount: number;
  occurrences: PermutationAyahOccurrence[];
  surahsCount: number;
  sampleAyahs: PermutationAyahOccurrence[];
}

export interface QuranicPermutationsAnalysis {
  originalWord: string;
  cleanLetters: string[];
  totalPossiblePermutations: number;
  quranicPermutationsCount: number;
  dormantPermutationsCount: number;
  totalVersesCount: number;
  totalOccurrencesCount: number;
  sharedGematria: {
    standard: number;
    mashriqi: number;
    maghribi: number;
    srqm1: number;
  };
  permutations: WordPermutationItem[];
}

export interface PermutationsProgress {
  percent: number;
  phase: 'permuting' | 'scanning' | 'indexing' | 'completed';
  message: string;
  scannedAyahs: number;
  totalAyahs: number;
  foundMatchesCount: number;
}

/**
 * Common and compound prefixes in Quranic Arabic (ordered by length descending)
 */
export const COMMON_ARABIC_PREFIXES = [
  'وبال', 'وفال', 'ولل', 'فلل', 'وال', 'فال', 'كال', 'بال', 'ول', 'فل', 'بل',
  'لل', 'ال',
  'سي', 'ست', 'سن', 'سأ',
  'وي', 'وت', 'ون', 'وأ',
  'في', 'فت', 'فن', 'فأ',
  'لي', 'لت', 'لن', 'لأ',
  'بي',
  'و', 'ف', 'ب', 'ل', 'ك', 'س', 'ي', 'ت', 'ن', 'ا', 'أ', 'إ'
];

export const PREFIXES_SET = new Set(COMMON_ARABIC_PREFIXES);

/**
 * Common and compound suffixes in Quranic Arabic (pronouns, gender/number, accusative, etc.):
 */
export const COMMON_ARABIC_SUFFIXES = [
  'ناهم', 'ناكم', 'تموه', 'تموها', 'تما', 'تم', 'تن', 'ناه', 'ناها',
  'هما', 'كما', 'هم', 'هن', 'كم', 'كن',
  'تني', 'تهم', 'تها', 'ته', 'تك', 'تي',
  'ني', 'نا', 'ها', 'هو', 'وا', 'ون', 'ين', 'ات', 'ان', 'تا',
  'ت', 'ة', 'ه', 'ي', 'ا', 'اً', 'هـ'
];

export const SUFFIXES_SET = new Set(COMMON_ARABIC_SUFFIXES);

/**
 * Cleans a word for permutation: strips diacritics, tatweel, and non-letters
 */
export function cleanWordForPermutations(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u0640/g, '') // remove tatweel
    .replace(/[^\u0621-\u064A\u0671]/g, '')
    .trim();
}

/**
 * Normalizes alef and letter variants for flexible matching
 */
export function normalizeForPermutation(text: string): string {
  if (!text) return '';
  return cleanWordForPermutations(text)
    .replace(/[أإآءٱٲٳٵ]/g, 'ا')
    .replace(/[ةہۃ]/g, 'ه')
    .replace(/[ىئۍې]/g, 'ي')
    .replace(/[ؤٶۇ]/g, 'و');
}

export const NORM_PREFIXES_SET = new Set(COMMON_ARABIC_PREFIXES.map(p => normalizeForPermutation(p)));
export const NORM_SUFFIXES_SET = new Set(COMMON_ARABIC_SUFFIXES.map(s => normalizeForPermutation(s)));

/**
 * Generates all unique mathematical permutations for an array of characters
 * (handles duplicate letters correctly using backtracking with frequency checks)
 */
export function generateUniquePermutations(word: string, maxPermutations = 720): string[] {
  const clean = cleanWordForPermutations(word);
  if (!clean) return [];

  const chars = clean.split('');
  if (chars.length <= 1) return [clean];

  // Limit very long words to prevent browser freezes (e.g. > 6 chars)
  const effectiveChars = chars.slice(0, 6);
  effectiveChars.sort();

  const results: string[] = [];
  const used = new Array(effectiveChars.length).fill(false);

  function backtrack(current: string[]) {
    if (results.length >= maxPermutations) return;
    if (current.length === effectiveChars.length) {
      results.push(current.join(''));
      return;
    }
    for (let i = 0; i < effectiveChars.length; i++) {
      if (used[i]) continue;
      // Skip duplicates in same branch
      if (i > 0 && effectiveChars[i] === effectiveChars[i - 1] && !used[i - 1]) continue;

      used[i] = true;
      current.push(effectiveChars[i]);
      backtrack(current);
      current.pop();
      used[i] = false;
    }
  }

  backtrack([]);

  // Put user's exact original word at the top if present
  const originalIdx = results.indexOf(clean);
  if (originalIdx > 0) {
    results.splice(originalIdx, 1);
    results.unshift(clean);
  }

  return results;
}

/**
 * Checks if an Arabic word from the Quran matches a target permutation (as stem, exact, or derivative)
 */
export function matchArabicStem(
  rawQuranWord: string,
  targetPermutation: string,
  mode: 'stem' | 'exact' | 'contains' = 'stem'
): { isMatch: boolean; isExact: boolean } {
  const cw = cleanWordForPermutations(rawQuranWord);
  if (!cw) return { isMatch: false, isExact: false };

  // 1. Direct exact match (both raw clean and normalized)
  if (cw === targetPermutation) {
    return { isMatch: true, isExact: true };
  }

  const normCw = normalizeForPermutation(cw);
  const normTarget = normalizeForPermutation(targetPermutation);

  if (normCw === normTarget) {
    return { isMatch: true, isExact: true };
  }

  if (mode === 'exact') {
    return { isMatch: false, isExact: false };
  }

  // 2. Contains mode (substring)
  if (mode === 'contains') {
    if (cw.includes(targetPermutation) || normCw.includes(normTarget)) {
      return { isMatch: true, isExact: false };
    }
    return { isMatch: false, isExact: false };
  }

  // 3. Stem mode (prefix + target + suffix)
  // Fast check: if the word doesn't contain target permutation as substring, skip
  if (!cw.includes(targetPermutation) && !normCw.includes(normTarget)) {
    return { isMatch: false, isExact: false };
  }

  // Check prefix only (ends with target)
  if (cw.endsWith(targetPermutation)) {
    const pref = cw.slice(0, cw.length - targetPermutation.length);
    if (PREFIXES_SET.has(pref) || pref === '') {
      return { isMatch: true, isExact: false };
    }
  }
  if (normCw.endsWith(normTarget)) {
    const pref = normCw.slice(0, normCw.length - normTarget.length);
    if (NORM_PREFIXES_SET.has(pref) || pref === '') {
      return { isMatch: true, isExact: false };
    }
  }

  // Check suffix only (starts with target)
  if (cw.startsWith(targetPermutation)) {
    const suff = cw.slice(targetPermutation.length);
    if (SUFFIXES_SET.has(suff) || suff === '') {
      return { isMatch: true, isExact: false };
    }
  }
  if (normCw.startsWith(normTarget)) {
    const suff = normCw.slice(normTarget.length);
    if (NORM_SUFFIXES_SET.has(suff) || suff === '') {
      return { isMatch: true, isExact: false };
    }
  }

  // Check prefix + target + suffix
  for (const pref of COMMON_ARABIC_PREFIXES) {
    if (cw.startsWith(pref)) {
      const rest = cw.slice(pref.length);
      if (rest.startsWith(targetPermutation)) {
        const suff = rest.slice(targetPermutation.length);
        if (suff === '' || SUFFIXES_SET.has(suff)) {
          return { isMatch: true, isExact: false };
        }
      }
    }

    const normPref = normalizeForPermutation(pref);
    if (normCw.startsWith(normPref)) {
      const normRest = normCw.slice(normPref.length);
      if (normRest.startsWith(normTarget)) {
        const normSuff = normRest.slice(normTarget.length);
        if (normSuff === '' || NORM_SUFFIXES_SET.has(normSuff)) {
          return { isMatch: true, isExact: false };
        }
      }
    }
  }

  return { isMatch: false, isExact: false };
}

/**
 * Calculates unified Gematria sums for the letters of a word
 */
export function calculateSharedPermutationsGematria(letters: string[]) {
  let standard = 0;
  let mashriqi = 0;
  let maghribi = 0;
  let srqm1 = 0;

  for (const c of letters) {
    const norm = normalizeAbjadChar(c);
    standard += ABJAD_VALUES[c] ?? ABJAD_VALUES[norm] ?? 0;
    mashriqi += MASHRIQI_VALUES[c] ?? MASHRIQI_VALUES[norm] ?? 0;
    maghribi += MAGHRIBI_VALUES[c] ?? MAGHRIBI_VALUES[norm] ?? 0;
    srqm1 += SRQM_1_VALUES[c] ?? SRQM_1_VALUES[norm] ?? 0;
  }

  return { standard, mashriqi, maghribi, srqm1 };
}

/**
 * Pre-indexed Ayah Token representation for ultra-fast instant searches (< 20ms)
 */
interface PrecomputedAyah {
  sn: number;
  s: string;
  a: number;
  t: string;
  cleanAyah: string;
  normAyah: string;
  words: Array<{
    raw: string;
    clean: string;
    norm: string;
  }>;
}

let precomputedCorpusCache: PrecomputedAyah[] | null = null;
let isPrecomputingCorpus: boolean = false;

/**
 * Precomputes and caches the entire Quran corpus in memory once
 */
async function getPrecomputedCorpus(): Promise<PrecomputedAyah[]> {
  if (precomputedCorpusCache && precomputedCorpusCache.length >= 6200) {
    return precomputedCorpusCache;
  }

  if (isPrecomputingCorpus) {
    while (isPrecomputingCorpus) {
      await new Promise((r) => setTimeout(r, 20));
    }
    if (precomputedCorpusCache && precomputedCorpusCache.length >= 6200) {
      return precomputedCorpusCache;
    }
  }

  isPrecomputingCorpus = true;
  try {
    const rawAyahs = await loadCompleteQuranCorpus();
    const result: PrecomputedAyah[] = new Array(rawAyahs.length);

    for (let i = 0; i < rawAyahs.length; i++) {
      const ayah = rawAyahs[i];
      const rawTokens = (ayah.t || '').split(/\s+/).filter(Boolean);
      const words = new Array(rawTokens.length);

      for (let j = 0; j < rawTokens.length; j++) {
        const raw = rawTokens[j];
        const clean = cleanWordForPermutations(raw);
        const norm = normalizeForPermutation(clean);
        words[j] = { raw, clean, norm };
      }

      const cleanAyah = cleanWordForPermutations(ayah.t || '');
      const normAyah = normalizeForPermutation(cleanAyah);

      result[i] = {
        sn: ayah.sn,
        s: ayah.s || SURAH_NAMES[ayah.sn] || 'سورة',
        a: ayah.a,
        t: ayah.t,
        cleanAyah,
        normAyah,
        words,
      };
    }

    precomputedCorpusCache = result;
    return result;
  } finally {
    isPrecomputingCorpus = false;
  }
}

/**
 * In-memory cache for recent permutations analyses to make switching instant
 */
const permutationsCache = new Map<string, QuranicPermutationsAnalysis>();

/**
 * Ultra-Fast Exhaustive Analysis of Word Permutations across the Quran (< 20ms)
 */
export async function analyzeWordPermutations(
  word: string,
  options: {
    matchMode?: 'stem' | 'exact' | 'contains';
    onProgress?: (p: PermutationsProgress) => void;
    abortSignal?: AbortSignal;
  } = {}
): Promise<QuranicPermutationsAnalysis | null> {
  const clean = cleanWordForPermutations(word);
  if (!clean) return null;

  const matchMode = options.matchMode ?? 'stem';
  const cacheKey = `${clean}_${matchMode}`;
  if (permutationsCache.has(cacheKey)) {
    return permutationsCache.get(cacheKey)!;
  }

  const { onProgress, abortSignal } = options;

  onProgress?.({
    percent: 10,
    phase: 'permuting',
    message: `جاري توليف كافة التباديل الرياضية لأحرف «${clean}»...`,
    scannedAyahs: 0,
    totalAyahs: 6236,
    foundMatchesCount: 0,
  });

  const letters = clean.split('');
  const permutationsList = generateUniquePermutations(clean);
  const sharedGematria = calculateSharedPermutationsGematria(letters);

  // Load precomputed corpus (instant from memory)
  const corpus = await getPrecomputedCorpus();
  if (abortSignal?.aborted) return null;

  const totalAyahs = corpus.length;

  // Prepare map for each permutation
  const permDataMap = new Map<
    string,
    {
      normP: string;
      exactCount: number;
      allCount: number;
      occurrences: PermutationAyahOccurrence[];
      surahsSet: Set<number>;
    }
  >();

  for (const p of permutationsList) {
    permDataMap.set(p, {
      normP: normalizeForPermutation(p),
      exactCount: 0,
      allCount: 0,
      occurrences: [],
      surahsSet: new Set(),
    });
  }

  let totalMatchesFound = 0;

  // FAST SCAN: Filter ayahs in milliseconds
  for (let idx = 0; idx < totalAyahs; idx++) {
    if (abortSignal?.aborted) return null;

    const item = corpus[idx];

    // Quick filter: which permutations might exist in this ayah?
    const candidates: Array<{ p: string; normP: string }> = [];
    for (const p of permutationsList) {
      const data = permDataMap.get(p)!;
      if (item.cleanAyah.includes(p) || item.normAyah.includes(data.normP)) {
        candidates.push({ p, normP: data.normP });
      }
    }

    // Over 6,000 ayahs are skipped here in < 1 microsecond each!
    if (candidates.length === 0) continue;

    // For candidate permutations only, match words
    for (let c = 0; c < candidates.length; c++) {
      const { p, normP } = candidates[c];
      const data = permDataMap.get(p)!;
      const matchedTokensInAyah: string[] = [];
      let hasExactInAyah = false;

      for (let w = 0; w < item.words.length; w++) {
        const wordObj = item.words[w];
        const matchResult = matchArabicStem(wordObj.clean, p, matchMode);

        if (matchResult.isMatch) {
          matchedTokensInAyah.push(wordObj.raw);
          if (matchResult.isExact) {
            hasExactInAyah = true;
            data.exactCount++;
          }
          data.allCount++;
          totalMatchesFound++;
        }
      }

      if (matchedTokensInAyah.length > 0) {
        data.surahsSet.add(item.sn);
        data.occurrences.push({
          surahNumber: item.sn,
          surahName: item.s,
          ayahNumber: item.a,
          ayahText: item.t,
          matchedWords: matchedTokensInAyah,
          isExact: hasExactInAyah,
          quranUrl: getQuranTopAyahUrl(item.sn, item.a),
        });
      }
    }
  }

  // Build the permutation items list
  const permutationItems: WordPermutationItem[] = permutationsList.map((p) => {
    const data = permDataMap.get(p)!;
    const isQuranic = data.occurrences.length > 0;

    return {
      permutation: p,
      letters: p.split(''),
      isQuranic,
      isOriginal: p === clean,
      exactCount: data.exactCount,
      allOccurrencesCount: data.allCount,
      occurrences: data.occurrences,
      surahsCount: data.surahsSet.size,
      sampleAyahs: data.occurrences.slice(0, 5),
    };
  });

  // Sort: Original first if Quranic, then Quranic descending by count, then dormant
  permutationItems.sort((a, b) => {
    if (a.isOriginal && a.isQuranic && !b.isOriginal) return -1;
    if (!a.isOriginal && b.isOriginal && b.isQuranic) return 1;
    if (a.isQuranic && !b.isQuranic) return -1;
    if (!a.isQuranic && b.isQuranic) return 1;
    if (b.allOccurrencesCount !== a.allOccurrencesCount) {
      return b.allOccurrencesCount - a.allOccurrencesCount;
    }
    return a.permutation.localeCompare(b.permutation);
  });

  const quranicCount = permutationItems.filter((p) => p.isQuranic).length;
  const dormantCount = permutationItems.length - quranicCount;
  const totalVersesCount = new Set(
    permutationItems.flatMap((p) => p.occurrences.map((o) => `${o.surahNumber}:${o.ayahNumber}`))
  ).size;

  const result: QuranicPermutationsAnalysis = {
    originalWord: clean,
    cleanLetters: letters,
    totalPossiblePermutations: permutationItems.length,
    quranicPermutationsCount: quranicCount,
    dormantPermutationsCount: dormantCount,
    totalVersesCount,
    totalOccurrencesCount: totalMatchesFound,
    sharedGematria,
    permutations: permutationItems,
  };

  permutationsCache.set(cacheKey, result);

  onProgress?.({
    percent: 100,
    phase: 'completed',
    message: `اكتمل الفحص الفوري: تم استخراج ${quranicCount} تقليبة واردة في المصحف (${totalMatchesFound} موضع)!`,
    scannedAyahs: totalAyahs,
    totalAyahs,
    foundMatchesCount: totalMatchesFound,
  });

  return result;
}
