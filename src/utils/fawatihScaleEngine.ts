import { QURANIC_29_SURAH_FAWATIH } from './gematriaEngine';
import { loadCompleteQuranCorpus, QuranAyahItem } from './inverseQuranicMatcher';
import { ABJAD_VALUES } from './gematriaEngine';

export type FawatihMatchMode = 'exact' | 'morphological';
export type FawatihCalculationMode = 'total_frequency' | 'weighted_balance' | 'surah_coverage';

export interface FawatihSurahDistribution {
  surahNumber: number;
  surahName: number | string;
  orderInFawatih: number;
  formula: string;
  formulaValue: number;
  occurrences: number;
  matchingAyahs: {
    ayahNumber: number;
    text: string;
  }[];
}

export interface FawatihAnalysisResult {
  query: string;
  cleanQuery: string;
  matchMode: FawatihMatchMode;
  calculationMode: FawatihCalculationMode;
  
  // The 3 metric values
  totalFrequency: number;       // المجموع التكراري الإجمالي عبر السور الـ 29
  weightedBalance: number;      // ميزان الفواتح المرجّح (التكرار × قيمة الفاتحة)
  surahCoverage: number;        // رصيد السور الفاتحية (عدد السور التي ظهرت فيها من 29)
  
  // Value corresponding to active calculationMode
  primaryValue: number;
  
  // Total across all 114 surahs in the Quran
  totalQuranOccurrences: number;
  
  // Breakdown for each of the 29 surahs
  distribution: FawatihSurahDistribution[];
  
  // Highest frequency surahs
  maxSurah: FawatihSurahDistribution | null;
  zeroOccurrenceSurahsCount: number;
}

export interface PeerQuranicWordMatch {
  word: string;
  cleanWord: string;
  calculatedValue: number;
  totalFrequency: number;
  weightedBalance: number;
  surahCoverage: number;
  totalQuranOccurrences: number;
  abjadValue: number;
  surahsPresentCount: number;
}

// Clean Arabic text for search matching
export function cleanForSearch(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

// Extract base stem for morphological matching
export function extractArabicStem(word: string): string {
  let clean = cleanForSearch(word);
  if (!clean) return '';

  // Strip prefixes
  clean = clean.replace(/^(وال|فال|كال|بال|لل|ال)/, '');
  clean = clean.replace(/^(و|ف|ب|ك|ل|س)/, '');
  clean = clean.replace(/^(ال)/, '');

  // Strip suffixes
  clean = clean.replace(/(هما|كما|تم|تن|نا|هم|هن|كم|كن|ها|وا|ين|ون|ات|ان|ية|يه|يا|ي|ه|ك|ة)$/, '');
  clean = clean.replace(/(ت|ي|ن|ا)$/, '');

  return clean.trim();
}

// Check if a word matches query according to mode
export function matchesQuery(wordInText: string, rawQuery: string, mode: FawatihMatchMode): boolean {
  const cleanWord = cleanForSearch(wordInText);
  const cleanQ = cleanForSearch(rawQuery);
  if (!cleanWord || !cleanQ) return false;

  if (mode === 'exact') {
    // Exact word or direct stripped definite article
    if (cleanWord === cleanQ) return true;
    if (cleanWord.replace(/^ال/, '') === cleanQ) return true;
    if (cleanWord === cleanQ.replace(/^ال/, '')) return true;
    return false;
  }

  // Morphological matching
  if (cleanWord === cleanQ) return true;
  if (cleanWord.includes(cleanQ)) return true;

  const stemWord = extractArabicStem(cleanWord);
  const stemQ = extractArabicStem(cleanQ);

  if (stemWord && stemQ && (stemWord === stemQ || stemWord.includes(stemQ) || stemQ.includes(stemWord))) {
    return true;
  }

  return false;
}

// Calculate standard gematria for fawatih formulas
export function getFormulaGematria(formula: string): number {
  if (!formula) return 0;
  const clean = formula.replace(/\s+/g, '');
  let sum = 0;
  for (const ch of clean) {
    sum += ABJAD_VALUES[ch] || 0;
  }
  return sum;
}

// Count word occurrences in an Ayah text
export function countInAyah(ayahText: string, query: string, mode: FawatihMatchMode): number {
  if (!ayahText || !query) return 0;
  const tokens = ayahText.split(/\s+/).filter(Boolean);
  let count = 0;
  for (const token of tokens) {
    if (matchesQuery(token, query, mode)) {
      count++;
    }
  }
  return count;
}

/**
 * Analyzes the word distribution across the 29 Fawatih Surahs
 */
export async function analyzeWordFawatihDistribution(
  query: string,
  matchMode: FawatihMatchMode = 'exact',
  calculationMode: FawatihCalculationMode = 'total_frequency'
): Promise<FawatihAnalysisResult> {
  const trimmed = query.trim();
  const cleanQ = cleanForSearch(trimmed);

  const ayahs = await loadCompleteQuranCorpus();
  const fawatihSurahMap = new Map<number, typeof QURANIC_29_SURAH_FAWATIH[0]>();
  for (const s of QURANIC_29_SURAH_FAWATIH) {
    fawatihSurahMap.set(s.surahNumber, s);
  }

  // Group ayahs by surah
  const surahAyahsMap = new Map<number, QuranAyahItem[]>();
  let totalQuranCount = 0;

  for (const ayah of ayahs) {
    const sNum = ayah.sn;
    if (!surahAyahsMap.has(sNum)) {
      surahAyahsMap.set(sNum, []);
    }
    surahAyahsMap.get(sNum)!.push(ayah);

    if (trimmed) {
      const matchCount = countInAyah(ayah.t, trimmed, matchMode);
      totalQuranCount += matchCount;
    }
  }

  const distribution: FawatihSurahDistribution[] = [];
  let totalFreq = 0;
  let weightedBal = 0;
  let surahsWithOccurrence = 0;
  let maxSurah: FawatihSurahDistribution | null = null;
  let zeroCount = 0;

  for (const fawatihSurah of QURANIC_29_SURAH_FAWATIH) {
    const sNum = fawatihSurah.surahNumber;
    const sAyahs = surahAyahsMap.get(sNum) || [];
    const formulaVal = getFormulaGematria(fawatihSurah.formula);

    let occ = 0;
    const matchingAyahs: { ayahNumber: number; text: string }[] = [];

    if (trimmed) {
      for (const a of sAyahs) {
        const c = countInAyah(a.t, trimmed, matchMode);
        if (c > 0) {
          occ += c;
          matchingAyahs.push({
            ayahNumber: a.a,
            text: a.t,
          });
        }
      }
    }

    if (occ > 0) {
      surahsWithOccurrence++;
    } else {
      zeroCount++;
    }

    totalFreq += occ;
    weightedBal += occ * formulaVal;

    const item: FawatihSurahDistribution = {
      surahNumber: sNum,
      surahName: fawatihSurah.surahName,
      orderInFawatih: fawatihSurah.orderInFawatih,
      formula: fawatihSurah.formula,
      formulaValue: formulaVal,
      occurrences: occ,
      matchingAyahs,
    };

    distribution.push(item);

    if (!maxSurah || occ > maxSurah.occurrences) {
      maxSurah = item;
    }
  }

  let primaryVal = totalFreq;
  if (calculationMode === 'weighted_balance') {
    primaryVal = weightedBal;
  } else if (calculationMode === 'surah_coverage') {
    primaryVal = surahsWithOccurrence;
  }

  return {
    query: trimmed,
    cleanQuery: cleanQ,
    matchMode,
    calculationMode,
    totalFrequency: totalFreq,
    weightedBalance: weightedBal,
    surahCoverage: surahsWithOccurrence,
    primaryValue: primaryVal,
    totalQuranOccurrences: totalQuranCount,
    distribution,
    maxSurah,
    zeroOccurrenceSurahsCount: zeroCount,
  };
}

// Cache of distinct Quran vocabulary words with their frequencies
let cachedVocabularyProfiles: PeerQuranicWordMatch[] | null = null;
let isBuildingVocab = false;

/**
 * Builds and indexes the Quran vocabulary with their 29 Fawatih distribution metrics
 */
export async function getQuranVocabularyFawatihProfiles(): Promise<PeerQuranicWordMatch[]> {
  if (cachedVocabularyProfiles && cachedVocabularyProfiles.length > 0) {
    return cachedVocabularyProfiles;
  }

  if (isBuildingVocab) {
    while (isBuildingVocab) {
      await new Promise((r) => setTimeout(r, 60));
    }
    if (cachedVocabularyProfiles) return cachedVocabularyProfiles;
  }

  isBuildingVocab = true;
  try {
    const ayahs = await loadCompleteQuranCorpus();
    const fawatihSurahNumbers = new Set(QURANIC_29_SURAH_FAWATIH.map((s) => s.surahNumber));
    const formulaValMap = new Map<number, number>();
    for (const s of QURANIC_29_SURAH_FAWATIH) {
      formulaValMap.set(s.surahNumber, getFormulaGematria(s.formula));
    }

    // Map: cleanWord -> { word, fawatihCounts: Map<surahNumber, count>, totalQuran: number }
    const vocabMap = new Map<string, {
      originalWord: string;
      fawatihSurahCounts: Map<number, number>;
      totalQuran: number;
    }>();

    for (const a of ayahs) {
      const tokens = a.t.split(/\s+/).filter(Boolean);
      const isFawatihSurah = fawatihSurahNumbers.has(a.sn);

      for (const token of tokens) {
        const clean = cleanForSearch(token);
        if (!clean || clean.length < 2) continue;

        let entry = vocabMap.get(clean);
        if (!entry) {
          entry = {
            originalWord: token.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, ''),
            fawatihSurahCounts: new Map(),
            totalQuran: 0,
          };
          vocabMap.set(clean, entry);
        }

        entry.totalQuran++;

        if (isFawatihSurah) {
          entry.fawatihSurahCounts.set(a.sn, (entry.fawatihSurahCounts.get(a.sn) || 0) + 1);
        }
      }
    }

    const profiles: PeerQuranicWordMatch[] = [];

    for (const [cleanWord, data] of vocabMap.entries()) {
      let totalFreq = 0;
      let weightedBal = 0;
      let presentCount = 0;

      for (const [sNum, count] of data.fawatihSurahCounts.entries()) {
        totalFreq += count;
        const fVal = formulaValMap.get(sNum) || 0;
        weightedBal += count * fVal;
        presentCount++;
      }

      if (totalFreq === 0) continue; // Only include words that appeared in at least one fawatih surah

      let abjad = 0;
      for (const ch of cleanWord) {
        abjad += ABJAD_VALUES[ch] || 0;
      }

      profiles.push({
        word: data.originalWord,
        cleanWord,
        calculatedValue: totalFreq, // default
        totalFrequency: totalFreq,
        weightedBalance: weightedBal,
        surahCoverage: presentCount,
        totalQuranOccurrences: data.totalQuran,
        abjadValue: abjad,
        surahsPresentCount: presentCount,
      });
    }

    cachedVocabularyProfiles = profiles;
    return profiles;
  } finally {
    isBuildingVocab = false;
  }
}

/**
 * Finds all peer Quranic words matching the exact target value according to the chosen calculation mode
 */
export async function findPeerQuranicWordsByValue(
  targetValue: number,
  calculationMode: FawatihCalculationMode,
  excludeWord?: string
): Promise<PeerQuranicWordMatch[]> {
  if (targetValue <= 0) return [];
  const profiles = await getQuranVocabularyFawatihProfiles();
  const cleanExclude = excludeWord ? cleanForSearch(excludeWord) : '';

  const matched: PeerQuranicWordMatch[] = [];

  for (const p of profiles) {
    if (cleanExclude && p.cleanWord === cleanExclude) continue;

    let val = p.totalFrequency;
    if (calculationMode === 'weighted_balance') {
      val = p.weightedBalance;
    } else if (calculationMode === 'surah_coverage') {
      val = p.surahCoverage;
    }

    if (val === targetValue) {
      matched.push({
        ...p,
        calculatedValue: val,
      });
    }
  }

  // Sort by highest total Quran occurrences, then alphabetical
  matched.sort((a, b) => b.totalQuranOccurrences - a.totalQuranOccurrences || a.word.localeCompare(b.word));

  return matched;
}
