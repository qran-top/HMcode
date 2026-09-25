// High-Performance Abjad (حساب الجُمَّل) Analytical & Synthesis Engine
// Integrates Gematria with the 7-Layer Celestial (سماوي) & Terrestrial (أرضي) Matrix

import { DEFAULT_CIPHER_LAYERS, NOORANI_LETTERS_SET, LayerInfo } from '../cipherData';
import { quranicDictionary, QuranicWordMeta } from './quranicDictionary';
import { arabicDictionary } from './arabicDictionary';
import { checkArabicPhonotactics } from './arabicPhonotactics';
import { MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';

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
  /** الواو غير المقروءة في أولو، أولئك، أولات (رسم = 6 / لفظ مهمل = 0) */
  silentWawMode?: 'count_as_6' | 'ignore_0';
  /** واو رسم المصحف في الصلوة والزكوة والحيوة والربوا (كواو 6 / كألف 1) */
  uthmaniWawMode?: 'as_waw_6' | 'as_alif_1';
  /** ألف التفريق الزائدة بعد واو الجماعة مثل قالوا، آمنوا (رسم = 1 / لفظ مهمل = 0) */
  silentAlifMode?: 'count_as_1' | 'ignore_0';
}

export const DEFAULT_GEMATRIA_OPTIONS: GematriaCalculationOptions = {
  daggerAlif: 'count_as_1',
  taMarbuta: 'ha_5',
  alifMaqsura: 'ya_10',
  hamzaMode: 'carrier_value',
  shaddahMode: 'single_1x',
  definiteArticleMode: 'include_all',
  orthographyMode: 'uthmani',
  silentWawMode: 'count_as_6',
  uthmaniWawMode: 'as_waw_6',
  silentAlifMode: 'count_as_1',
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
      // In Uthmani Quranic script, words with implicit dagger alif (الرسم العثماني يثبت الألف خنجرية):
      const cleanWord = processedText.replace(/[^\u0621-\u064A]/g, '');
      const uthmaniImplicitAlifSingleWords = [
        'الرحمن', 'رحمن', 'هذا', 'هذه', 'هؤلاء', 'ذلك', 'ذلكم', 'ذانك',
        'إله', 'إلهكم', 'إلهنا', 'إلهين', 'إلهان', 'إلهي', 'آلهة', 'آلهتنا', 'آلهتهم',
        'أولئك', 'إبراهيم', 'إسماعيل', 'إسحاق', 'هارون', 'سليمان', 'داوود',
        'يحيى', 'عيسى', 'موسى', 'طغيانهم', 'سبحان', 'لقمان', 'عمران',
        'رضوان', 'سلطان', 'برهان', 'ميثاق'
      ];
      if (uthmaniImplicitAlifSingleWords.includes(cleanWord)) {
        daggerAlifCount = 1;
      } else if (cleanWord === 'السموات' || cleanWord === 'سموات' || cleanWord === 'السموت') {
        daggerAlifCount = 2; // سَمَٰوَٰت تحوي ألفين خنجريتين
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

  // 4. Handle Silent Waw (الواو غير المقروءة في أولو، أولئك، أولات)
  if (opts.silentWawMode === 'ignore_0') {
    const cleanWord = processedText.replace(/[^\u0621-\u064A]/g, '');
    if (/^(أولو|أولي|أولئك|أولات|عمرو|أولاء)$/.test(cleanWord)) {
      sum -= (tableValues['و'] || 6);
    }
  }

  // 5. Handle Uthmani Waw (واو الصلوة والزكوة والحيوة والربوا كألف)
  if (opts.uthmaniWawMode === 'as_alif_1') {
    const cleanWord = processedText.replace(/[^\u0621-\u064A]/g, '');
    if (/^(الصلوة|صلوة|الزكوة|زكوة|الحيوة|حيوة|الربوا|ربوا|مشكوة|النجوة|الغدوة)$/.test(cleanWord)) {
      // Waw is counted as 1 (Alif) instead of 6 (Waw), so delta = -5
      sum -= ((tableValues['و'] || 6) - (tableValues['ا'] || 1));
    }
  }

  // 6. Handle Silent Alif (ألف التفريق بعد واو الجماعة مثل قالوا، آمنوا)
  if (opts.silentAlifMode === 'ignore_0') {
    const cleanWord = processedText.replace(/[^\u0621-\u064A]/g, '');
    if (cleanWord.length >= 4 && cleanWord.endsWith('وا') && !/^(عفوا|دعوا|شكوا)$/.test(cleanWord)) {
      sum -= (tableValues['ا'] || 1);
    }
  }

  return Math.max(0, sum);
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
              const phCheck = checkArabicPhonotactics(p);
              if (phCheck.isValid) {
                permutations.push(p);
              }
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
 * Authentic 14 Quranic Opening Formulas (الفواتح النورانية الـ 14 في 29 سورة)
 */
export const AUTHENTIC_QURANIC_FAWATIH = [
  { formula: 'الم', letters: ['ا', 'ل', 'م'], surahs: ['البقرة', 'آل عمران', 'العنكبوت', 'الروم', 'لقمان', 'السجدة'], description: 'فاتحة 6 سور في القرآن الكريم' },
  { formula: 'المص', letters: ['ا', 'ل', 'م', 'ص'], surahs: ['الأعراف'], description: 'فاتحة سورة الأعراف' },
  { formula: 'الر', letters: ['ا', 'ل', 'ر'], surahs: ['يونس', 'هود', 'يوسف', 'إبراهيم', 'الحجر'], description: 'فاتحة 5 سور في القرآن الكريم' },
  { formula: 'المر', letters: ['ا', 'ل', 'م', 'ر'], surahs: ['الرعد'], description: 'فاتحة سورة الرعد' },
  { formula: 'كهيعص', letters: ['ك', 'ه', 'ي', 'ع', 'ص'], surahs: ['مريم'], description: 'فاتحة سورة مريم (الخماسية النورانية)' },
  { formula: 'طه', letters: ['ط', 'ه'], surahs: ['طه'], description: 'فاتحة سورة طه' },
  { formula: 'طسم', letters: ['ط', 'س', 'م'], surahs: ['الشعراء', 'القصص'], description: 'فاتحة سورتي الشعراء والقصص' },
  { formula: 'طس', letters: ['ط', 'س'], surahs: ['النمل'], description: 'فاتحة سورة النمل' },
  { formula: 'يس', letters: ['ي', 'س'], surahs: ['يس'], description: 'فاتحة سورة يس (قلب القرآن)' },
  { formula: 'ص', letters: ['ص'], surahs: ['ص'], description: 'فاتحة سورة ص' },
  { formula: 'حم', letters: ['ح', 'م'], surahs: ['غافر', 'فصلت', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف'], description: 'الحواميم السبعة' },
  { formula: 'عسق', letters: ['ع', 'س', 'ق'], surahs: ['الشورى (الآية 2)'], description: 'فواتح سورة الشورى' },
  { formula: 'حم عسق', letters: ['ح', 'م', 'ع', 'س', 'ق'], surahs: ['الشورى'], description: 'فاتحة سورة الشورى المزدوجة' },
  { formula: 'ق', letters: ['ق'], surahs: ['ق'], description: 'فاتحة سورة ق والقرآن المجيد' },
  { formula: 'ن', letters: ['ن'], surahs: ['القلم'], description: 'فاتحة سورة القلم (ن والقلم)' }
];

/**
 * Authentic Quranic Fawatih Multi-letter Words and Single Letters
 * (فواتح السور القرآنية مرتبة حسب السور وعدد الأحرف)
 */
export const QURANIC_FAWATIH_WORD_BLOCKS = [
  { word: 'كهيعص', letters: ['ك', 'ه', 'ي', 'ع', 'ص'], weight: 50000, surahOrder: 19, surahs: ['مريم'] },
  { word: 'حم عسق', letters: ['ح', 'م', 'ع', 'س', 'ق'], weight: 45000, surahOrder: 42, surahs: ['الشورى'] },
  { word: 'المص', letters: ['ا', 'ل', 'م', 'ص'], weight: 35000, surahOrder: 7, surahs: ['الأعراف'] },
  { word: 'المر', letters: ['ا', 'ل', 'م', 'ر'], weight: 35000, surahOrder: 13, surahs: ['الرعد'] },
  { word: 'طسم', letters: ['ط', 'س', 'م'], weight: 25000, surahOrder: 26, surahs: ['الشعراء', 'القصص'] },
  { word: 'عسق', letters: ['ع', 'س', 'ق'], weight: 25000, surahOrder: 42, surahs: ['الشورى'] },
  { word: 'الم', letters: ['ا', 'ل', 'م'], weight: 20000, surahOrder: 2, surahs: ['البقرة', 'آل عمران', 'العنكبوت', 'الروم', 'لقمان', 'السجدة'] },
  { word: 'الر', letters: ['ا', 'ل', 'ر'], weight: 20000, surahOrder: 10, surahs: ['يونس', 'هود', 'يوسف', 'إبراهيم', 'الحجر'] },
  { word: 'طه', letters: ['ط', 'ه'], weight: 15000, surahOrder: 20, surahs: ['طه'] },
  { word: 'طس', letters: ['ط', 'س'], weight: 15000, surahOrder: 27, surahs: ['النمل'] },
  { word: 'يس', letters: ['ي', 'س'], weight: 15000, surahOrder: 36, surahs: ['يس'] },
  { word: 'حم', letters: ['ح', 'م'], weight: 15000, surahOrder: 40, surahs: ['غافر', 'فصلت', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف'] },
  { word: 'ص', letters: ['ص'], weight: 5000, surahOrder: 38, surahs: ['ص'] },
  { word: 'ق', letters: ['ق'], weight: 5000, surahOrder: 50, surahs: ['ق'] },
  { word: 'ن', letters: ['ن'], weight: 5000, surahOrder: 68, surahs: ['القلم'] },
];

/**
 * Sequential canonical order of appearance of the 14 Noorani letters across the Quran
 * (ترتيب ورود الأحرف النورانية في سور القرآن من الفاتحة إلى الناس)
 */
export const NOORANI_QURANIC_ORDER = ['ا', 'ل', 'م', 'ص', 'ر', 'ك', 'ه', 'ي', 'ع', 'ط', 'س', 'ح', 'ق', 'ن'];

export const NOORANI_ORDER_MAP: Record<string, number> = {
  'ا': 1,
  'ل': 2,
  'م': 3,
  'ص': 4,
  'ر': 5,
  'ك': 6,
  'ه': 7,
  'ي': 8,
  'ع': 9,
  'ط': 10,
  'س': 11,
  'ح': 12,
  'ق': 13,
  'ن': 14,
};

export interface NooraniFormulaMatch {
  formula: string;
  letters: string[];
  values: number[];
  sum: number;
  isAuthenticQuranicFawatih: boolean;
  surahs?: string[];
  description?: string;
  matchScore: number;
  hasDuplicates?: boolean;
}

/**
 * Decomposes and orders an arbitrary collection of Noorani letters into authentic
 * Quranic Fawatih words separated by spaces (e.g. ['ع', 'ق', 'ص', 'س', 'ط'] -> "عسق ص ط").
 */
export function orderNooraniLettersQuranic(letters: string[]): {
  orderedString: string;
  orderedLetters: string[];
  score: number;
  isAuthentic: boolean;
  surahs?: string[];
  description?: string;
} {
  if (!letters || letters.length === 0) {
    return { orderedString: '', orderedLetters: [], score: 0, isAuthentic: false };
  }

  // Exact single letter
  if (letters.length === 1) {
    const ch = letters[0];
    const isAuth = ['ص', 'ق', 'ن'].includes(ch);
    const surahs = ch === 'ص' ? ['ص'] : ch === 'ق' ? ['ق'] : ch === 'ن' ? ['القلم'] : undefined;
    return {
      orderedString: ch,
      orderedLetters: [ch],
      score: isAuth ? 10000 : 1000,
      isAuthentic: isAuth,
      surahs,
      description: isAuth ? `فاتحة سورة ${surahs?.join('، ')}` : `حرف نوراني [${ch}]`,
    };
  }

  // Exact authentic full formula match
  const sortedOriginal = [...letters].sort().join('');
  for (const f of AUTHENTIC_QURANIC_FAWATIH) {
    const fSorted = [...f.letters].sort().join('');
    if (fSorted === sortedOriginal) {
      return {
        orderedString: f.formula,
        orderedLetters: f.letters,
        score: 100000,
        isAuthentic: true,
        surahs: f.surahs,
        description: f.description,
      };
    }
  }

  // Count availability map
  const getCounts = (arr: string[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const c of arr) counts[c] = (counts[c] || 0) + 1;
    return counts;
  };

  const initialCounts = getCounts(letters);

  interface PartitionResult {
    words: { word: string; letters: string[]; weight: number; surahOrder: number; isMulti: boolean }[];
    leftovers: string[];
    totalWeight: number;
  }

  let bestPartition: PartitionResult = {
    words: [],
    leftovers: [...letters],
    totalWeight: -1,
  };

  const solvePartition = (
    currentCounts: Record<string, number>,
    chosenBlocks: { word: string; letters: string[]; weight: number; surahOrder: number; isMulti: boolean }[],
    accumulatedWeight: number,
    blockStartIndex: number
  ) => {
    let canChooseAny = false;

    for (let i = blockStartIndex; i < QURANIC_FAWATIH_WORD_BLOCKS.length; i++) {
      const b = QURANIC_FAWATIH_WORD_BLOCKS[i];
      if (b.letters.length < 2) continue; // multi-letter blocks first

      // Check if b can be extracted from currentCounts
      let canExtract = true;
      const bCount = getCounts(b.letters);
      for (const [ch, req] of Object.entries(bCount)) {
        if ((currentCounts[ch] || 0) < req) {
          canExtract = false;
          break;
        }
      }

      if (canExtract) {
        canChooseAny = true;
        const nextCounts = { ...currentCounts };
        for (const [ch, req] of Object.entries(bCount)) {
          nextCounts[ch] -= req;
        }

        solvePartition(
          nextCounts,
          [...chosenBlocks, { ...b, isMulti: true }],
          accumulatedWeight + b.weight,
          i // allow repeated block if available
        );
      }
    }

    if (!canChooseAny) {
      // Gather leftovers
      const leftovers: string[] = [];
      for (const [ch, count] of Object.entries(currentCounts)) {
        for (let k = 0; k < count; k++) {
          leftovers.push(ch);
        }
      }

      // Leftover score based on Quranic order
      let leftoverScore = 0;
      for (const ch of leftovers) {
        if (['ص', 'ق', 'ن'].includes(ch)) leftoverScore += 2000;
        else leftoverScore += 500;
      }

      const totalScore = accumulatedWeight + leftoverScore;
      if (totalScore > bestPartition.totalWeight) {
        bestPartition = {
          words: chosenBlocks,
          leftovers,
          totalWeight: totalScore,
        };
      }
    }
  };

  solvePartition(initialCounts, [], 0, 0);

  // Sort leftover single letters by canonical Quranic appearance order
  const sortedLeftovers = [...bestPartition.leftovers].sort((a, b) => {
    const orderA = NOORANI_ORDER_MAP[a] || 99;
    const orderB = NOORANI_ORDER_MAP[b] || 99;
    return orderA - orderB;
  });

  // Assemble formatted words and ordered letter list
  const finalTokens: string[] = [];
  const finalOrderedLetters: string[] = [];
  const surahsSet = new Set<string>();

  // 1. Multi-letter authentic Fawatih blocks
  for (const w of bestPartition.words) {
    finalTokens.push(w.word);
    // If the word contains space like "حم عسق", extract raw letters
    const rawLetters = Array.from(w.word.replace(/\s+/g, ''));
    finalOrderedLetters.push(...rawLetters);
    const authEntry = AUTHENTIC_QURANIC_FAWATIH.find((f) => f.formula === w.word);
    if (authEntry?.surahs) {
      authEntry.surahs.forEach((s) => surahsSet.add(s));
    }
  }

  // 2. Individual leftover Noorani letters with space between each
  for (const ch of sortedLeftovers) {
    finalTokens.push(ch);
    finalOrderedLetters.push(ch);
    if (ch === 'ص') surahsSet.add('ص');
    if (ch === 'ق') surahsSet.add('ق');
    if (ch === 'ن') surahsSet.add('القلم');
  }

  const formattedFormula = finalTokens.join(' ').trim();
  const isAllAuthentic = bestPartition.words.length === 1 && sortedLeftovers.length === 0;

  return {
    orderedString: formattedFormula,
    orderedLetters: finalOrderedLetters,
    score: bestPartition.totalWeight,
    isAuthentic: isAllAuthentic,
    surahs: surahsSet.size > 0 ? Array.from(surahsSet) : undefined,
    description: isAllAuthentic
      ? `فاتحة قرآنية أصيلة [${formattedFormula}]`
      : `تركيبة نورانية بنسق فواتح السور (${letters.length} أحرف)`,
  };
}

/**
 * Exhaustive Noorani Letter Combinations Search (أحرف نورانية فقط)
 * Finds all combinations of the 14 Noorani letters summing to targetValue,
 * and formats them into authentic Quranic Fawatih blocks with spaces.
 */
export function findNooraniCombinations(
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: {
    maxResults?: number;
    uniqueLettersOnly?: boolean;
  } = {}
): NooraniFormulaMatch[] {
  if (!targetValue || targetValue <= 0) return [];
  const { maxResults = 150, uniqueLettersOnly = false } = options;

  const nooraniChars = Array.from(NOORANI_LETTERS_SET);
  const letterMap = nooraniChars
    .map((ch) => ({
      char: ch,
      val: tableValues[ch] ?? ABJAD_VALUES[ch] ?? 0,
    }))
    .filter((item) => item.val > 0);

  const results: NooraniFormulaMatch[] = [];
  const seenMultisets = new Set<string>();

  // Calculate sum of all unique Noorani letters
  const maxUniqueLettersSum = letterMap.reduce((acc, l) => acc + l.val, 0);
  const effectiveUniqueOnly = uniqueLettersOnly && targetValue <= maxUniqueLettersSum;

  // 1. Direct Authentic Quranic Fawatih check
  for (const f of AUTHENTIC_QURANIC_FAWATIH) {
    const rawLetters = f.letters;
    const hasDup = new Set(rawLetters).size !== rawLetters.length;
    if (effectiveUniqueOnly && hasDup) continue;

    const fSum = rawLetters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0);
    if (fSum === targetValue) {
      const multisetKey = [...rawLetters].sort().join('');
      seenMultisets.add(multisetKey);
      results.push({
        formula: f.formula,
        letters: rawLetters,
        values: rawLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
        sum: fSum,
        isAuthenticQuranicFawatih: true,
        surahs: f.surahs,
        description: f.description,
        matchScore: 100000,
        hasDuplicates: hasDup,
      });
    }
  }

  // 2. Single Noorani letter check
  for (const item of letterMap) {
    if (item.val === targetValue) {
      const multisetKey = item.char;
      if (!seenMultisets.has(multisetKey)) {
        seenMultisets.add(multisetKey);
        const isAuth = ['ص', 'ق', 'ن'].includes(item.char);
        results.push({
          formula: item.char,
          letters: [item.char],
          values: [item.val],
          sum: item.val,
          isAuthenticQuranicFawatih: isAuth,
          surahs: item.char === 'ص' ? ['ص'] : item.char === 'ق' ? ['ق'] : item.char === 'ن' ? ['القلم'] : undefined,
          description: isAuth ? `فاتحة قرآنية منفردة [${item.char}]` : `حرف نوراني منفرد [${item.char}]`,
          matchScore: isAuth ? 50000 : 10000,
          hasDuplicates: false,
        });
      }
    }
  }

  // 1b. Direct Combinations of Pure Authentic Quranic Fawatih Blocks (up to 8 blocks dynamically)
  // E.g. "كهيعص كهيعص حم عسق" or "حم حم طس"
  const quranicBlocks = [
    { word: 'كهيعص', letters: ['ك', 'ه', 'ي', 'ع', 'ص'], surahs: ['مريم'] },
    { word: 'حم عسق', letters: ['ح', 'م', 'ع', 'س', 'ق'], surahs: ['الشورى'] },
    { word: 'المص', letters: ['ا', 'ل', 'م', 'ص'], surahs: ['الأعراف'] },
    { word: 'المر', letters: ['ا', 'ل', 'م', 'ر'], surahs: ['الرعد'] },
    { word: 'طسم', letters: ['ط', 'س', 'م'], surahs: ['الشعراء', 'القصص'] },
    { word: 'عسق', letters: ['ع', 'س', 'ق'], surahs: ['الشورى'] },
    { word: 'الم', letters: ['ا', 'ل', 'م'], surahs: ['البقرة', 'آل عمران', 'العنكبوت', 'الروم', 'لقمان', 'السجدة'] },
    { word: 'الر', letters: ['ا', 'ل', 'ر'], surahs: ['يونس', 'هود', 'يوسف', 'إبراهيم', 'الحجر'] },
    { word: 'طه', letters: ['ط', 'ه'], surahs: ['طه'] },
    { word: 'طس', letters: ['ط', 'س'], surahs: ['النمل'] },
    { word: 'يس', letters: ['ي', 'س'], surahs: ['يس'] },
    { word: 'حم', letters: ['ح', 'م'], surahs: ['غافر', 'فصلت', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف'] },
    { word: 'ص', letters: ['ص'], surahs: ['ص'] },
    { word: 'ق', letters: ['ق'], surahs: ['ق'] },
    { word: 'ن', letters: ['ن'], surahs: ['القلم'] },
  ].map((b) => ({
    ...b,
    val: b.letters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0),
  })).filter((b) => b.val > 0 && b.val <= targetValue);

  // Dynamic max blocks based on target value
  const minBlocksNeeded = quranicBlocks.length > 0 
    ? Math.max(2, Math.ceil(targetValue / Math.max(...quranicBlocks.map(b => b.val))))
    : 2;
  const maxSearchBlocks = Math.max(6, Math.min(10, minBlocksNeeded + 3));

  // Search combinations of pure blocks
  const searchPureBlocks = (
    startIndex: number,
    chosen: typeof quranicBlocks,
    currentSum: number
  ) => {
    if (results.length >= maxResults * 1.5) return;

    if (currentSum === targetValue && chosen.length >= 2) {
      const allLetters = chosen.flatMap((b) => b.letters);
      const hasDup = new Set(allLetters).size !== allLetters.length;
      if (effectiveUniqueOnly && hasDup) return;

      const multisetKey = [...allLetters].sort().join('');
      if (!seenMultisets.has(multisetKey)) {
        seenMultisets.add(multisetKey);
        const formulaStr = chosen.map((b) => b.word).join(' ');
        const allSurahs = Array.from(new Set(chosen.flatMap((b) => b.surahs)));
        results.push({
          formula: formulaStr,
          letters: allLetters,
          values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
          sum: currentSum,
          isAuthenticQuranicFawatih: true,
          surahs: allSurahs,
          description: `تركيب من فواتح قرآنية تامة (${chosen.map((b) => b.word).join(' + ')})`,
          matchScore: 90000 - chosen.length * 1000,
          hasDuplicates: hasDup,
        });
      }
      return;
    }

    if (currentSum >= targetValue || chosen.length >= maxSearchBlocks) return;

    for (let i = startIndex; i < quranicBlocks.length; i++) {
      const block = quranicBlocks[i];
      if (currentSum + block.val > targetValue) continue;

      if (effectiveUniqueOnly) {
        const currentLettersSet = new Set(chosen.flatMap((b) => b.letters));
        if (block.letters.some((c) => currentLettersSet.has(c))) continue;
        searchPureBlocks(i + 1, [...chosen, block], currentSum + block.val);
      } else {
        const count = chosen.filter((b) => b.word === block.word).length;
        const maxRepForBlock = Math.max(3, Math.min(8, Math.ceil(targetValue / block.val)));
        if (count >= maxRepForBlock) continue;
        searchPureBlocks(i, [...chosen, block], currentSum + block.val);
      }
    }
  };

  searchPureBlocks(0, [], 0);

  // 3. Dynamic Exhaustive Backtracking Search (Lengths adapted to target value, supports > 1000)
  // Sort letters descending by value for optimal Branch-and-Bound pruning
  const sortedLetters = [...letterMap].sort((a, b) => b.val - a.val);
  const n = sortedLetters.length;
  const maxLetterVal = sortedLetters[0]?.val || 200;

  // Calculate minimum letters mathematically required to reach targetValue
  const minLettersRequired = Math.max(2, Math.ceil(targetValue / maxLetterVal));
  // Allow exploration up to minLettersRequired + 6 (max 20 letters)
  const maxSearchLen = Math.max(8, Math.min(22, minLettersRequired + 6));

  const collectedCombos: { chars: string[]; sum: number; hasDup: boolean }[] = [];

  const dfs = (
    startIndex: number,
    currentLetters: { char: string; val: number }[],
    currentSum: number,
    maxLen: number
  ) => {
    if (collectedCombos.length >= maxResults * 2) return;

    if (currentSum === targetValue) {
      if (currentLetters.length >= 2) {
        const chars = currentLetters.map((l) => l.char);
        const hasDup = new Set(chars).size !== chars.length;
        if (effectiveUniqueOnly && hasDup) return;

        const multisetKey = [...chars].sort().join('');
        if (!seenMultisets.has(multisetKey)) {
          seenMultisets.add(multisetKey);
          collectedCombos.push({ chars, sum: currentSum, hasDup });
        }
      }
      return;
    }

    if (currentSum > targetValue || currentLetters.length >= maxLen) {
      return;
    }

    // Branch and Bound: Check if maximum possible remaining sum can reach targetValue
    const remainingSlots = maxLen - currentLetters.length;
    const maxPossibleVal = sortedLetters[startIndex]?.val || sortedLetters[0].val;
    if (currentSum + remainingSlots * maxPossibleVal < targetValue) {
      return;
    }

    for (let i = startIndex; i < n; i++) {
      const item = sortedLetters[i];
      if (currentSum + item.val > targetValue) continue;

      if (effectiveUniqueOnly) {
        if (currentLetters.some((l) => l.char === item.char)) continue;
        dfs(i + 1, [...currentLetters, item], currentSum + item.val, maxLen);
      } else {
        const currentCount = currentLetters.filter((l) => l.char === item.char).length;
        const maxRepPerChar = Math.max(4, Math.min(10, Math.ceil(targetValue / item.val)));
        if (currentCount >= maxRepPerChar) continue;
        dfs(i, [...currentLetters, item], currentSum + item.val, maxLen);
      }
    }
  };

  // Search with dynamic length
  dfs(0, [], 0, maxSearchLen);

  // Order all collected combinations into Quranic Fawatih words with spaces
  for (const combo of collectedCombos) {
    const ordering = orderNooraniLettersQuranic(combo.chars);

    results.push({
      formula: ordering.orderedString,
      letters: ordering.orderedLetters,
      values: ordering.orderedLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
      sum: combo.sum,
      isAuthenticQuranicFawatih: ordering.isAuthentic,
      surahs: ordering.surahs,
      description: ordering.description,
      matchScore: ordering.score,
      hasDuplicates: combo.hasDup,
    });
  }

  // Sort results: Authentic Fawatih first, then highest matchScore, then shortest length
  results.sort((a, b) => {
    if (a.isAuthenticQuranicFawatih && !b.isAuthenticQuranicFawatih) return -1;
    if (!a.isAuthenticQuranicFawatih && b.isAuthenticQuranicFawatih) return 1;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.letters.length - b.letters.length;
  });

  return results.slice(0, maxResults);
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

/**
 * Merged & Classified Noorani Formula Item with full system metadata
 */
export interface MergedNooraniFormulaItem {
  key: string;
  formula: string;
  letters: string[];
  values: number[];
  sumMashriqi: number;
  sumMaghribi: number;
  displaySum: string;
  system: 'both' | 'dual_match' | 'mashriqi' | 'maghribi';
  systemLabel: 'مشترك' | 'مطابق للنظامين' | 'شرقي' | 'غربي';
  isAuthenticQuranicFawatih: boolean;
  surahs?: string[];
  description?: string;
  hasDuplicates?: boolean;
}

/**
 * Rigorous Multi-System Noorani Formula Classifier & Merger
 * Classifies every formula strictly by its real letter calculations:
 * - 'both' (مشترك): Letter values are identical in both systems and equal the target.
 * - 'dual_match' (مطابق للنظامين): Unique formula whose Mashriqi value satisfies targetMashriqi AND Maghribi value satisfies targetMaghribi (e.g. كهيعص for 195/165).
 * - 'mashriqi' (شرقي): Satisfies target only in Mashriqi (contains س or ص).
 * - 'maghribi' (غربي): Satisfies target only in Maghribi (contains س or ص).
 */
export function classifyAndMergeNooraniFormulas(
  targetMashriqi: number,
  targetMaghribi: number,
  options: {
    uniqueLettersOnly?: boolean;
    maxResults?: number;
  } = {}
): MergedNooraniFormulaItem[] {
  const { uniqueLettersOnly = false, maxResults = 80 } = options;

  // Search Mashriqi formulas for targetMashriqi
  const mashList = targetMashriqi > 0 ? findNooraniCombinations(targetMashriqi, MASHRIQI_VALUES, {
    maxResults: 70,
    uniqueLettersOnly,
  }) : [];

  // Search Maghribi formulas for targetMaghribi
  const magList = targetMaghribi > 0 ? findNooraniCombinations(targetMaghribi, MAGHRIBI_VALUES, {
    maxResults: 70,
    uniqueLettersOnly,
  }) : [];

  // Map to deduplicate by formula string
  const formulaMap = new Map<string, {
    formula: string;
    letters: string[];
    isAuthenticQuranicFawatih: boolean;
    surahs?: string[];
    description?: string;
    hasDuplicates?: boolean;
    matchScore: number;
  }>();

  for (const m of [...mashList, ...magList]) {
    const existing = formulaMap.get(m.formula);
    if (!existing) {
      formulaMap.set(m.formula, {
        formula: m.formula,
        letters: m.letters,
        isAuthenticQuranicFawatih: m.isAuthenticQuranicFawatih,
        surahs: m.surahs,
        description: m.description,
        hasDuplicates: m.hasDuplicates,
        matchScore: m.matchScore,
      });
    } else {
      if (m.isAuthenticQuranicFawatih) existing.isAuthenticQuranicFawatih = true;
      if (m.surahs && m.surahs.length > 0) existing.surahs = m.surahs;
      if (m.matchScore > existing.matchScore) existing.matchScore = m.matchScore;
    }
  }

  const mergedItems: MergedNooraniFormulaItem[] = [];

  for (const [formulaStr, item] of formulaMap.entries()) {
    // Calculate exact sum in Mashriqi
    const sumMash = item.letters.reduce((acc, c) => acc + (MASHRIQI_VALUES[c] ?? 0), 0);
    // Calculate exact sum in Maghribi
    const sumMag = item.letters.reduce((acc, c) => acc + (MAGHRIBI_VALUES[c] ?? 0), 0);

    const matchesMash = (targetMashriqi > 0 && sumMash === targetMashriqi);
    const matchesMag = (targetMaghribi > 0 && sumMag === targetMaghribi);

    if (!matchesMash && !matchesMag) continue;

    let system: 'both' | 'dual_match' | 'mashriqi' | 'maghribi';
    let systemLabel: 'مشترك' | 'مطابق للنظامين' | 'شرقي' | 'غربي';
    let displaySum: string;

    if (matchesMash && matchesMag) {
      if (sumMash === sumMag) {
        // True common formula (e.g. لا تحتوي على س أو ص أو توازنت قيمتهما)
        system = 'both';
        systemLabel = 'مشترك';
        displaySum = `${sumMash}`;
      } else {
        // Dual match (e.g. كهيعص حيث توافق المشرقي 195 بقيمتها المشرقية، وتوافق المغربي 165 بقيمتها المغربية)
        system = 'dual_match';
        systemLabel = 'مطابق للنظامين';
        displaySum = `شرقي: ${sumMash} / غربي: ${sumMag}`;
      }
    } else if (matchesMash) {
      system = 'mashriqi';
      systemLabel = 'شرقي';
      displaySum = `${sumMash}`;
    } else {
      system = 'maghribi';
      systemLabel = 'غربي';
      displaySum = `${sumMag}`;
    }

    const values = item.letters.map((c) => (system === 'maghribi' ? MAGHRIBI_VALUES[c] : MASHRIQI_VALUES[c]) ?? 0);

    mergedItems.push({
      key: `formula_${formulaStr}_${system}`,
      formula: formulaStr,
      letters: item.letters,
      values,
      sumMashriqi: sumMash,
      sumMaghribi: sumMag,
      displaySum,
      system,
      systemLabel,
      isAuthenticQuranicFawatih: item.isAuthenticQuranicFawatih,
      surahs: item.surahs,
      description: item.description,
      hasDuplicates: item.hasDuplicates,
    });
  }

  // Sort merged items:
  // 1. Authentic Quranic Fawatih / pure combinations first
  // 2. Dual match & Both first
  // 3. Shortest letters length
  mergedItems.sort((a, b) => {
    if (a.isAuthenticQuranicFawatih && !b.isAuthenticQuranicFawatih) return -1;
    if (!a.isAuthenticQuranicFawatih && b.isAuthenticQuranicFawatih) return 1;
    const sysPriority = (s: string) => (s === 'dual_match' ? 3 : s === 'both' ? 2 : 1);
    if (sysPriority(b.system) !== sysPriority(a.system)) {
      return sysPriority(b.system) - sysPriority(a.system);
    }
    return a.letters.length - b.letters.length;
  });

  return mergedItems.slice(0, maxResults);
}

