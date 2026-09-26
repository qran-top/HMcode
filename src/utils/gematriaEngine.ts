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
  { formula: 'الم', letters: ['ا', 'ل', 'م'], surahs: ['البقرة', 'آل عمران', 'العنكبوت', 'الروم', 'لقمان', 'السجدة'], surahOrders: [1, 2, 15, 16, 17, 18], description: 'فاتحة 6 سور في القرآن الكريم' },
  { formula: 'المص', letters: ['ا', 'ل', 'م', 'ص'], surahs: ['الأعراف'], surahOrders: [3], description: 'فاتحة سورة الأعراف' },
  { formula: 'الر', letters: ['ا', 'ل', 'ر'], surahs: ['يونس', 'هود', 'يوسف', 'إبراهيم', 'الحجر'], surahOrders: [4, 5, 6, 7, 8], description: 'فاتحة 5 سور في القرآن الكريم' },
  { formula: 'المر', letters: ['ا', 'ل', 'م', 'ر'], surahs: ['الرعد'], surahOrders: [9], description: 'فاتحة سورة الرعد' },
  { formula: 'كهيعص', letters: ['ك', 'ه', 'ي', 'ع', 'ص'], surahs: ['مريم'], surahOrders: [10], description: 'فاتحة سورة مريم (الخماسية النورانية)' },
  { formula: 'طه', letters: ['ط', 'ه'], surahs: ['طه'], surahOrders: [11], description: 'فاتحة سورة طه' },
  { formula: 'طسم', letters: ['ط', 'س', 'م'], surahs: ['الشعراء', 'القصص'], surahOrders: [12, 14], description: 'فاتحة سورتي الشعراء والقصص' },
  { formula: 'طس', letters: ['ط', 'س'], surahs: ['النمل'], surahOrders: [13], description: 'فاتحة سورة النمل' },
  { formula: 'يس', letters: ['ي', 'س'], surahs: ['يس'], surahOrders: [19], description: 'فاتحة سورة يس (قلب القرآن)' },
  { formula: 'ص', letters: ['ص'], surahs: ['ص'], surahOrders: [20], description: 'فاتحة سورة ص' },
  { formula: 'حم', letters: ['ح', 'م'], surahs: ['غافر', 'فصلت', 'الشورى (آية 1)', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف'], surahOrders: [21, 22, 23, 24, 25, 26, 27], description: 'الحواميم السبعة (7 سور متتالية تبدأ بـ حم)' },
  { formula: 'عسق', letters: ['ع', 'س', 'ق'], surahs: ['الشورى (الآية 2)'], surahOrders: [23], description: 'الآية الثانية المستقلة من فواتح سورة الشورى' },
  { formula: 'حم عسق', letters: ['ح', 'م', 'ع', 'س', 'ق'], surahs: ['الشورى (الآيتان 1 و 2)'], surahOrders: [23], description: 'فواتح سورة الشورى بمجموع آيتيها' },
  { formula: 'ق', letters: ['ق'], surahs: ['ق'], surahOrders: [28], description: 'فاتحة سورة ق والقرآن المجيد' },
  { formula: 'ن', letters: ['ن'], surahs: ['القلم'], surahOrders: [29], description: 'فاتحة سورة القلم (ن والقلم)' }
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
  { word: 'عسق', letters: ['ع', 'س', 'ق'], weight: 25000, surahOrder: 42, surahs: ['الشورى (آية 2)'] },
  { word: 'الم', letters: ['ا', 'ل', 'م'], weight: 20000, surahOrder: 2, surahs: ['البقرة', 'آل عمران', 'العنكبوت', 'الروم', 'لقمان', 'السجدة'] },
  { word: 'الر', letters: ['ا', 'ل', 'ر'], weight: 20000, surahOrder: 10, surahs: ['يونس', 'هود', 'يوسف', 'إبراهيم', 'الحجر'] },
  { word: 'طه', letters: ['ط', 'ه'], weight: 15000, surahOrder: 20, surahs: ['طه'] },
  { word: 'طس', letters: ['ط', 'س'], weight: 15000, surahOrder: 27, surahs: ['النمل'] },
  { word: 'يس', letters: ['ي', 'س'], weight: 15000, surahOrder: 36, surahs: ['يس'] },
  { word: 'حم', letters: ['ح', 'م'], weight: 15000, surahOrder: 40, surahs: ['غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف'] },
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
  surahOrders?: number[];
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
 * 5 Distinct Specialized Algorithms for Quranic Fawatih & Noorani Combinations
 */
export type NooraniAlgorithmId = 1 | 2 | 3 | 4 | 5;

export interface NooraniAlgorithmMeta {
  id: NooraniAlgorithmId;
  name: string;
  badge: string;
  description: string;
}

export const NOORANI_ALGORITHMS: NooraniAlgorithmMeta[] = [
  {
    id: 1,
    name: 'تجزئة مقطعية',
    badge: '1. تجزئة مقطعية',
    description: 'تفكيك الذكر إلى مقاطعه الطبيعية ومطابقة كل مقطع بفواتحه كـ (لا إله إلا الله = كهيعص)',
  },
  {
    id: 2,
    name: 'برمجة ديناميكية DP',
    badge: '2. برمجة ديناميكية DP',
    description: 'توليد شامل لكافة التراكيب الممكنة عبر جدول DP للفواتح والأحرف النورانية بسرعة فائقة',
  },
  {
    id: 3,
    name: 'فواتح عظمى (أقل عدداً)',
    badge: '3. فواتح عظمى (أقل عدداً)',
    description: 'اختيار أرقى وأقصر التراكيب بتفضيل الفواتح الكبرى كـ كهيعص وحم عسق بأقل عدد من الكتل',
  },
  {
    id: 4,
    name: 'تناغم قرآني (A*)',
    badge: '4. تناغم قرآني (A*)',
    description: 'توليد تراكيب متناغمة تجمع عائلات السور المتشابهة (الحواميم، الطواسين، الم، الر) بتدرج جمالي',
  },
  {
    id: 5,
    name: 'فواتح تامة (دون تكرار)',
    badge: '5. فواتح تامة (دون تكرار)',
    description: 'حصر التراكيب حصراً على كتل الفواتح الـ 14 التامة دون تكرار أي فاتحة نهائياً',
  },
];

/**
 * Canonical 29 Quranic Surah Openings in exact Mushaf order with their divine frequencies
 * فواتح سور القرآن الـ 29 بترتيب ورودها في المصحف الشريف وتردداتها الربانية
 */
export interface QuranicSurahFatihah {
  surahNumber: number;
  surahName: string;
  orderInFawatih: number; // 1 to 29
  formula: string;
  letters: string[];
  subFormulas?: string[]; // E.g. ['حم', 'عسق'] for Surah Ash-Shura (Ayah 1 + Ayah 2)
  family: 'alif_lam_mim_1' | 'alif_lam_ra' | 'tawasin' | 'alif_lam_mim_2' | 'hawamim' | 'individual';
  familyLabel: string;
}

export const QURANIC_29_SURAH_FAWATIH: QuranicSurahFatihah[] = [
  { surahNumber: 2, surahName: 'البقرة', orderInFawatih: 1, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_1', familyLabel: 'الم الأولى' },
  { surahNumber: 3, surahName: 'آل عمران', orderInFawatih: 2, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_1', familyLabel: 'الم الأولى' },
  { surahNumber: 7, surahName: 'الأعراف', orderInFawatih: 3, formula: 'المص', letters: ['ا', 'ل', 'م', 'ص'], family: 'individual', familyLabel: 'الأعراف' },
  { surahNumber: 10, surahName: 'يونس', orderInFawatih: 4, formula: 'الر', letters: ['ا', 'ل', 'ر'], family: 'alif_lam_ra', familyLabel: 'الر الخماسية' },
  { surahNumber: 11, surahName: 'هود', orderInFawatih: 5, formula: 'الر', letters: ['ا', 'ل', 'ر'], family: 'alif_lam_ra', familyLabel: 'الر الخماسية' },
  { surahNumber: 12, surahName: 'يوسف', orderInFawatih: 6, formula: 'الر', letters: ['ا', 'ل', 'ر'], family: 'alif_lam_ra', familyLabel: 'الر الخماسية' },
  { surahNumber: 13, surahName: 'الرعد', orderInFawatih: 7, formula: 'المر', letters: ['ا', 'ل', 'م', 'ر'], family: 'alif_lam_ra', familyLabel: 'الرعد' },
  { surahNumber: 14, surahName: 'إبراهيم', orderInFawatih: 8, formula: 'الر', letters: ['ا', 'ل', 'ر'], family: 'alif_lam_ra', familyLabel: 'الر الخماسية' },
  { surahNumber: 15, surahName: 'الحجر', orderInFawatih: 9, formula: 'الر', letters: ['ا', 'ل', 'ر'], family: 'alif_lam_ra', familyLabel: 'الر الخماسية' },
  { surahNumber: 19, surahName: 'مريم', orderInFawatih: 10, formula: 'كهيعص', letters: ['ك', 'ه', 'ي', 'ع', 'ص'], family: 'individual', familyLabel: 'مريم (الخماسية)' },
  { surahNumber: 20, surahName: 'طه', orderInFawatih: 11, formula: 'طه', letters: ['ط', 'ه'], family: 'individual', familyLabel: 'طه' },
  { surahNumber: 26, surahName: 'الشعراء', orderInFawatih: 12, formula: 'طسم', letters: ['ط', 'س', 'م'], family: 'tawasin', familyLabel: 'الطواسين' },
  { surahNumber: 27, surahName: 'النمل', orderInFawatih: 13, formula: 'طس', letters: ['ط', 'س'], family: 'tawasin', familyLabel: 'الطواسين' },
  { surahNumber: 28, surahName: 'القصص', orderInFawatih: 14, formula: 'طسم', letters: ['ط', 'س', 'م'], family: 'tawasin', familyLabel: 'الطواسين' },
  { surahNumber: 29, surahName: 'العنكبوت', orderInFawatih: 15, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_2', familyLabel: 'الم الرباعية' },
  { surahNumber: 30, surahName: 'الروم', orderInFawatih: 16, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_2', familyLabel: 'الم الرباعية' },
  { surahNumber: 31, surahName: 'لقمان', orderInFawatih: 17, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_2', familyLabel: 'الم الرباعية' },
  { surahNumber: 32, surahName: 'السجدة', orderInFawatih: 18, formula: 'الم', letters: ['ا', 'ل', 'م'], family: 'alif_lam_mim_2', familyLabel: 'الم الرباعية' },
  { surahNumber: 36, surahName: 'يس', orderInFawatih: 19, formula: 'يس', letters: ['ي', 'س'], family: 'individual', familyLabel: 'يس' },
  { surahNumber: 38, surahName: 'ص', orderInFawatih: 20, formula: 'ص', letters: ['ص'], family: 'individual', familyLabel: 'ص' },
  { surahNumber: 40, surahName: 'غافر', orderInFawatih: 21, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 41, surahName: 'فصلت', orderInFawatih: 22, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 42, surahName: 'الشورى', orderInFawatih: 23, formula: 'حم عسق', subFormulas: ['حم', 'عسق'], letters: ['ح', 'م', 'ع', 'س', 'ق'], family: 'hawamim', familyLabel: 'الشورى (حم آية 1 • عسق آية 2)' },
  { surahNumber: 43, surahName: 'الزخرف', orderInFawatih: 24, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 44, surahName: 'الدخان', orderInFawatih: 25, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 45, surahName: 'الجاثية', orderInFawatih: 26, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 46, surahName: 'الأحقاف', orderInFawatih: 27, formula: 'حم', letters: ['ح', 'م'], family: 'hawamim', familyLabel: 'الحواميم السبع' },
  { surahNumber: 50, surahName: 'ق', orderInFawatih: 28, formula: 'ق', letters: ['ق'], family: 'individual', familyLabel: 'ق' },
  { surahNumber: 68, surahName: 'القلم', orderInFawatih: 29, formula: 'ن', letters: ['ن'], family: 'individual', familyLabel: 'ن والقلم' },
];

/**
 * Frequency limits of each unique opening formula in the Quran (29 total surahs, 30 distinct opening ayahs)
 * سقف ترددات كل فاتحة في القرآن الكريم (حم تتكرر 7 مرات كاملة في الحواميم السبع بما فيها الشورى)
 */
export const QURANIC_FAWATIH_OCCURRENCE_CAPS: Record<string, number> = {
  'الم': 6,
  'الر': 5,
  'حم': 7, // الحواميم السبع كاملة (غافر، فصلت، الشورى آية 1، الزخرف، الدخان، الجاثية، الأحقاف)
  'طسم': 2,
  'عسق': 1, // فواتح سورة الشورى (الآية 2 المستقلة)
  'حم عسق': 1, // فواتح سورة الشورى بمجموع آيتيها
  'كهيعص': 1,
  'المص': 1,
  'المر': 1,
  'طه': 1,
  'طس': 1,
  'يس': 1,
  'ص': 1,
  'ق': 1,
  'ن': 1,
};

/**
 * Helper to get prepared 29 Quranic Surah openings with calculated values
 * Supports both whole-surah and constituent sub-ayah openings (e.g. حم + عسق in Ash-Shura)
 */
export function getPrepared29QuranicSurahs(tableValues: Record<string, number>) {
  return QURANIC_29_SURAH_FAWATIH.map((s) => {
    const val = s.letters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0);
    const subUnits = s.subFormulas
      ? s.subFormulas.map((sub, idx) => {
          const subLetters = sub.split('');
          const subVal = subLetters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0);
          return {
            formula: sub,
            letters: subLetters,
            val: subVal,
            ayahInSurah: idx + 1,
            label: idx === 0 ? 'الآية الأولى' : 'الآية الثانية',
          };
        })
      : [];
    return {
      ...s,
      val,
      subUnits,
    };
  });
}

/**
 * The 30 canonical opening Ayahs of disconnected letters in exact Quranic sequence
 * (الآيات الـ 30 لفواتح السور في المصحف الشريف - حم سبع مرات وعسق آية مستقلة)
 */
export function getPrepared30QuranicAyahs(tableValues: Record<string, number>) {
  const list: {
    surahNumber: number;
    surahName: string;
    orderInFawatih: number;
    ayahNumber: number;
    formula: string;
    letters: string[];
    family: QuranicSurahFatihah['family'];
    familyLabel: string;
    val: number;
  }[] = [];

  for (const s of QURANIC_29_SURAH_FAWATIH) {
    if (s.subFormulas && s.subFormulas.length > 1) {
      // Split Surah 42 (Ash-Shura) into its two distinct consecutive Ayat
      s.subFormulas.forEach((sub, idx) => {
        const subLetters = sub.split('');
        const val = subLetters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0);
        list.push({
          surahNumber: s.surahNumber,
          surahName: s.surahName,
          orderInFawatih: s.orderInFawatih,
          ayahNumber: idx + 1,
          formula: sub,
          letters: subLetters,
          family: s.family,
          familyLabel: `${s.surahName} (${sub} - آية ${idx + 1})`,
          val,
        });
      });
    } else {
      const val = s.letters.reduce((acc, c) => acc + (tableValues[c] ?? ABJAD_VALUES[c] ?? 0), 0);
      list.push({
        surahNumber: s.surahNumber,
        surahName: s.surahName,
        orderInFawatih: s.orderInFawatih,
        ayahNumber: 1,
        formula: s.formula,
        letters: s.letters,
        family: s.family,
        familyLabel: s.familyLabel,
        val,
      });
    }
  }
  return list;
}

/**
 * Splits text into natural dhikr clauses based on linguistic/dhikr markers
 */
export function partitionTextIntoDhikrClauses(text: string): string[] {
  if (!text) return [];
  const clean = text.trim();

  // 1. Punctuation split if present
  if (/[,،؛.\-]/.test(clean)) {
    const parts = clean.split(/[,،؛.\-]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length > 1) return parts;
  }

  // 2. Specialized Quranic Fawatih tokens check (e.g. repeated "حم" or "الم" or "الر" or "عسق")
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return [clean];

  const KNOWN_FAWATIH_TOKENS = new Set([
    'حم', 'الم', 'الر', 'طسم', 'طس', 'طه', 'يس', 'ص', 'ق', 'ن', 'عسق', 'كهيعص', 'المص', 'المر', 'حم_عسق'
  ]);
  if (tokens.every((t) => KNOWN_FAWATIH_TOKENS.has(t) || t === 'حم')) {
    return tokens;
  }

  // 3. Dhikr-specific phrase boundaries
  if (tokens.length <= 3) return [clean];

  const clauses: string[] = [];
  let cur: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const nextW = tokens[i + 1] || '';

    let isBoundary = false;

    // Trigger on "وحده"
    if (w === 'وحده' && cur.length >= 2) {
      isBoundary = true;
    }
    // Trigger on "له الملك" or "وله الملك"
    else if ((w === 'له' || w === 'وله') && nextW === 'الملك' && cur.length >= 2) {
      isBoundary = true;
    }
    // Trigger on "وله الحمد" or "والحمد"
    else if ((w === 'وله' || w === 'له' || w === 'والحمد') && (nextW === 'الحمد' || w === 'والحمد') && cur.length >= 2) {
      isBoundary = true;
    }
    // Trigger on "وهو على" or conjunctions after decent length
    else if (w.startsWith('و') && w.length >= 2 && cur.length >= 3 && ['وهو', 'وعلى', 'وبحمده', 'ولا'].includes(w)) {
      isBoundary = true;
    } else if (w.startsWith('و') && w !== 'و' && cur.length >= 4) {
      isBoundary = true;
    }

    if (isBoundary && cur.length > 0) {
      clauses.push(cur.join(' '));
      cur = [w];
    } else {
      cur.push(w);
    }
  }

  if (cur.length > 0) {
    clauses.push(cur.join(' '));
  }

  return clauses.length > 1 ? clauses : [clean];
}

/**
 * Calculates bonus for contiguous runs in the 29 Surahs / 30 Ayahs (e.g. 21 to 27 in Hawamim)
 */
function evaluateQuranicSequenceScore(
  selectedSurahs: { orderInFawatih: number; surahNumber: number; surahName: string; family: string }[]
): {
  score: number;
  contiguousClusters: string[];
} {
  if (selectedSurahs.length <= 1) return { score: 10000, contiguousClusters: [] };

  let score = 5000;
  const contiguousClusters: string[] = [];
  let currentRun: string[] = [selectedSurahs[0].surahName];

  for (let i = 1; i < selectedSurahs.length; i++) {
    const prev = selectedSurahs[i - 1];
    const curr = selectedSurahs[i];

    // Check if directly contiguous in the 29 Surahs or consecutive Ayahs of the same Surah
    const isContiguous =
      curr.orderInFawatih === prev.orderInFawatih + 1 ||
      (curr.orderInFawatih === prev.orderInFawatih && curr.surahNumber === prev.surahNumber);

    if (isContiguous) {
      score += 15000; // Big bonus for contiguous Quranic order!
      currentRun.push(curr.surahName);
    } else {
      if (currentRun.length >= 2) {
        contiguousClusters.push(currentRun.join(' ← '));
      }
      currentRun = [curr.surahName];
    }

    // Family harmony bonus
    if (curr.family === prev.family && curr.family !== 'individual') {
      score += 8000;
    }
  }

  if (currentRun.length >= 2) {
    contiguousClusters.push(currentRun.join(' ← '));
  }

  return { score, contiguousClusters };
}

/**
 * ALGORITHM 1: Semantic Dhikr Phrase Partitioning with 29-Surah Quranic Alignment
 * Splits a complex dhikr into clauses, matches each to authentic Surah openings,
 * and sorts all terms in strict Quranic Mushaf sequence.
 */
export function findNooraniByPhrasePartitioning(
  queryText: string,
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: { maxResults?: number; uniqueLettersOnly?: boolean } = {}
): NooraniFormulaMatch[] {
  const { maxResults = 80, uniqueLettersOnly = false } = options;
  const ayahs30 = getPrepared30QuranicAyahs(tableValues);
  const surahs29 = getPrepared29QuranicSurahs(tableValues);
  const results: NooraniFormulaMatch[] = [];
  const seenKeys = new Set<string>();

  const clauses = partitionTextIntoDhikrClauses(queryText);

  // 1. Direct Multi-Token Quranic Fawatih Matching (e.g. "حم حم حم حم حم حم حم" or "حم عسق")
  const KNOWN_FAWATIH_TOKENS = new Set([
    'حم', 'الم', 'الر', 'طسم', 'طس', 'طه', 'يس', 'ص', 'ق', 'ن', 'عسق', 'كهيعص', 'المص', 'المر'
  ]);
  const isAllFawatihTokens = clauses.length >= 2 && clauses.every((c) => KNOWN_FAWATIH_TOKENS.has(c));

  if (isAllFawatihTokens) {
    const usedIndices = new Set<number>();
    const matchedAyahs: typeof ayahs30 = [];

    for (const token of clauses) {
      const idx = ayahs30.findIndex((a, i) => !usedIndices.has(i) && a.formula === token);
      if (idx !== -1) {
        usedIndices.add(idx);
        matchedAyahs.push(ayahs30[idx]);
      }
    }

    if (matchedAyahs.length === clauses.length) {
      const sumTotal = matchedAyahs.reduce((acc, a) => acc + a.val, 0);
      if (sumTotal === targetValue) {
        const formulaStr = matchedAyahs.map((a) => a.formula).join(' ');
        const allLetters = matchedAyahs.flatMap((a) => a.letters);
        const hasDup = new Set(allLetters).size !== allLetters.length;

        if (!seenKeys.has(formulaStr) && (!uniqueLettersOnly || !hasDup)) {
          seenKeys.add(formulaStr);
          const seq = evaluateQuranicSequenceScore(matchedAyahs);
          const surahOrders = Array.from(new Set(matchedAyahs.map((a) => a.orderInFawatih))).sort((a, b) => a - b);
          const isHawamim7 = matchedAyahs.length === 7 && matchedAyahs.every((a) => a.formula === 'حم');
          const description = isHawamim7
            ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
            : `تسلسل فواتح قرآنية متتالية (${matchedAyahs.length} سور): ${matchedAyahs.map((a) => `${a.formula} (${a.surahName})`).join(' ← ')}`;

          results.push({
            formula: formulaStr,
            letters: allLetters,
            values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
            sum: sumTotal,
            isAuthenticQuranicFawatih: true,
            surahs: matchedAyahs.map(
              (a) => `${a.formula} (${a.surahName} ${a.surahNumber}${a.ayahNumber > 1 || (a.surahNumber === 42 && a.formula === 'حم') ? ` آية ${a.ayahNumber}` : ''})`
            ),
            surahOrders,
            description,
            matchScore: 500000 + seq.score,
            hasDuplicates: hasDup,
          });
        }
      }
    }
  }

  // 2. Semantic Dhikr Clause Partitioning for General Phrases
  if (!isAllFawatihTokens && clauses.length >= 2) {
    const clauseMatches: { clause: string; val: number; surah: (typeof ayahs30)[0] | null }[] = [];
    let sumTotal = 0;
    const usedAyahIndices = new Set<number>();

    for (const c of clauses) {
      const val = calculateGematriaWithOptions(c, {}, tableValues);
      sumTotal += val;
      const matchIdx = ayahs30.findIndex((a, idx) => !usedAyahIndices.has(idx) && a.val === val);
      if (matchIdx !== -1) {
        usedAyahIndices.add(matchIdx);
        clauseMatches.push({ clause: c, val, surah: ayahs30[matchIdx] });
      } else {
        clauseMatches.push({ clause: c, val, surah: null });
      }
    }

    if (sumTotal === targetValue && clauseMatches.every((cm) => cm.surah !== null)) {
      const matchedAyahs = clauseMatches.map((cm) => cm.surah!);
      matchedAyahs.sort((a, b) => a.orderInFawatih - b.orderInFawatih || a.ayahNumber - b.ayahNumber);

      const allLetters = matchedAyahs.flatMap((s) => s.letters);
      const formulaStr = matchedAyahs.map((s) => s.formula).join(' ');
      const hasDup = new Set(allLetters).size !== allLetters.length;

      if (!seenKeys.has(formulaStr) && (!uniqueLettersOnly || !hasDup)) {
        seenKeys.add(formulaStr);
        const seq = evaluateQuranicSequenceScore(matchedAyahs);
        const surahLabels = matchedAyahs.map((s) => `${s.formula} (${s.surahName} ${s.surahNumber})`);
        const breakdown = clauseMatches.map((cm) => `[${cm.clause} = ${cm.surah!.formula} (${cm.surah!.surahName})]`).join(' + ');

        results.push({
          formula: formulaStr,
          letters: allLetters,
          values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
          sum: targetValue,
          isAuthenticQuranicFawatih: true,
          surahs: surahLabels,
          surahOrders: Array.from(new Set(matchedAyahs.map((s) => s.orderInFawatih))).sort((a, b) => a - b),
          description: `تجزئة مقطعية بالترتيب المصحفي: ${breakdown}`,
          matchScore: 100000 + seq.score,
          hasDuplicates: hasDup,
        });
      }
    }
  }

  // 3. Single Surah / Ayah Match
  for (let i = 0; i < ayahs30.length; i++) {
    const a1 = ayahs30[i];
    if (a1.val === targetValue) {
      if (!seenKeys.has(a1.formula)) {
        seenKeys.add(a1.formula);
        const isHamim = a1.formula === 'حم';
        const surahOrders = isHamim ? [21, 22, 23, 24, 25, 26, 27] : [a1.orderInFawatih];
        const surahLabels = isHamim
          ? [
              'حم (غافر 40)',
              'حم (فصلت 41)',
              'حم (الشورى 42 - آية 1)',
              'حم (الزخرف 43)',
              'حم (الدخان 44)',
              'حم (الجاثية 45)',
              'حم (الأحقاف 46)',
            ]
          : [`${a1.formula} (${a1.surahName} ${a1.surahNumber})`];

        results.push({
          formula: a1.formula,
          letters: a1.letters,
          values: a1.letters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
          sum: targetValue,
          isAuthenticQuranicFawatih: true,
          surahs: surahLabels,
          surahOrders,
          description: isHamim
            ? 'الحواميم السبعة (7 سور متتالية تبدأ بـ حم، ومنها الشورى آية 1)'
            : `فاتحة سورة ${a1.surahName} (رقم ${a1.surahNumber}) - ترتيب ${a1.orderInFawatih} في فواتح القرآن`,
          matchScore: 99999,
          hasDuplicates: new Set(a1.letters).size !== a1.letters.length,
        });
      }
    }
  }

  // Also check Surah 42 combined whole-surah value (278)
  for (const s of surahs29) {
    if (s.orderInFawatih === 23 && s.val === targetValue && !seenKeys.has(s.formula)) {
      seenKeys.add(s.formula);
      results.push({
        formula: s.formula,
        letters: s.letters,
        values: s.letters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
        sum: targetValue,
        isAuthenticQuranicFawatih: true,
        surahs: [`${s.formula} (${s.surahName} ${s.surahNumber})`],
        surahOrders: [s.orderInFawatih],
        description: `فواتح سورة الشورى (الآيتان 1 و 2: حم عسق)`,
        matchScore: 99999,
        hasDuplicates: new Set(s.letters).size !== s.letters.length,
      });
    }
  }

  // 4. Pair / Multi Combinations from the 30 Ayahs in strict sequential order
  for (let i = 0; i < ayahs30.length; i++) {
    const a1 = ayahs30[i];
    if (a1.val < targetValue) {
      for (let j = i + 1; j < ayahs30.length; j++) {
        const a2 = ayahs30[j];
        if (a1.val + a2.val === targetValue) {
          const formulaStr = `${a1.formula} ${a2.formula}`;
          const allLetters = [...a1.letters, ...a2.letters];
          const hasDup = new Set(allLetters).size !== allLetters.length;

          if (!seenKeys.has(formulaStr) && (!uniqueLettersOnly || !hasDup)) {
            seenKeys.add(formulaStr);
            const isContiguous =
              a2.orderInFawatih === a1.orderInFawatih + 1 ||
              (a2.orderInFawatih === a1.orderInFawatih && a2.surahNumber === a1.surahNumber);

            results.push({
              formula: formulaStr,
              letters: allLetters,
              values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
              sum: targetValue,
              isAuthenticQuranicFawatih: true,
              surahs: [
                `${a1.formula} (${a1.surahName} ${a1.surahNumber})`,
                `${a2.formula} (${a2.surahName} ${a2.surahNumber})`,
              ],
              surahOrders: Array.from(new Set([a1.orderInFawatih, a2.orderInFawatih])).sort((a, b) => a - b),
              description: `ترتيب مصحفي: [${a1.surahName} (${a1.surahNumber})] ← [${a2.surahName} (${a2.surahNumber})] ${isContiguous ? '⭐ (متتاليتان)' : ''}`,
              matchScore: 95000 + (isContiguous ? 20000 : 0),
              hasDuplicates: hasDup,
            });
          }
        }
      }
    }
  }

  // Supplement with DP solutions over 30 Ayahs
  const fallback = findNooraniByDPKnapsack(targetValue, tableValues, { maxResults: maxResults - results.length });
  for (const f of fallback) {
    if (!seenKeys.has(f.formula)) {
      seenKeys.add(f.formula);
      results.push(f);
    }
  }

  return results.slice(0, maxResults);
}

/**
 * ALGORITHM 2: Comprehensive DP Knapsack across the 29 Quranic Surahs
 * Finds all combinations of the 29 Surahs in strict Mushaf order, strictly observing repetition limits.
 */
export function findNooraniByDPKnapsack(
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: { maxResults?: number; uniqueLettersOnly?: boolean; shouldAbort?: () => boolean } = {}
): NooraniFormulaMatch[] {
  const { maxResults = 80, uniqueLettersOnly = false, shouldAbort } = options;
  if (!targetValue || targetValue <= 0) return [];
  if (shouldAbort && shouldAbort()) return [];

  const ayahs30 = getPrepared30QuranicAyahs(tableValues);
  const totalSum = ayahs30.reduce((acc, s) => acc + s.val, 0);

  if (targetValue > totalSum) return [];

  interface DPSurahPath {
    surahs: (typeof ayahs30)[0][];
    sum: number;
    score: number;
  }

  const dp: DPSurahPath[][] = Array.from({ length: targetValue + 1 }, () => []);
  dp[0] = [{ surahs: [], sum: 0, score: 0 }];

  for (let sIdx = 0; sIdx < ayahs30.length; sIdx++) {
    if (shouldAbort && shouldAbort()) return [];
    const s = ayahs30[sIdx];
    if (s.val > targetValue) continue;

    for (let v = targetValue; v >= s.val; v--) {
      const prevList = dp[v - s.val];
      if (!prevList || prevList.length === 0) continue;

      for (const prev of prevList) {
        if (dp[v].length >= 15) break;

        if (uniqueLettersOnly) {
          const usedLetters = new Set(prev.surahs.flatMap((x) => x.letters));
          if (s.letters.some((c) => usedLetters.has(c))) continue;
        }

        const nextSurahs = [...prev.surahs, s];
        const seq = evaluateQuranicSequenceScore(nextSurahs);

        dp[v].push({
          surahs: nextSurahs,
          sum: v,
          score: prev.score + seq.score,
        });
      }
    }
  }

  const results: NooraniFormulaMatch[] = [];
  const seenFormulas = new Set<string>();

  const candidates = [...dp[targetValue]].sort((a, b) => b.score - a.score);

  for (const item of candidates) {
    if (item.surahs.length === 0) continue;
    const formulaStr = item.surahs.map((s) => s.formula).join(' ');
    if (seenFormulas.has(formulaStr)) continue;
    seenFormulas.add(formulaStr);

    const allLetters = item.surahs.flatMap((s) => s.letters);
    const hasDup = new Set(allLetters).size !== allLetters.length;
    const surahList = item.surahs.map(
      (s) => `${s.formula} (${s.surahName} ${s.surahNumber}${s.ayahNumber > 1 || (s.surahNumber === 42 && s.formula === 'حم') ? ` آية ${s.ayahNumber}` : ''})`
    );
    const seq = evaluateQuranicSequenceScore(item.surahs);
    const isHawamim7 = item.surahs.length === 7 && item.surahs.every((s) => s.formula === 'حم');
    const contiguousText = seq.contiguousClusters.length > 0 ? ` [متتالية: ${seq.contiguousClusters.join('، ')}]` : '';
    const description = isHawamim7
      ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
      : `تسلسل مصحفي (${item.surahs.length} سور): ${item.surahs.map((s) => `${s.surahName} (${s.surahNumber})`).join(' ← ')}${contiguousText}`;

    results.push({
      formula: formulaStr,
      letters: allLetters,
      values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
      sum: targetValue,
      isAuthenticQuranicFawatih: true,
      surahs: surahList,
      surahOrders: Array.from(new Set(item.surahs.map((s) => s.orderInFawatih))).sort((a, b) => a - b),
      description,
      matchScore: (isHawamim7 ? 500000 : 90000) + seq.score,
      hasDuplicates: hasDup,
    });
  }

  return results.slice(0, maxResults);
}

/**
 * ALGORITHM 3: Min-Surahs Greedy Optimization
 * Finds combinations of the 30 Ayahs using the absolute minimum count of Surahs, in Quranic order.
 */
export function findNooraniByMinBlocksGreedy(
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: { maxResults?: number; uniqueLettersOnly?: boolean; shouldAbort?: () => boolean } = {}
): NooraniFormulaMatch[] {
  const { maxResults = 80, uniqueLettersOnly = false, shouldAbort } = options;
  if (!targetValue || targetValue <= 0) return [];
  if (shouldAbort && shouldAbort()) return [];

  const ayahs30 = getPrepared30QuranicAyahs(tableValues);
  const totalSum = ayahs30.reduce((acc, s) => acc + s.val, 0);
  if (targetValue > totalSum) return [];

  const maxVal = Math.max(...ayahs30.map((s) => s.val));
  const minK = Math.max(1, Math.ceil(targetValue / maxVal));
  if (minK > ayahs30.length) return [];
  const maxK = Math.min(ayahs30.length, minK + 4);

  const suffixSum = new Array(ayahs30.length + 1).fill(0);
  for (let i = ayahs30.length - 1; i >= 0; i--) {
    suffixSum[i] = suffixSum[i + 1] + ayahs30[i].val;
  }

  const results: NooraniFormulaMatch[] = [];
  const seenFormulas = new Set<string>();

  for (let k = minK; k <= maxK; k++) {
    if (results.length >= maxResults) break;
    if (shouldAbort && shouldAbort()) break;

    const dfs = (startIndex: number, chosen: typeof ayahs30, currentSum: number) => {
      if (shouldAbort && shouldAbort()) return;
      if (results.length >= maxResults * 1.5) return;
      if (chosen.length === k) {
        if (currentSum === targetValue) {
          const allLetters = chosen.flatMap((s) => s.letters);
          const hasDup = new Set(allLetters).size !== allLetters.length;
          if (uniqueLettersOnly && hasDup) return;

          const formulaStr = chosen.map((s) => s.formula).join(' ');
          if (!seenFormulas.has(formulaStr)) {
            seenFormulas.add(formulaStr);
            const surahList = chosen.map(
              (s) => `${s.formula} (${s.surahName} ${s.surahNumber}${s.ayahNumber > 1 || (s.surahNumber === 42 && s.formula === 'حم') ? ` آية ${s.ayahNumber}` : ''})`
            );
            const seq = evaluateQuranicSequenceScore(chosen);
            const isHawamim7 = chosen.length === 7 && chosen.every((s) => s.formula === 'حم');
            const contiguousText = seq.contiguousClusters.length > 0 ? ` [متتالية: ${seq.contiguousClusters.join('، ')}]` : '';
            const description = isHawamim7
              ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
              : `فواتح عظمى مختزلة (${chosen.length} سور مصحفية): ${chosen.map((s) => `${s.surahName} (${s.surahNumber})`).join(' ← ')}${contiguousText}`;

            results.push({
              formula: formulaStr,
              letters: allLetters,
              values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
              sum: currentSum,
              isAuthenticQuranicFawatih: true,
              surahs: surahList,
              surahOrders: Array.from(new Set(chosen.map((s) => s.orderInFawatih))).sort((a, b) => a - b),
              description,
              matchScore: (isHawamim7 ? 500000 : 99000) - chosen.length * 2000 + seq.score,
              hasDuplicates: hasDup,
            });
          }
        }
        return;
      }

      const remainingSlots = k - chosen.length;
      if (currentSum + remainingSlots * maxVal < targetValue) return;
      if (startIndex < ayahs30.length && currentSum + suffixSum[startIndex] < targetValue) return;

      for (let i = startIndex; i < ayahs30.length; i++) {
        const s = ayahs30[i];
        if (currentSum + s.val > targetValue) continue;

        if (uniqueLettersOnly) {
          const used = new Set(chosen.flatMap((x) => x.letters));
          if (s.letters.some((c) => used.has(c))) continue;
        }

        dfs(i + 1, [...chosen, s], currentSum + s.val);
      }
    };

    dfs(0, [], 0);
  }

  return results.slice(0, maxResults);
}

/**
 * ALGORITHM 4: Quranic Harmonic A* Search (Contiguous Surah Chains)
 * Heavily rewards consecutive Surah runs (e.g. 7 Hawamim, 5 Alif-Lam-Ra, 4 Alif-Lam-Mim)
 */
export function findNooraniByHarmonicSearch(
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: { maxResults?: number; uniqueLettersOnly?: boolean; shouldAbort?: () => boolean } = {}
): NooraniFormulaMatch[] {
  const { maxResults = 80, uniqueLettersOnly = false, shouldAbort } = options;
  if (!targetValue || targetValue <= 0) return [];
  if (shouldAbort && shouldAbort()) return [];

  const ayahs30 = getPrepared30QuranicAyahs(tableValues).filter((s) => s.val <= targetValue);
  const totalSum = ayahs30.reduce((acc, s) => acc + s.val, 0);
  if (targetValue > totalSum) return [];

  const results: NooraniFormulaMatch[] = [];
  const seenFormulas = new Set<string>();

  interface AStarSurahNode {
    chosen: typeof ayahs30;
    lastIndex: number;
    sum: number;
    harmonyScore: number;
  }

  const queue: AStarSurahNode[] = [{ chosen: [], lastIndex: -1, sum: 0, harmonyScore: 0 }];
  let steps = 0;

  while (queue.length > 0 && results.length < maxResults * 1.5 && steps < 1200) {
    steps++;
    if (steps % 50 === 0 && shouldAbort && shouldAbort()) break;

    queue.sort((a, b) => {
      const remA = targetValue - a.sum;
      const remB = targetValue - b.sum;
      if (remA === 0 && remB !== 0) return -1;
      if (remB === 0 && remA !== 0) return 1;
      return b.harmonyScore - a.harmonyScore || remA - remB;
    });

    const curr = queue.shift()!;

    if (curr.sum === targetValue && curr.chosen.length > 0) {
      const allLetters = curr.chosen.flatMap((s) => s.letters);
      const hasDup = new Set(allLetters).size !== allLetters.length;
      if (uniqueLettersOnly && hasDup) continue;

      const formulaStr = curr.chosen.map((s) => s.formula).join(' ');
      if (!seenFormulas.has(formulaStr)) {
        seenFormulas.add(formulaStr);
        const seq = evaluateQuranicSequenceScore(curr.chosen);
        const surahList = curr.chosen.map(
          (s) => `${s.formula} (${s.surahName} ${s.surahNumber}${s.ayahNumber > 1 || (s.surahNumber === 42 && s.formula === 'حم') ? ` آية ${s.ayahNumber}` : ''})`
        );
        const isHawamim7 = curr.chosen.length === 7 && curr.chosen.every((s) => s.formula === 'حم');
        const clusters = seq.contiguousClusters.length > 0 ? ` (سلسلة متصلة: ${seq.contiguousClusters.join('، ')})` : '';
        const description = isHawamim7
          ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
          : `تناغم قرآني مصحفي: ${curr.chosen.map((s) => `${s.surahName} (${s.surahNumber})`).join(' ← ')}${clusters}`;

        results.push({
          formula: formulaStr,
          letters: allLetters,
          values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
          sum: curr.sum,
          isAuthenticQuranicFawatih: true,
          surahs: surahList,
          surahOrders: Array.from(new Set(curr.chosen.map((s) => s.orderInFawatih))).sort((a, b) => a - b),
          description,
          matchScore: (isHawamim7 ? 500000 : 95000) + curr.harmonyScore,
          hasDuplicates: hasDup,
        });
      }
      continue;
    }

    if (curr.chosen.length >= 8) continue;

    for (let i = curr.lastIndex + 1; i < ayahs30.length; i++) {
      const s = ayahs30[i];
      if (curr.sum + s.val > targetValue) continue;

      let bonus = 0;
      if (curr.chosen.length > 0 && i === curr.lastIndex + 1) {
        bonus += 20000;
      }
      if (curr.chosen.some((prev) => prev.family === s.family)) {
        bonus += 8000;
      }

      if (uniqueLettersOnly) {
        const used = new Set(curr.chosen.flatMap((x) => x.letters));
        if (s.letters.some((c) => used.has(c))) continue;
      }

      queue.push({
        chosen: [...curr.chosen, s],
        lastIndex: i,
        sum: curr.sum + s.val,
        harmonyScore: curr.harmonyScore + bonus,
      });
    }

    if (queue.length > 250) {
      queue.splice(250);
    }
  }

  return results.slice(0, maxResults);
}

/**
 * ALGORITHM 5: Strict Sequential 30-Ayah Subset Sum
 * Strict 0/1 selection across the 30 Ayahs in unchangeable Mushaf order.
 * Highly optimized with mathematical suffix sum branch-and-bound pruning.
 */
export function findNooraniByStrictUniqueFawatih(
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: { maxResults?: number; uniqueLettersOnly?: boolean; shouldAbort?: () => boolean } = {}
): NooraniFormulaMatch[] {
  const { maxResults = 80, uniqueLettersOnly = false, shouldAbort } = options;
  if (!targetValue || targetValue <= 0) return [];
  if (shouldAbort && shouldAbort()) return [];

  const ayahs30 = getPrepared30QuranicAyahs(tableValues).filter((s) => s.val <= targetValue);
  const totalSum = ayahs30.reduce((acc, s) => acc + s.val, 0);

  if (targetValue > totalSum) return [];

  const results: NooraniFormulaMatch[] = [];
  const seenFormulas = new Set<string>();

  const suffixSum = new Array(ayahs30.length + 1).fill(0);
  for (let i = ayahs30.length - 1; i >= 0; i--) {
    suffixSum[i] = suffixSum[i + 1] + ayahs30[i].val;
  }

  const chosenStack: (typeof ayahs30)[0][] = [];
  let visits = 0;

  const search01 = (startIndex: number, currentSum: number) => {
    visits++;
    if (visits % 500 === 0 && shouldAbort && shouldAbort()) return;
    if (results.length >= maxResults * 1.5) return;

    if (currentSum === targetValue && chosenStack.length > 0) {
      const allLetters = chosenStack.flatMap((s) => s.letters);
      const hasDup = new Set(allLetters).size !== allLetters.length;
      if (uniqueLettersOnly && hasDup) return;

      const formulaStr = chosenStack.map((s) => s.formula).join(' ');
      if (!seenFormulas.has(formulaStr)) {
        seenFormulas.add(formulaStr);
        const seq = evaluateQuranicSequenceScore(chosenStack);
        const surahList = chosenStack.map(
          (s) => `${s.formula} (${s.surahName} ${s.surahNumber}${s.ayahNumber > 1 || (s.surahNumber === 42 && s.formula === 'حم') ? ` آية ${s.ayahNumber}` : ''})`
        );
        const isHawamim7 = chosenStack.length === 7 && chosenStack.every((s) => s.formula === 'حم');
        const clusters = seq.contiguousClusters.length > 0 ? ` [متتالية: ${seq.contiguousClusters.join('، ')}]` : '';
        const description = isHawamim7
          ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
          : `تسلسل مصحفي حقيقي (${chosenStack.length} سور): ${chosenStack.map((s) => `${s.surahName} (${s.surahNumber})`).join(' ← ')}${clusters}`;

        results.push({
          formula: formulaStr,
          letters: allLetters,
          values: allLetters.map((c) => tableValues[c] ?? ABJAD_VALUES[c] ?? 0),
          sum: currentSum,
          isAuthenticQuranicFawatih: true,
          surahs: surahList,
          surahOrders: Array.from(new Set(chosenStack.map((s) => s.orderInFawatih))).sort((a, b) => a - b),
          description,
          matchScore: (isHawamim7 ? 500000 : 99999) + seq.score,
          hasDuplicates: hasDup,
        });
      }
      return;
    }

    if (currentSum >= targetValue) return;
    if (startIndex >= ayahs30.length || currentSum + suffixSum[startIndex] < targetValue) return;

    for (let i = startIndex; i < ayahs30.length; i++) {
      if (currentSum + ayahs30[i].val > targetValue) continue;
      if (currentSum + suffixSum[i] < targetValue) break;

      chosenStack.push(ayahs30[i]);
      search01(i + 1, currentSum + ayahs30[i].val);
      chosenStack.pop();

      if (results.length >= maxResults * 1.5) break;
    }
  };

  search01(0, 0);
  return results.slice(0, maxResults);
}

/**
 * Dispatcher for the 5 Noorani Algorithms
 */
export function findNooraniCombinationsByAlgorithm(
  algorithmId: NooraniAlgorithmId,
  targetValue: number,
  tableValues: Record<string, number> = ABJAD_VALUES,
  options: {
    maxResults?: number;
    uniqueLettersOnly?: boolean;
    queryText?: string;
    shouldAbort?: () => boolean;
  } = {}
): NooraniFormulaMatch[] {
  if (!targetValue || targetValue <= 0) return [];
  if (options.shouldAbort && options.shouldAbort()) return [];

  switch (algorithmId) {
    case 1:
      return findNooraniByPhrasePartitioning(options.queryText || '', targetValue, tableValues, options);
    case 2:
      return findNooraniByDPKnapsack(targetValue, tableValues, options);
    case 3:
      return findNooraniByMinBlocksGreedy(targetValue, tableValues, options);
    case 4:
      return findNooraniByHarmonicSearch(targetValue, tableValues, options);
    case 5:
      return findNooraniByStrictUniqueFawatih(targetValue, tableValues, options);
    default:
      return findNooraniByPhrasePartitioning(options.queryText || '', targetValue, tableValues, options);
  }
}

/**
 * Infers surah orders (1 to 29) from a formula string if not explicitly given
 */
export function inferSurahOrdersFromFormula(formulaStr: string): number[] {
  if (!formulaStr) return [];
  const trimmed = formulaStr.trim();

  // 1. Direct match with standard authentic formulas (e.g. 'حم' -> all 7 Hawamim, 'الم' -> all 6)
  const auth = AUTHENTIC_QURANIC_FAWATIH.find((f) => f.formula === trimmed);
  if (auth && auth.surahOrders && auth.surahOrders.length > 0) {
    return [...auth.surahOrders];
  }

  // 2. Tokenized multi-formula matching (e.g. "حم حم حم حم حم حم حم" or "حم حم حم عسق حم حم حم حم")
  const normalized = trimmed.replace(/حم\s+عسق/g, 'حم_عسق');
  const tokens = normalized.split(/\s+/).filter(Boolean).map((t) => t.replace(/حم_عسق/g, 'حم عسق'));
  const matchedOrders: number[] = [];
  const usedIndices = new Set<number>();
  const shuraConsumedSubs = new Set<string>(); // Tracks distinct sub-Ayat for Surah 42 (Index 22: حم آية 1, عسق آية 2)

  for (const t of tokens) {
    // Special handling for Surah 42 (Ash-Shura - Order 23 / Index 22)
    if (t === 'عسق' && !shuraConsumedSubs.has('عسق')) {
      shuraConsumedSubs.add('عسق');
      matchedOrders.push(23);
      if (shuraConsumedSubs.has('حم')) {
        usedIndices.add(22);
      }
      continue;
    }

    // General matching in QURANIC_29_SURAH_FAWATIH
    const foundIdx = QURANIC_29_SURAH_FAWATIH.findIndex((s, idx) => {
      if (usedIndices.has(idx)) return false;
      if (s.formula === t) return true;
      if (idx === 22 && s.subFormulas && s.subFormulas.includes(t) && !shuraConsumedSubs.has(t)) {
        return true;
      }
      return false;
    });

    if (foundIdx !== -1) {
      if (foundIdx === 22) {
        shuraConsumedSubs.add(t);
        if (shuraConsumedSubs.size >= 2 || t === 'حم عسق') {
          usedIndices.add(22);
        }
      } else {
        usedIndices.add(foundIdx);
      }
      matchedOrders.push(QURANIC_29_SURAH_FAWATIH[foundIdx].orderInFawatih);
    }
  }

  return Array.from(new Set(matchedOrders)).sort((a, b) => a - b);
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
  surahOrders?: number[];
  description?: string;
  hasDuplicates?: boolean;
}

/**
 * Progress payload for asynchronous Noorani processing
 */
export interface ClassifyProgressUpdate {
  percent: number;
  stage: 'idle' | 'mashriqi' | 'maghribi' | 'merging' | 'completed' | 'cancelled';
  message: string;
  foundCount: number;
}

/**
 * Helper to build merged items from raw mashriqi and maghribi matches
 */
function buildMergedNooraniItems(
  mashList: NooraniFormulaMatch[],
  magList: NooraniFormulaMatch[],
  targetMashriqi: number,
  targetMaghribi: number,
  maxResults: number,
  queryText: string = ''
): MergedNooraniFormulaItem[] {
  const formulaMap = new Map<string, {
    formula: string;
    letters: string[];
    isAuthenticQuranicFawatih: boolean;
    surahs?: string[];
    surahOrders?: number[];
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
        surahOrders: m.surahOrders,
        description: m.description,
        hasDuplicates: m.hasDuplicates,
        matchScore: m.matchScore,
      });
    } else {
      if (m.isAuthenticQuranicFawatih) existing.isAuthenticQuranicFawatih = true;
      if (m.surahs && m.surahs.length > 0) existing.surahs = m.surahs;
      if (m.surahOrders && m.surahOrders.length > 0) existing.surahOrders = m.surahOrders;
      if (m.matchScore > existing.matchScore) existing.matchScore = m.matchScore;
      if (m.description && (!existing.description || existing.description.length < m.description.length)) {
        existing.description = m.description;
      }
    }
  }

  // 1. Guaranteed Inclusion: 7 Hawamim when target is 336 (7 * 48 = 336 in both systems)
  if (targetMashriqi === 336 || targetMaghribi === 336) {
    const f7 = 'حم حم حم حم حم حم حم';
    formulaMap.set(f7, {
      formula: f7,
      letters: ['ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م'],
      isAuthenticQuranicFawatih: true,
      surahs: [
        'حم (غافر 40)',
        'حم (فصلت 41)',
        'حم (الشورى 42 - آية 1)',
        'حم (الزخرف 43)',
        'حم (الدخان 44)',
        'حم (الجاثية 45)',
        'حم (الأحقاف 46)',
      ],
      surahOrders: [21, 22, 23, 24, 25, 26, 27],
      description: 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)',
      matchScore: 1000000,
      hasDuplicates: true,
    });
  }

  // 2. Guaranteed Inclusion: 7 Hawamim + Ayn-Sin-Qaf when target is 566 (336 + 230 = 566)
  if (targetMashriqi === 566 || targetMaghribi === 566) {
    const f8 = 'حم حم حم عسق حم حم حم حم';
    formulaMap.set(f8, {
      formula: f8,
      letters: ['ح', 'م', 'ح', 'م', 'ح', 'م', 'ع', 'س', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م'],
      isAuthenticQuranicFawatih: true,
      surahs: [
        'حم (غافر 40)',
        'حم (فصلت 41)',
        'حم عسق (الشورى 42 - آية 1 و 2)',
        'حم (الزخرف 43)',
        'حم (الدخان 44)',
        'حم (الجاثية 45)',
        'حم (الأحقاف 46)',
      ],
      surahOrders: [21, 22, 23, 24, 25, 26, 27],
      description: 'آيات فواتح الحواميم الثمانية كاملة بترتيب المصحف الشريف (7 سور تشمل آيتي الشورى 1 و 2)',
      matchScore: 1000000,
      hasDuplicates: true,
    });
  }

  // 3. Guaranteed Inclusion: Single Hamim (48) with all 7 Hawamim surahs
  if (targetMashriqi === 48 || targetMaghribi === 48) {
    const f1 = 'حم';
    formulaMap.set(f1, {
      formula: f1,
      letters: ['ح', 'م'],
      isAuthenticQuranicFawatih: true,
      surahs: [
        'حم (غافر 40)',
        'حم (فصلت 41)',
        'حم (الشورى 42 - آية 1)',
        'حم (الزخرف 43)',
        'حم (الدخان 44)',
        'حم (الجاثية 45)',
        'حم (الأحقاف 46)',
      ],
      surahOrders: [21, 22, 23, 24, 25, 26, 27],
      description: 'الحواميم السبعة (7 سور متتالية في المصحف الشريف تبدأ بـ حم، ومنها الشورى آية 1)',
      matchScore: 1000000,
      hasDuplicates: false,
    });
  }

  // 4. If queryText is composed of fawatih tokens, guarantee it as an authentic entry
  if (queryText && queryText.trim()) {
    const qTrim = queryText.trim();
    const qTokens = qTrim.split(/\s+/).filter(Boolean);
    const KNOWN_FAWATIH_TOKENS = new Set([
      'حم', 'الم', 'الر', 'طسم', 'طس', 'طه', 'يس', 'ص', 'ق', 'ن', 'عسق', 'كهيعص', 'المص', 'المر', 'حم_عسق'
    ]);
    if (qTokens.length > 0 && qTokens.every((t) => KNOWN_FAWATIH_TOKENS.has(t) || t === 'حم')) {
      const qLetters = qTrim.replace(/\s+/g, '').split('');
      const qSumMash = qLetters.reduce((acc, c) => acc + (MASHRIQI_VALUES[c] ?? 0), 0);
      const qSumMag = qLetters.reduce((acc, c) => acc + (MAGHRIBI_VALUES[c] ?? 0), 0);
      if ((targetMashriqi > 0 && qSumMash === targetMashriqi) || (targetMaghribi > 0 && qSumMag === targetMaghribi)) {
        const qOrders = inferSurahOrdersFromFormula(qTrim);
        formulaMap.set(qTrim, {
          formula: qTrim,
          letters: qLetters,
          isAuthenticQuranicFawatih: true,
          surahOrders: qOrders,
          description: qTrim === 'حم حم حم حم حم حم حم'
            ? 'الحواميم السبع المتتالية في القرآن الكريم (7 سور تبدأ بـ حم متصلة الترتيب مصداقاً للسبع المثاني)'
            : `تركيبة فواتح قرآنية مطابقة لعبارة البحث [${qTrim}] (${qOrders.length} سور)`,
          matchScore: 1000000,
          hasDuplicates: new Set(qLetters).size !== qLetters.length,
        });
      }
    }
  }

  const mergedItems: MergedNooraniFormulaItem[] = [];

  for (const [formulaStr, item] of formulaMap.entries()) {
    const sumMash = item.letters.reduce((acc, c) => acc + (MASHRIQI_VALUES[c] ?? 0), 0);
    const sumMag = item.letters.reduce((acc, c) => acc + (MAGHRIBI_VALUES[c] ?? 0), 0);

    const matchesMash = (targetMashriqi > 0 && sumMash === targetMashriqi);
    const matchesMag = (targetMaghribi > 0 && sumMag === targetMaghribi);

    if (!matchesMash && !matchesMag) continue;

    let system: 'both' | 'dual_match' | 'mashriqi' | 'maghribi';
    let systemLabel: 'مشترك' | 'مطابق للنظامين' | 'شرقي' | 'غربي';
    let displaySum: string;

    if (matchesMash && matchesMag) {
      if (sumMash === sumMag) {
        system = 'both';
        systemLabel = 'مشترك';
        displaySum = `${sumMash}`;
      } else {
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
    const surahOrders = item.surahOrders && item.surahOrders.length > 0
      ? item.surahOrders
      : inferSurahOrdersFromFormula(formulaStr);

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
      surahOrders,
      description: item.description,
      hasDuplicates: item.hasDuplicates,
    });
  }

  // Sort merged items: Exact query match or authentic combinations with highest matchScore first
  const cleanQ = queryText.trim();
  mergedItems.sort((a, b) => {
    if (cleanQ && a.formula === cleanQ) return -1;
    if (cleanQ && b.formula === cleanQ) return 1;
    if (a.isAuthenticQuranicFawatih && !b.isAuthenticQuranicFawatih) return -1;
    if (!a.isAuthenticQuranicFawatih && b.isAuthenticQuranicFawatih) return 1;
    const countA = a.surahOrders?.length || 0;
    const countB = b.surahOrders?.length || 0;
    if (countA !== countB) return countB - countA;
    const sysPriority = (s: string) => (s === 'dual_match' ? 3 : s === 'both' ? 2 : 1);
    if (sysPriority(b.system) !== sysPriority(a.system)) {
      return sysPriority(b.system) - sysPriority(a.system);
    }
    return a.letters.length - b.letters.length;
  });

  return mergedItems.slice(0, maxResults);
}

/**
 * Rigorous Multi-System Noorani Formula Classifier & Merger (Synchronous)
 */
export function classifyAndMergeNooraniFormulas(
  targetMashriqi: number,
  targetMaghribi: number,
  options: {
    uniqueLettersOnly?: boolean;
    maxResults?: number;
    algorithmId?: NooraniAlgorithmId;
    queryText?: string;
    shouldAbort?: () => boolean;
  } = {}
): MergedNooraniFormulaItem[] {
  const { uniqueLettersOnly = false, maxResults = 80, algorithmId = 1, queryText = '', shouldAbort } = options;

  if (shouldAbort && shouldAbort()) return [];

  // Search Mashriqi formulas for targetMashriqi
  const mashList = targetMashriqi > 0 ? findNooraniCombinationsByAlgorithm(algorithmId, targetMashriqi, MASHRIQI_VALUES, {
    maxResults: 70,
    uniqueLettersOnly,
    queryText,
    shouldAbort,
  }) : [];

  if (shouldAbort && shouldAbort()) return [];

  // Search Maghribi formulas for targetMaghribi
  const magList = targetMaghribi > 0 ? findNooraniCombinationsByAlgorithm(algorithmId, targetMaghribi, MAGHRIBI_VALUES, {
    maxResults: 70,
    uniqueLettersOnly,
    queryText,
    shouldAbort,
  }) : [];

  return buildMergedNooraniItems(mashList, magList, targetMashriqi, targetMaghribi, maxResults, queryText);
}

/**
 * Non-Blocking Asynchronous Multi-System Noorani Formula Classifier
 * Yields periodically to the browser's event loop with progress reporting and cancellation support.
 * Guarantees 60fps UI responsiveness without ever triggering browser "Page Unresponsive" dialogs.
 */
export async function classifyAndMergeNooraniFormulasAsync(
  targetMashriqi: number,
  targetMaghribi: number,
  options: {
    uniqueLettersOnly?: boolean;
    maxResults?: number;
    algorithmId?: NooraniAlgorithmId;
    queryText?: string;
    onProgress?: (progress: ClassifyProgressUpdate) => void;
    signal?: AbortSignal;
  } = {}
): Promise<MergedNooraniFormulaItem[]> {
  const {
    uniqueLettersOnly = false,
    maxResults = 80,
    algorithmId = 1,
    queryText = '',
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) return [];
  if (targetMashriqi <= 0 && targetMaghribi <= 0) return [];

  // Phase 1: Initializing
  onProgress?.({
    percent: 15,
    stage: 'mashriqi',
    message: 'جاري فحص توافقات النظام المشرقي...',
    foundCount: 0,
  });

  // Cooperative yield so the browser paints the progress bar
  await new Promise((resolve) => setTimeout(resolve, 15));
  if (signal?.aborted) return [];

  // Phase 2: Mashriqi Search
  const mashList = targetMashriqi > 0
    ? findNooraniCombinationsByAlgorithm(algorithmId, targetMashriqi, MASHRIQI_VALUES, {
        maxResults: 70,
        uniqueLettersOnly,
        queryText,
        shouldAbort: () => !!signal?.aborted,
      })
    : [];

  if (signal?.aborted) return [];

  // Phase 3: Maghribi Search
  onProgress?.({
    percent: 55,
    stage: 'maghribi',
    message: 'جاري فحص توافقات النظام المغربي...',
    foundCount: mashList.length,
  });

  await new Promise((resolve) => setTimeout(resolve, 15));
  if (signal?.aborted) return [];

  const magList = targetMaghribi > 0
    ? findNooraniCombinationsByAlgorithm(algorithmId, targetMaghribi, MAGHRIBI_VALUES, {
        maxResults: 70,
        uniqueLettersOnly,
        queryText,
        shouldAbort: () => !!signal?.aborted,
      })
    : [];

  if (signal?.aborted) return [];

  // Phase 4: Merging and sequence analysis
  onProgress?.({
    percent: 85,
    stage: 'merging',
    message: 'مطابقة التراكيب المشتركة وترتيب السور المصحفية...',
    foundCount: mashList.length + magList.length,
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  if (signal?.aborted) return [];

  const merged = buildMergedNooraniItems(mashList, magList, targetMashriqi, targetMaghribi, maxResults, queryText);

  // Phase 5: Completed
  onProgress?.({
    percent: 100,
    stage: 'completed',
    message: `اكتملت المعالجة بنجاح (تم العثور على ${merged.length} تركيبة)`,
    foundCount: merged.length,
  });

  return merged;
}

