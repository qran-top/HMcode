// High-Performance Abjad (حساب الجُمَّل) Analytical & Synthesis Engine
// Integrates Gematria with the 7-Layer Celestial (سماوي) & Terrestrial (أرضي) Matrix

import { DEFAULT_CIPHER_LAYERS, NOORANI_LETTERS_SET, LayerInfo } from '../cipherData';
import { quranicDictionary, QuranicWordMeta } from './quranicDictionary';
import { arabicDictionary } from './arabicDictionary';

export const ABJAD_VALUES: Record<string, number> = {
  'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1,
  'ب': 2,
  'ج': 3,
  'د': 4,
  'ه': 5, 'هـ': 5, 'ة': 5,
  'و': 6, 'ؤ': 6,
  'ز': 7,
  'ح': 8,
  'ط': 9,
  'ي': 10, 'ى': 10, 'ئ': 10,
  'ك': 20,
  'ل': 30,
  'م': 40,
  'ن': 50,
  'س': 60,
  'ع': 70,
  'ف': 80,
  'ص': 90,
  'ق': 100,
  'ر': 200,
  'ش': 300,
  'ت': 400,
  'ث': 500,
  'خ': 600,
  'ذ': 700,
  'ض': 800,
  'ظ': 900,
  'غ': 1000,
};

export const NOORANI_LETTERS_LIST = [
  'ا', 'ه', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر'
];

export const NOORANI_LETTERS_SORTED_DESC = [...NOORANI_LETTERS_LIST].sort(
  (a, b) => (ABJAD_VALUES[b] || 0) - (ABJAD_VALUES[a] || 0)
);

export const ALL_ARABIC_LETTERS_SORTED_DESC = Object.keys(ABJAD_VALUES)
  .filter((c) => ['ء', 'أ', 'إ', 'آ', 'ئ', 'ؤ', 'هـ', 'ة', 'ى'].indexOf(c) === -1)
  .sort((a, b) => (ABJAD_VALUES[b] || 0) - (ABJAD_VALUES[a] || 0));

export interface GematriaCalculationOptions {
  /** احتساب الألف الخنجرية / الصغيرة (ٰ) بقيمة 1 أو إهمالها */
  daggerAlif: 'count_as_1' | 'ignore_0';
  /** احتساب التاء المربوطة (ة) كهاء 5 أو كتاء 400 */
  taMarbuta: 'ha_5' | 'ta_400';
  /** احتساب الألف المقصورة (ى) كياء 10 أو كألف 1 */
  alifMaqsura: 'ya_10' | 'alif_1';
  /** معاملة صور الهمزة (حسب كراسيها / كلها كألف 1 / إهمال الهمزة السطرية) */
  hamzaMode: 'carrier_value' | 'all_as_alif_1' | 'ignore_isolated_0';
  /** معاملة الشدة والتضعيف (حرف واحد أو مضاعف لفك الإدغام) */
  shaddahMode: 'single_1x' | 'double_2x';
  /** معاملة الـ التعريف (احتساب كامل أو إسقاط الـ للبحث في الأصل) */
  definiteArticleMode: 'include_all' | 'strip_al';
  /** الرسم القرآني العثماني مقابل الرسم الإملائي القياسي */
  orthographyMode: 'uthmani' | 'standard';
}

export const DEFAULT_GEMATRIA_OPTIONS: GematriaCalculationOptions = {
  daggerAlif: 'count_as_1',
  taMarbuta: 'ha_5',
  alifMaqsura: 'ya_10',
  hamzaMode: 'carrier_value',
  shaddahMode: 'single_1x',
  definiteArticleMode: 'include_all',
  orthographyMode: 'uthmani',
};

/**
 * Normalizes Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) digits to standard ASCII digits (0-9)
 */
export function normalizeArabicDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u0660\u06F0]/g, '0')
    .replace(/[\u0661\u06F1]/g, '1')
    .replace(/[\u0662\u06F2]/g, '2')
    .replace(/[\u0663\u06F3]/g, '3')
    .replace(/[\u0664\u06F4]/g, '4')
    .replace(/[\u0665\u06F5]/g, '5')
    .replace(/[\u0666\u06F6]/g, '6')
    .replace(/[\u0667\u06F7]/g, '7')
    .replace(/[\u0668\u06F8]/g, '8')
    .replace(/[\u0669\u06F9]/g, '9');
}

/**
 * Checks if a string is a number (whether typed in Arabic or English digits)
 */
export function parseNumericQuery(input: string): { isNumber: boolean; value: number; normalizedString: string } {
  if (!input) return { isNumber: false, value: 0, normalizedString: '' };
  const trimmed = input.trim();
  const digitConverted = normalizeArabicDigits(trimmed);
  if (/^\d+$/.test(digitConverted)) {
    return {
      isNumber: true,
      value: parseInt(digitConverted, 10),
      normalizedString: digitConverted,
    };
  }
  return {
    isNumber: false,
    value: 0,
    normalizedString: trimmed,
  };
}

export interface LetterGematriaDetail {
  char: string;
  normalizedChar: string;
  value: number;
  isNoorani: boolean;
  celestialLayer: number | null; // السماء (1-7)
  terrestrialLayer: number | null; // الأرض (1-7)
  terrestrialIndexInLayer: number | null; // موقعه في الطبقة (1-4)
}

export interface GematriaAnalysisResult {
  text: string;
  cleanText: string;
  totalValue: number;
  letterCount: number;
  breakdown: LetterGematriaDetail[];
  nooraniValue: number;
  nonNooraniValue: number;
  nooraniPercentage: number;
  isPureNoorani: boolean;
  digitalRoot: number; // الجذر العددي (1-9)
  modulo7: number; // رنين السماوات السبع (1-7)
  layerResonance: Record<number, { celestialSum: number; terrestrialSum: number; count: number }>;
  celestialTotal: number;
  terrestrialTotal: number;
  deltaCelestialTerrestrial: number;
}

/**
 * Calculates gematria sum for a word or text with configurable orthographic options
 */
export function calculateGematriaWithOptions(
  text: string,
  options: Partial<GematriaCalculationOptions> = DEFAULT_GEMATRIA_OPTIONS,
  tableValues: Record<string, number> = ABJAD_VALUES
): number {
  if (!text) return 0;
  const opts: GematriaCalculationOptions = { ...DEFAULT_GEMATRIA_OPTIONS, ...options };
  
  let processedText = text.trim();

  // Handle Definite Article stripping if requested
  if (opts.definiteArticleMode === 'strip_al') {
    processedText = processedText
      .replace(/^(وال|فال|كال|بال|لل|ال)/, '')
      .trim();
  }

  // Count dagger alifs if present in raw text
  let daggerAlifCount = 0;
  if (opts.daggerAlif === 'count_as_1') {
    const rawMatches = processedText.match(/\u0670/g);
    if (rawMatches) {
      daggerAlifCount = rawMatches.length;
    } else if (opts.orthographyMode === 'uthmani') {
      // In Uthmani Quranic script, prominent words have inherent dagger alif:
      const uthmaniImplicitAlifWords = ['الرحمن', 'رحمن', 'هذا', 'هذه', 'هؤلاء', 'ذلك', 'ذلكم', 'إله', 'اله', 'إلهكم', 'إلهنا', 'إبراهيم', 'إسماعيل', 'إسحاق', 'هارون', 'سليمان', 'السموات', 'سموات', 'صلوة', 'زكوة', 'حيوة'];
      const cleanWord = processedText.replace(/[^\u0621-\u064A]/g, '');
      if (uthmaniImplicitAlifWords.includes(cleanWord)) {
        daggerAlifCount = 1;
      }
    }
  }

  // Clean text while preserving Shaddah if double_2x mode
  let cleanChars: { char: string; isShaddah: boolean }[] = [];
  const rawArray = Array.from(processedText);
  for (let i = 0; i < rawArray.length; i++) {
    const ch = rawArray[i];
    if (ch === '\u0651') { // Shaddah
      if (cleanChars.length > 0 && opts.shaddahMode === 'double_2x') {
        cleanChars[cleanChars.length - 1].isShaddah = true;
      }
      continue;
    }
    // Skip other diacritics and tatweel
    if (/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/.test(ch)) {
      continue;
    }
    // Only keep Arabic letters
    if (/[\u0621-\u064A\u0671\s]/.test(ch)) {
      if (ch !== ' ') {
        cleanChars.push({ char: ch, isShaddah: false });
      }
    }
  }

  let sum = daggerAlifCount * (tableValues['ا'] || 1);

  for (const { char, isShaddah } of cleanChars) {
    let charVal = 0;

    // 1. Ta Marbuta
    if (char === 'ة' || char === 'ۃ') {
      charVal = opts.taMarbuta === 'ta_400' ? (tableValues['ت'] || 400) : (tableValues['ه'] || tableValues['ة'] || 5);
    }
    // 2. Alif Maqsura
    else if (char === 'ى') {
      charVal = opts.alifMaqsura === 'alif_1' ? (tableValues['ا'] || 1) : (tableValues['ي'] || tableValues['ى'] || 10);
    }
    // 3. Hamza modes
    else if (char === 'ء') {
      charVal = opts.hamzaMode === 'ignore_isolated_0' ? 0 : (tableValues['ء'] || tableValues['ا'] || 1);
    } else if (['أ', 'إ', 'آ', 'ٱ'].includes(char)) {
      charVal = tableValues['ا'] || tableValues[char] || 1;
    } else if (char === 'ؤ') {
      charVal = opts.hamzaMode === 'all_as_alif_1' ? (tableValues['ا'] || 1) : (tableValues['و'] || tableValues['ؤ'] || 6);
    } else if (char === 'ئ') {
      charVal = opts.hamzaMode === 'all_as_alif_1' ? (tableValues['ا'] || 1) : (tableValues['ي'] || tableValues['ئ'] || 10);
    } else {
      // Standard lookup
      charVal = tableValues[char] || tableValues[normalizeAbjadChar(char)] || 0;
    }

    const multiplier = isShaddah ? 2 : 1;
    sum += charVal * multiplier;
  }

  return sum;
}

/**
 * Calculates raw gematria sum for a word or text (Default configuration)
 */
export function calculateGematriaSum(
  text: string,
  options: Partial<GematriaCalculationOptions> = DEFAULT_GEMATRIA_OPTIONS
): number {
  return calculateGematriaWithOptions(text, options, ABJAD_VALUES);
}

/**
 * Normalizes an Arabic character for Abjad lookup
 */
export function normalizeAbjadChar(char: string): string {
  if (!char) return '';
  if (['أ', 'إ', 'آ', 'ء', 'ٱ', 'ٲ', 'ٳ', 'ٵ'].includes(char)) return 'ا';
  if (char === 'ة' || char === 'هـ' || char === 'ہ' || char === 'ۃ') return 'ه';
  if (['ى', 'ئ', 'ي', 'ىء', 'ئـ', 'يـ', 'ۍ', 'ې'].includes(char)) return 'ي';
  if (['ؤ', 'و', 'ٶ', 'ۇ'].includes(char)) return 'و';
  return char;
}

/**
 * Strips diacritics, tatweel, and non-Arabic characters
 */
export function cleanArabicTextForGematria(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u0640/g, '') // remove tatweel (kashida)
    .replace(/[^\u0621-\u064A\u0671\s]/g, '')
    .trim();
}

/**
 * Finds celestial & terrestrial layers for a letter based on given or default layer structure
 */
export function getLetterCoordinates(
  char: string,
  customLayers: LayerInfo[] = DEFAULT_CIPHER_LAYERS
): { celestialLayer: number | null; terrestrialLayer: number | null; terrestrialIndex: number | null } {
  const norm = normalizeAbjadChar(char);
  let celestialLayer: number | null = null;
  let terrestrialLayer: number | null = null;
  let terrestrialIndex: number | null = null;

  for (const l of customLayers) {
    // Check if it exists in cipherLetters (السماوي)
    if (l.cipherLetters.some((c) => normalizeAbjadChar(c) === norm || c === char)) {
      celestialLayer = l.layer;
    }
    // Check if it exists in arabicLetters (الأرضي)
    const idx = l.arabicLetters.findIndex((c) => normalizeAbjadChar(c) === norm || c === char);
    if (idx !== -1) {
      terrestrialLayer = l.layer;
      terrestrialIndex = idx + 1; // 1-indexed
    }
  }

  return { celestialLayer, terrestrialLayer, terrestrialIndex };
}

/**
 * Main Analysis Function: Text -> 3D Coordinates (Gematria + Celestial + Terrestrial)
 */
export function analyzeTextGematria(
  text: string,
  customLayers: LayerInfo[] = DEFAULT_CIPHER_LAYERS
): GematriaAnalysisResult {
  const clean = cleanArabicTextForGematria(text);
  const chars = clean.replace(/\s+/g, '').split('');

  let totalValue = 0;
  let nooraniValue = 0;
  let nonNooraniValue = 0;
  let celestialTotal = 0;
  let terrestrialTotal = 0;

  const layerResonance: Record<number, { celestialSum: number; terrestrialSum: number; count: number }> = {
    1: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    2: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    3: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    4: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    5: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    6: { celestialSum: 0, terrestrialSum: 0, count: 0 },
    7: { celestialSum: 0, terrestrialSum: 0, count: 0 },
  };

  const breakdown: LetterGematriaDetail[] = chars.map((char) => {
    const normalized = normalizeAbjadChar(char);
    const value = ABJAD_VALUES[char] || ABJAD_VALUES[normalized] || 0;
    const isNoorani = NOORANI_LETTERS_SET.has(normalized) || NOORANI_LETTERS_SET.has(char);
    const coords = getLetterCoordinates(char, customLayers);

    totalValue += value;
    if (isNoorani) {
      nooraniValue += value;
    } else {
      nonNooraniValue += value;
    }

    if (coords.celestialLayer && layerResonance[coords.celestialLayer]) {
      layerResonance[coords.celestialLayer].celestialSum += value;
      layerResonance[coords.celestialLayer].count += 1;
      celestialTotal += value;
    }
    if (coords.terrestrialLayer && layerResonance[coords.terrestrialLayer]) {
      layerResonance[coords.terrestrialLayer].terrestrialSum += value;
      terrestrialTotal += value;
    }

    return {
      char,
      normalizedChar: normalized,
      value,
      isNoorani,
      celestialLayer: coords.celestialLayer,
      terrestrialLayer: coords.terrestrialLayer,
      terrestrialIndexInLayer: coords.terrestrialIndex,
    };
  });

  // Calculate Digital Root (1 - 9)
  let dr = totalValue;
  while (dr > 9) {
    dr = String(dr)
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }

  // Modulo 7 (Layer spectrum 1-7)
  const modulo7 = totalValue > 0 ? (totalValue % 7 === 0 ? 7 : totalValue % 7) : 1;

  const nooraniPercentage = totalValue > 0 ? Math.round((nooraniValue / totalValue) * 100) : 0;
  const isPureNoorani = breakdown.length > 0 && breakdown.every((b) => b.isNoorani);

  return {
    text,
    cleanText: clean,
    totalValue,
    letterCount: chars.length,
    breakdown,
    nooraniValue,
    nonNooraniValue,
    nooraniPercentage,
    isPureNoorani,
    digitalRoot: dr,
    modulo7,
    layerResonance,
    celestialTotal,
    terrestrialTotal,
    deltaCelestialTerrestrial: celestialTotal - terrestrialTotal,
  };
}

/**
 * Calculates simple Abjad value of any word
 */
export function getWordGematriaValue(word: string): number {
  if (!word) return 0;
  const clean = cleanArabicTextForGematria(word);
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === ' ') continue;
    sum += ABJAD_VALUES[ch] || ABJAD_VALUES[normalizeAbjadChar(ch)] || 0;
  }
  return sum;
}

export interface SynthesizedTextResult {
  text: string;
  value: number;
  letterCount: number;
  letters: string[];
  isQuranic: boolean;
  isLexical: boolean;
  quranicMeta?: QuranicWordMeta | null;
  isNooraniOnly: boolean;
}

// Cached Inverted Index for Quranic Words by Gematria Value
interface IndexedQuranWord {
  meta: QuranicWordMeta;
  clean: string;
  value: number;
  isNoorani: boolean;
}

let cachedQuranIndexMap: Map<number, IndexedQuranWord[]> | null = null;
let lastIndexedDictSize = 0;

function getQuranGematriaIndex(): Map<number, IndexedQuranWord[]> {
  const qDict = quranicDictionary.getAllWords();
  if (cachedQuranIndexMap && lastIndexedDictSize === qDict.length) {
    return cachedQuranIndexMap;
  }

  const map = new Map<number, IndexedQuranWord[]>();
  const seen = new Set<string>();

  for (const meta of qDict) {
    const clean = cleanArabicTextForGematria(meta.word);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);

    const val = getWordGematriaValue(clean);
    if (val <= 0) continue;

    const chars = clean.split('');
    const isNoorani = chars.every((c) => NOORANI_LETTERS_SET.has(c) || NOORANI_LETTERS_SET.has(normalizeAbjadChar(c)));

    const entry: IndexedQuranWord = {
      meta,
      clean,
      value: val,
      isNoorani,
    };

    const list = map.get(val);
    if (list) {
      list.push(entry);
    } else {
      map.set(val, [entry]);
    }
  }

  lastIndexedDictSize = qDict.length;
  cachedQuranIndexMap = map;
  return map;
}

/**
 * Generate all exact combinations of 2 distinct Arabic letters (without repetition)
 * that sum exactly to targetValue.
 */
export function generateExactTwoLetterCombinations(
  targetValue: number,
  options: {
    letterValues?: { char: string; val: number }[];
    includePermutations?: boolean;
    maxResults?: number;
  } = {}
): {
  combinations: { letters: [string, string]; values: [number, number] }[];
  permutations: string[];
} {
  const { includePermutations = true, maxResults = 500 } = options;

  const canonicalChars = [
    'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ي',
    'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
    'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
  ];

  const pool: { char: string; val: number }[] = options.letterValues && options.letterValues.length > 0
    ? options.letterValues
    : canonicalChars.map((c) => ({ char: c, val: ABJAD_VALUES[c] || 0 }));

  const sorted = [...pool].sort((a, b) => a.val - b.val);
  const n = sorted.length;

  const combinations: { letters: [string, string]; values: [number, number] }[] = [];
  const permutations: string[] = [];
  const seenPermutations = new Set<string>();

  let left = 0;
  let right = n - 1;

  while (left < right) {
    const itemA = sorted[left];
    const itemB = sorted[right];
    const sum = itemA.val + itemB.val;

    if (sum === targetValue) {
      combinations.push({
        letters: [itemA.char, itemB.char],
        values: [itemA.val, itemB.val],
      });

      if (includePermutations) {
        const p1 = itemA.char + itemB.char;
        const p2 = itemB.char + itemA.char;
        if (!seenPermutations.has(p1)) {
          seenPermutations.add(p1);
          permutations.push(p1);
        }
        if (!seenPermutations.has(p2)) {
          seenPermutations.add(p2);
          permutations.push(p2);
        }
      }

      left++;
      right--;
    } else if (sum < targetValue) {
      left++;
    } else {
      right--;
    }

    if (permutations.length >= maxResults) break;
  }

  return { combinations, permutations };
}

/**
 * Generate all exact combinations of 3 distinct Arabic letters (without repetition)
 * across the entire Arabic alphabet (28 canonical letters) that sum exactly to targetValue.
 * Also includes all 6 permutations for each combination (e.g. أ+ب+ج -> أبج, أجب, بأج, بجأ, جأب, جبا)
 */
export function generateExactThreeLetterCombinations(
  targetValue: number,
  options: {
    letterValues?: { char: string; val: number }[];
    includePermutations?: boolean;
    maxResults?: number;
  } = {}
): {
  combinations: { letters: [string, string, string]; values: [number, number, number] }[];
  permutations: string[];
} {
  const { includePermutations = true, maxResults = 3000 } = options;

  // 28 canonical Arabic letters
  const canonicalChars = [
    'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ي',
    'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
    'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
  ];

  const pool: { char: string; val: number }[] = options.letterValues && options.letterValues.length > 0
    ? options.letterValues
    : canonicalChars.map((c) => ({ char: c, val: ABJAD_VALUES[c] || 0 }));

  // Sort ascending by value for efficient two-pointer search
  const sorted = [...pool].sort((a, b) => a.val - b.val);
  const n = sorted.length;

  const combinations: { letters: [string, string, string]; values: [number, number, number] }[] = [];
  const permutations: string[] = [];
  const seenPermutations = new Set<string>();

  // 3-Sum algorithm: O(N^2) where N=28, which is only ~378 iterations! Instant and 100% comprehensive.
  for (let i = 0; i < n - 2; i++) {
    const itemA = sorted[i];
    if (itemA.val >= targetValue) break;

    let left = i + 1;
    let right = n - 1;

    while (left < right) {
      const itemB = sorted[left];
      const itemC = sorted[right];
      const sum = itemA.val + itemB.val + itemC.val;

      if (sum === targetValue) {
        // Distinct letters: i < left < right guarantees itemA, itemB, itemC are 3 different letters!
        combinations.push({
          letters: [itemA.char, itemB.char, itemC.char],
          values: [itemA.val, itemB.val, itemC.val],
        });

        if (includePermutations) {
          const l1 = itemA.char;
          const l2 = itemB.char;
          const l3 = itemC.char;

          // All 6 distinct permutations of 3 different letters:
          const perms = [
            l1 + l2 + l3,
            l1 + l3 + l2,
            l2 + l1 + l3,
            l2 + l3 + l1,
            l3 + l1 + l2,
            l3 + l2 + l1,
          ];

          for (const p of perms) {
            if (!seenPermutations.has(p)) {
              seenPermutations.add(p);
              permutations.push(p);
              if (permutations.length >= maxResults) break;
            }
          }
        }

        left++;
        right--;
      } else if (sum < targetValue) {
        left++;
      } else {
        right--;
      }

      if (permutations.length >= maxResults) break;
    }

    if (permutations.length >= maxResults) break;
  }

  return { combinations, permutations };
}

/**
 * Generate all exact combinations of 4 distinct Arabic letters (without repetition)
 * that sum exactly to targetValue.
 */
export function generateExactFourLetterCombinations(
  targetValue: number,
  options: {
    letterValues?: { char: string; val: number }[];
    includePermutations?: boolean;
    maxResults?: number;
  } = {}
): {
  combinations: { letters: [string, string, string, string]; values: [number, number, number, number] }[];
  permutations: string[];
} {
  const { includePermutations = true, maxResults = 1500 } = options;

  const canonicalChars = [
    'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ي',
    'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
    'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
  ];

  const pool: { char: string; val: number }[] = options.letterValues && options.letterValues.length > 0
    ? options.letterValues
    : canonicalChars.map((c) => ({ char: c, val: ABJAD_VALUES[c] || 0 }));

  const sorted = [...pool].sort((a, b) => a.val - b.val);
  const n = sorted.length;

  const combinations: { letters: [string, string, string, string]; values: [number, number, number, number] }[] = [];
  const permutations: string[] = [];
  const seenPermutations = new Set<string>();

  // 4-Sum algorithm: O(N^3) where N=28 is at most ~3,276 operations! Extremely fast.
  for (let i = 0; i < n - 3; i++) {
    const itemA = sorted[i];
    if (itemA.val >= targetValue) break;

    for (let j = i + 1; j < n - 2; j++) {
      const itemB = sorted[j];
      if (itemA.val + itemB.val >= targetValue) break;

      let left = j + 1;
      let right = n - 1;

      while (left < right) {
        const itemC = sorted[left];
        const itemD = sorted[right];
        const sum = itemA.val + itemB.val + itemC.val + itemD.val;

        if (sum === targetValue) {
          combinations.push({
            letters: [itemA.char, itemB.char, itemC.char, itemD.char],
            values: [itemA.val, itemB.val, itemC.val, itemD.val],
          });

          if (includePermutations) {
            const l1 = itemA.char;
            const l2 = itemB.char;
            const l3 = itemC.char;
            const l4 = itemD.char;

            // Representative phonetic orderings:
            const samplePerms = [
              l1 + l2 + l3 + l4,
              l4 + l3 + l2 + l1,
              l1 + l3 + l2 + l4,
              l2 + l1 + l4 + l3,
              l3 + l1 + l2 + l4,
              l2 + l4 + l1 + l3,
            ];

            for (const p of samplePerms) {
              if (!seenPermutations.has(p)) {
                seenPermutations.add(p);
                permutations.push(p);
                if (permutations.length >= maxResults) break;
              }
            }
          }

          left++;
          right--;
        } else if (sum < targetValue) {
          left++;
        } else {
          right--;
        }

        if (permutations.length >= maxResults) break;
      }
      if (permutations.length >= maxResults) break;
    }
    if (permutations.length >= maxResults) break;
  }

  return { combinations, permutations };
}

/**
 * Generate all exact combinations of 5 distinct Arabic letters (without repetition)
 * that sum exactly to targetValue.
 */
export function generateExactFiveLetterCombinations(
  targetValue: number,
  options: {
    letterValues?: { char: string; val: number }[];
    includePermutations?: boolean;
    maxResults?: number;
  } = {}
): {
  combinations: { letters: [string, string, string, string, string]; values: [number, number, number, number, number] }[];
  permutations: string[];
} {
  const { includePermutations = true, maxResults = 2500 } = options;

  const canonicalChars = [
    'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ي',
    'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
    'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
  ];

  const pool: { char: string; val: number }[] = options.letterValues && options.letterValues.length > 0
    ? options.letterValues
    : canonicalChars.map((c) => ({ char: c, val: ABJAD_VALUES[c] || 0 }));

  const sorted = [...pool].sort((a, b) => a.val - b.val);
  const n = sorted.length;

  const combinations: { letters: [string, string, string, string, string]; values: [number, number, number, number, number] }[] = [];
  const permutations: string[] = [];
  const seenPermutations = new Set<string>();

  for (let i = 0; i < n - 4; i++) {
    const itemA = sorted[i];
    if (itemA.val >= targetValue) break;

    for (let j = i + 1; j < n - 3; j++) {
      const itemB = sorted[j];
      if (itemA.val + itemB.val >= targetValue) break;

      for (let k = j + 1; k < n - 2; k++) {
        const itemC = sorted[k];
        if (itemA.val + itemB.val + itemC.val >= targetValue) break;

        let left = k + 1;
        let right = n - 1;

        while (left < right) {
          const itemD = sorted[left];
          const itemE = sorted[right];
          const sum = itemA.val + itemB.val + itemC.val + itemD.val + itemE.val;

          if (sum === targetValue) {
            combinations.push({
              letters: [itemA.char, itemB.char, itemC.char, itemD.char, itemE.char],
              values: [itemA.val, itemB.val, itemC.val, itemD.val, itemE.val],
            });

            if (includePermutations) {
              const l1 = itemA.char;
              const l2 = itemB.char;
              const l3 = itemC.char;
              const l4 = itemD.char;
              const l5 = itemE.char;

              const samplePerms = [
                l1 + l2 + l3 + l4 + l5,
                l5 + l4 + l3 + l2 + l1,
                l1 + l3 + l5 + l2 + l4,
                l2 + l4 + l1 + l3 + l5,
                l3 + l1 + l4 + l2 + l5,
                l1 + l4 + l2 + l5 + l3,
              ];

              for (const p of samplePerms) {
                if (!seenPermutations.has(p)) {
                  seenPermutations.add(p);
                  permutations.push(p);
                  if (permutations.length >= maxResults) break;
                }
              }
            }

            left++;
            right--;
          } else if (sum < targetValue) {
            left++;
          } else {
            right--;
          }

          if (permutations.length >= maxResults) break;
        }
        if (permutations.length >= maxResults) break;
      }
      if (permutations.length >= maxResults) break;
    }
    if (permutations.length >= maxResults) break;
  }

  return { combinations, permutations };
}

/**
 * Dynamic Programming & Backtracking with Bounding & Pruning
 * Finds letters combinations that sum to targetValue exactly.
 * Sorts solutions from fewest letters to most letters.
 */
export function synthesizeCombinationsDP(
  targetValue: number,
  options: {
    onlyNoorani?: boolean;
    maxResults?: number;
    maxLetterCount?: number;
  } = {}
): string[][] {
  const { onlyNoorani = true, maxResults = 30, maxLetterCount = 8 } = options;

  if (targetValue <= 0 || targetValue > 4000) return [];

  const letterPool = onlyNoorani ? NOORANI_LETTERS_SORTED_DESC : ALL_ARABIC_LETTERS_SORTED_DESC;
  const letterValues = letterPool.map((c) => ({ char: c, val: ABJAD_VALUES[c] || 1 }));

  const results: string[][] = [];
  let iterations = 0;
  const maxIterations = 3000; // Hard cutoff to guarantee sub-millisecond execution

  function backtrack(remaining: number, startIndex: number, currentCombo: string[]) {
    iterations++;
    if (iterations > maxIterations) return;
    if (results.length >= maxResults * 2) return;
    if (remaining === 0) {
      results.push([...currentCombo]);
      return;
    }
    if (currentCombo.length >= maxLetterCount) return;

    for (let i = startIndex; i < letterValues.length; i++) {
      const { char, val } = letterValues[i];
      if (val > remaining) continue; // Pruning

      currentCombo.push(char);
      backtrack(remaining - val, i, currentCombo);
      currentCombo.pop();
    }
  }

  backtrack(targetValue, 0, []);

  // Sort from shortest letter count to longest
  results.sort((a, b) => a.length - b.length);
  return results.slice(0, maxResults);
}

/**
 * Searches the Holy Quran Lexicon for words having the exact Gematria value (O(1) fast indexed lookup)
 */
export function findQuranicWordsByGematria(
  targetValue: number,
  options: {
    tolerance?: number; // 0 for exact, or ± delta
    filterType?: 'all' | 'noorani' | 'non_noorani';
    onlyNoorani?: boolean;
    maxResults?: number;
  } = {}
): SynthesizedTextResult[] {
  const { tolerance = 0, filterType = 'all', onlyNoorani = false, maxResults = 100 } = options;
  if (targetValue <= 0) return [];

  const effectiveFilter = onlyNoorani ? 'noorani' : filterType;
  const index = getQuranGematriaIndex();
  const minVal = Math.max(1, targetValue - tolerance);
  const maxVal = targetValue + tolerance;

  const matches: SynthesizedTextResult[] = [];
  const seenWords = new Set<string>();

  for (let v = minVal; v <= maxVal; v++) {
    const list = index.get(v);
    if (!list) continue;

    for (const item of list) {
      if (effectiveFilter === 'noorani' && !item.isNoorani) continue;
      if (effectiveFilter === 'non_noorani' && item.isNoorani) continue;
      if (seenWords.has(item.clean)) continue;
      seenWords.add(item.clean);

      matches.push({
        text: item.meta.originalQuranicWord || item.meta.word,
        value: item.value,
        letterCount: item.clean.length,
        letters: item.clean.split(''),
        isQuranic: true,
        isLexical: true,
        quranicMeta: item.meta,
        isNooraniOnly: item.isNoorani,
      });

      if (matches.length >= maxResults * 2) break;
    }
    if (matches.length >= maxResults * 2) break;
  }

  // Sort by closest value to target, then shortest length
  matches.sort((a, b) => {
    const diffA = Math.abs(a.value - targetValue);
    const diffB = Math.abs(b.value - targetValue);
    if (diffA !== diffB) return diffA - diffB;
    return a.letterCount - b.letterCount;
  });

  return matches.slice(0, maxResults);
}

/**
 * Fast Anagram & DP Permutation Search
 * Checks if any permutations of letter combinations form valid Quranic/Arabic words
 */
export function synthesizeValidWordsFromNumber(
  targetValue: number,
  options: {
    onlyNoorani?: boolean;
    maxResults?: number;
  } = {}
): SynthesizedTextResult[] {
  const { onlyNoorani = false, maxResults = 30 } = options;

  // 1. First get real Quranic words matching the target value
  const quranicMatches = findQuranicWordsByGematria(targetValue, {
    tolerance: 0,
    onlyNoorani,
    maxResults,
  });

  // 2. Generate raw DP combinations (Multisets of letters)
  const dpCombos = synthesizeCombinationsDP(targetValue, {
    onlyNoorani,
    maxResults: 15,
  });

  const finalResults: SynthesizedTextResult[] = [...quranicMatches];
  const seenTexts = new Set<string>(quranicMatches.map((m) => cleanArabicTextForGematria(m.text)));

  // Add DP combos as symbolic synthesis
  for (const combo of dpCombos) {
    const rawWord = combo.join('');
    if (seenTexts.has(rawWord)) continue;
    seenTexts.add(rawWord);

    const isNoorani = combo.every((c) => NOORANI_LETTERS_SET.has(normalizeAbjadChar(c)));
    const isLex = arabicDictionary.isWord(rawWord);
    const qMeta = quranicDictionary.getWordDetails(rawWord);

    finalResults.push({
      text: rawWord,
      value: targetValue,
      letterCount: combo.length,
      letters: combo,
      isQuranic: !!qMeta,
      isLexical: isLex,
      quranicMeta: qMeta,
      isNooraniOnly: isNoorani,
    });
  }

  // Sort: Quranic first, then shortest length
  finalResults.sort((a, b) => {
    if (a.isQuranic && !b.isQuranic) return -1;
    if (!a.isQuranic && b.isQuranic) return 1;
    return a.letterCount - b.letterCount;
  });

  return finalResults.slice(0, maxResults);
}
