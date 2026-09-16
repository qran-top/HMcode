export interface LayerInfo {
  layer: number;
  cipherLetters: [string, string];
  arabicLetters: [string, string, string, string];
  description: string;
}

export interface LayerColorTheme {
  name: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  badgeBg: string;
  badgeText: string;
  lightBg: string;
  lightBorder: string;
  accentHex: string;
}

// 7 Rainbow / Spectrum colors with high WCAG contrast
export const LAYER_RAINBOW_COLORS: Record<number, LayerColorTheme> = {
  1: {
    name: 'أحمر',
    activeBg: 'bg-red-600',
    activeText: 'text-white',
    activeBorder: 'border-red-700',
    badgeBg: 'bg-red-700',
    badgeText: 'text-white',
    lightBg: 'bg-red-50',
    lightBorder: 'border-red-200',
    accentHex: '#dc2626',
  },
  2: {
    name: 'برتقالي',
    activeBg: 'bg-orange-500',
    activeText: 'text-white',
    activeBorder: 'border-orange-600',
    badgeBg: 'bg-orange-600',
    badgeText: 'text-white',
    lightBg: 'bg-orange-50',
    lightBorder: 'border-orange-200',
    accentHex: '#f97316',
  },
  3: {
    name: 'أصفر',
    activeBg: 'bg-amber-400',
    activeText: 'text-stone-950 font-black',
    activeBorder: 'border-amber-500',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-stone-950 font-bold',
    lightBg: 'bg-amber-50',
    lightBorder: 'border-amber-200',
    accentHex: '#fbbf24',
  },
  4: {
    name: 'أخضر',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    activeBorder: 'border-emerald-700',
    badgeBg: 'bg-emerald-700',
    badgeText: 'text-white',
    lightBg: 'bg-emerald-50',
    lightBorder: 'border-emerald-200',
    accentHex: '#059669',
  },
  5: {
    name: 'أزرق سماوي',
    activeBg: 'bg-cyan-600',
    activeText: 'text-white',
    activeBorder: 'border-cyan-700',
    badgeBg: 'bg-cyan-700',
    badgeText: 'text-white',
    lightBg: 'bg-cyan-50',
    lightBorder: 'border-cyan-200',
    accentHex: '#0891b2',
  },
  6: {
    name: 'نيلي',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    activeBorder: 'border-blue-700',
    badgeBg: 'bg-blue-700',
    badgeText: 'text-white',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-200',
    accentHex: '#2563eb',
  },
  7: {
    name: 'بنفسجي',
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
    activeBorder: 'border-purple-700',
    badgeBg: 'bg-purple-700',
    badgeText: 'text-white',
    lightBg: 'bg-purple-50',
    lightBorder: 'border-purple-200',
    accentHex: '#9333ea',
  },
};

export const DEFAULT_CIPHER_LAYERS: LayerInfo[] = [
  {
    layer: 7,
    cipherLetters: ['ن', 'ق'],
    arabicLetters: ['أ', 'ب', 'ج', 'د'],
    description: 'الطبقة السابعة: ن ق المقابلة لـ (أ ب ج د)',
  },
  {
    layer: 6,
    cipherLetters: ['ح', 'م'],
    arabicLetters: ['ه', 'و', 'ز', 'ح'],
    description: 'الطبقة السادسة: ح م المقابلة لـ (ه و ز ح)',
  },
  {
    layer: 5,
    cipherLetters: ['ع', 'س'],
    arabicLetters: ['ط', 'ي', 'ك', 'ل'],
    description: 'الطبقة الخامسة: ع س المقابلة لـ (ط ي ك ل)',
  },
  {
    layer: 4,
    cipherLetters: ['ص', 'ي'],
    arabicLetters: ['م', 'ن', 'س', 'ع'],
    description: 'الطبقة الرابعة: ص ي المقابلة لـ (م ن س ع)',
  },
  {
    layer: 3,
    cipherLetters: ['ا', 'ل'],
    arabicLetters: ['ف', 'ص', 'ق', 'ر'],
    description: 'الطبقة الثالثة: ا ل المقابلة لـ (ف ص ق ر)',
  },
  {
    layer: 2,
    cipherLetters: ['ط', 'ه'],
    arabicLetters: ['ش', 'ت', 'ث', 'خ'],
    description: 'الطبقة الثانية: ط ه المقابلة لـ (ش ت ث خ)',
  },
  {
    layer: 1,
    cipherLetters: ['ك', 'ر'],
    arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
    description: 'الطبقة الأولى: ك ر المقابلة لـ (ذ ض ظ غ)',
  },
];

export const CIPHER_LAYERS: LayerInfo[] = DEFAULT_CIPHER_LAYERS;

export const ALL_ARABIC_LETTERS_28: string[] = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق',
  'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
];

export const PRESET_TABLES = {
  defaultQuranic: {
    id: 'defaultQuranic',
    name: 'جدول الفرقان المعتمد (الافتراضي)',
    description: 'الطبقة 7 (أ ب ج د) حتى الطبقة 1 (ذ ض ظ غ)',
    createLayers: (): LayerInfo[] => JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)),
  },
  abjadAscending: {
    id: 'abjadAscending',
    name: 'الترتيب الأبجدي الصاعد',
    description: 'الطبقة 1 (أ ب ج د) صعوداً إلى الطبقة 7 (ذ ض ظ غ)',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: ['ن', 'ق'], arabicLetters: ['ذ', 'ض', 'ظ', 'غ'], description: 'الطبقة 7: ذ ض ظ غ' },
      { layer: 6, cipherLetters: ['ح', 'م'], arabicLetters: ['ش', 'ت', 'ث', 'خ'], description: 'الطبقة 6: ش ت ث خ' },
      { layer: 5, cipherLetters: ['ع', 'س'], arabicLetters: ['ف', 'ص', 'ق', 'ر'], description: 'الطبقة 5: ف ص ق ر' },
      { layer: 4, cipherLetters: ['ص', 'ي'], arabicLetters: ['م', 'ن', 'س', 'ع'], description: 'الطبقة 4: م ن س ع' },
      { layer: 3, cipherLetters: ['ا', 'ل'], arabicLetters: ['ط', 'ي', 'ك', 'ل'], description: 'الطبقة 3: ط ي ك ل' },
      { layer: 2, cipherLetters: ['ط', 'ه'], arabicLetters: ['ه', 'و', 'ز', 'ح'], description: 'الطبقة 2: ه و ز ح' },
      { layer: 1, cipherLetters: ['ك', 'ر'], arabicLetters: ['أ', 'ب', 'ج', 'د'], description: 'الطبقة 1: أ ب ج د' },
    ],
  },
  alphabeticalHijai: {
    id: 'alphabeticalHijai',
    name: 'الترتيب الهجائي الألفبائي',
    description: 'من (أ ب ت ث) في الطبقة 7 حتى (ن هـ و ي) في الطبقة 1',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: ['ن', 'ق'], arabicLetters: ['أ', 'ب', 'ت', 'ث'], description: 'الطبقة 7: أ ب ت ث' },
      { layer: 6, cipherLetters: ['ح', 'م'], arabicLetters: ['ج', 'ح', 'خ', 'د'], description: 'الطبقة 6: ج ح خ د' },
      { layer: 5, cipherLetters: ['ع', 'س'], arabicLetters: ['ذ', 'ر', 'ز', 'س'], description: 'الطبقة 5: ذ ر ز س' },
      { layer: 4, cipherLetters: ['ص', 'ي'], arabicLetters: ['ش', 'ص', 'ض', 'ط'], description: 'الطبقة 4: ش ص ض ط' },
      { layer: 3, cipherLetters: ['ا', 'ل'], arabicLetters: ['ظ', 'ع', 'غ', 'ف'], description: 'الطبقة 3: ظ ع غ ف' },
      { layer: 2, cipherLetters: ['ط', 'ه'], arabicLetters: ['ق', 'ك', 'ل', 'م'], description: 'الطبقة 2: ق ك ل م' },
      { layer: 1, cipherLetters: ['ك', 'ر'], arabicLetters: ['ن', 'ه', 'و', 'ي'], description: 'الطبقة 1: ن ه و ي' },
    ],
  },
  emptyTable: {
    id: 'emptyTable',
    name: 'جدول فارغ تماماً (إنشاء مخصص من الصفر)',
    description: 'تفريغ جميع الخانات الـ 28 لتوزيع الحروف يدوياً',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: ['ن', 'ق'], arabicLetters: ['', '', '', ''], description: 'الطبقة 7' },
      { layer: 6, cipherLetters: ['ح', 'م'], arabicLetters: ['', '', '', ''], description: 'الطبقة 6' },
      { layer: 5, cipherLetters: ['ع', 'س'], arabicLetters: ['', '', '', ''], description: 'الطبقة 5' },
      { layer: 4, cipherLetters: ['ص', 'ي'], arabicLetters: ['', '', '', ''], description: 'الطبقة 4' },
      { layer: 3, cipherLetters: ['ا', 'ل'], arabicLetters: ['', '', '', ''], description: 'الطبقة 3' },
      { layer: 2, cipherLetters: ['ط', 'ه'], arabicLetters: ['', '', '', ''], description: 'الطبقة 2' },
      { layer: 1, cipherLetters: ['ك', 'ر'], arabicLetters: ['', '', '', ''], description: 'الطبقة 1' },
    ],
  },
};

export const VALID_CIPHER_LETTERS = new Set<string>([
  'ك', 'ر',
  'ط', 'ه',
  'ا', 'ل',
  'ص', 'ي',
  'ع', 'س',
  'ح', 'م',
  'ن', 'ق',
]);

// Normalize Arabic letters (stripping diacritics, unifying forms of alef, etc.)
export function normalizeArabicChar(char: string): string {
  // Strip Tashkeel
  const stripped = char.replace(/[\u064B-\u065F\u0670]/g, '');
  if (!stripped) return '';

  const c = stripped[0];
  if (['أ', 'إ', 'آ', 'ا', 'ء', 'ى'].includes(c)) return 'أ'; // ى and ء mapped to أ (Layer 1) phonetically
  if (c === 'ة') return 'ه';
  if (c === 'ؤ') return 'و';
  if (c === 'ئ') return 'ي';
  return c;
}

export function getCipherBaseString(word: string): string {
  return Array.from(cleanText(word)).map(normalizeArabicChar).join('');
}

export function cleanText(text: string): string {
  // Remove Tashkeel from full string
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

export interface EncryptedLetterDetail {
  originalChar: string;
  normalizedChar: string;
  layer: LayerInfo | null;
  prob1: string;
  prob2: string;
  isSpecialOrSpace: boolean;
}

export function findLayerForChar(char: string, layers: LayerInfo[] = CIPHER_LAYERS): LayerInfo | null {
  const norm = normalizeArabicChar(char);
  for (const l of layers) {
    if (l.arabicLetters.includes(norm)) {
      return l;
    }
    // Also check raw char if it matched 'ا'
    if (char === 'ا' && l.arabicLetters.includes('أ')) {
      return l;
    }
  }
  return null;
}

export function analyzeWord(text: string, layers: LayerInfo[] = CIPHER_LAYERS): EncryptedLetterDetail[] {
  const chars = Array.from(cleanText(text));
  return chars.map((char) => {
    if (char === ' ' || char === '\n' || char === '\t') {
      return {
        originalChar: char,
        normalizedChar: char,
        layer: null,
        prob1: char,
        prob2: char,
        isSpecialOrSpace: true,
      };
    }

    const layer = findLayerForChar(char, layers);
    if (!layer) {
      return {
        originalChar: char,
        normalizedChar: char,
        layer: null,
        prob1: char,
        prob2: char,
        isSpecialOrSpace: true,
      };
    }

    return {
      originalChar: char,
      normalizedChar: normalizeArabicChar(char),
      layer,
      prob1: layer.cipherLetters[0] || '؟',
      prob2: layer.cipherLetters[1] || layer.cipherLetters[0] || '؟',
      isSpecialOrSpace: false,
    };
  });
}

// Generate all combinations (up to a safe limit), optionally omitting spaces
export function getAllCombinations(
  details: EncryptedLetterDetail[],
  maxCombinations = 500,
  omitSpaces = true
): string[] {
  const meaningful = details.filter((d) => !d.isSpecialOrSpace);
  if (meaningful.length === 0) return [];

  const items = omitSpaces
    ? details.filter((d) => d.originalChar !== ' ' && d.originalChar !== '\n' && d.originalChar !== '\t')
    : details;

  if (items.length === 0) return [];

  const results: string[] = [];

  function backtrack(index: number, currentStr: string) {
    if (results.length >= maxCombinations) return;
    if (index === items.length) {
      results.push(currentStr);
      return;
    }

    const item = items[index];
    if (item.isSpecialOrSpace || !item.layer) {
      backtrack(index + 1, currentStr + item.originalChar);
    } else {
      // Choice 1
      backtrack(index + 1, currentStr + item.prob1);
      // Choice 2
      backtrack(index + 1, currentStr + item.prob2);
    }
  }

  backtrack(0, '');
  return results;
}

export interface DecryptedLetterDetail {
  cipherChar: string;
  matchedLayers: LayerInfo[];
  possibleLetters: string[];
}

export function decryptCipherChar(char: string, layers: LayerInfo[] = CIPHER_LAYERS): DecryptedLetterDetail {
  const matchingLayers = layers.filter((l) =>
    l.cipherLetters.includes(char)
  );

  const possibleLetters = Array.from(
    new Set(matchingLayers.flatMap((l) => l.arabicLetters).filter(Boolean))
  );

  return {
    cipherChar: char,
    matchedLayers: matchingLayers,
    possibleLetters,
  };
}

export function getDecryptionCombinations(
  items: { char: string; isSpace: boolean; candidates: string[] }[],
  maxCombinations = 500,
  omitSpaces = true
): string[] {
  const meaningful = items.filter((d) => !d.isSpace && d.candidates.length > 0);
  if (meaningful.length === 0) return [];

  const candidateItems = omitSpaces ? meaningful : items;
  const results: string[] = [];

  function backtrack(index: number, currentStr: string) {
    if (results.length >= maxCombinations) return;
    if (index === candidateItems.length) {
      results.push(currentStr);
      return;
    }

    const item = candidateItems[index];
    if (item.isSpace || item.candidates.length === 0) {
      backtrack(index + 1, currentStr + item.char);
    } else {
      for (const cand of item.candidates) {
        if (results.length >= maxCombinations) break;
        backtrack(index + 1, currentStr + cand);
      }
    }
  }

  backtrack(0, '');
  return results;
}

// -------------------------------------------------------------------
// Quranic Initials / Noorani Letters & Words Dictionary
// -------------------------------------------------------------------

// The 14 unique Noorani / Quranic Initial Letters: (نص حكيم قاطع له سر)
export const NOORANI_LETTERS = ['ن', 'ص', 'ح', 'ك', 'ي', 'م', 'ق', 'ا', 'ط', 'ع', 'ل', 'ه', 'س', 'ر'];
export const NOORANI_LETTERS_SET = new Set(NOORANI_LETTERS);

// The 14 Quranic Opening Words / Combinations (الفواتح القرآنية المقطعة):
export const QURANIC_WORDS = [
  'الم',
  'المص',
  'الر',
  'المر',
  'كهيعص',
  'طه',
  'طسم',
  'طس',
  'يس',
  'ص',
  'حم',
  'عسق',
  'ق',
  'ن',
];

export const QURANIC_WORDS_SET = new Set(QURANIC_WORDS);

export interface QuranicSegment {
  text: string;
  isQuranicWord: boolean; // Matches one of the 14 opening words (e.g., حم, طسم, كهيعص)
  isMultiLetter: boolean; // Has length >= 2
  isNooraniChar: boolean; // Matches individual Noorani letter
}

export interface QuranicSegmentationResult {
  score: number;
  multiWordCount: number;
  quranicCoveredChars: number;
  segments: QuranicSegment[];
  formattedDisplay: string;
}

/**
 * Segments any Arabic text into Quranic Initial Words (الم، طسم، حم، كهيعص...) as much as possible
 * using dynamic programming with preference for longer Quranic multi-letter words.
 */
export function segmentIntoQuranicWords(text: string): QuranicSegmentationResult {
  const n = text.length;
  if (n === 0) {
    return {
      score: 0,
      multiWordCount: 0,
      quranicCoveredChars: 0,
      segments: [],
      formattedDisplay: '',
    };
  }

  const memo = new Map<number, {
    score: number;
    multiWordCount: number;
    quranicCoveredChars: number;
    segments: QuranicSegment[];
  }>();

  function dp(i: number): {
    score: number;
    multiWordCount: number;
    quranicCoveredChars: number;
    segments: QuranicSegment[];
  } {
    if (i >= n) {
      return { score: 0, multiWordCount: 0, quranicCoveredChars: 0, segments: [] };
    }
    if (memo.has(i)) {
      return memo.get(i)!;
    }

    let best: {
      score: number;
      multiWordCount: number;
      quranicCoveredChars: number;
      segments: QuranicSegment[];
    } | null = null;

    // 1. Try matching any of the 14 Quranic Opening Words at position i
    for (const qw of QURANIC_WORDS) {
      if (text.startsWith(qw, i)) {
        const next = dp(i + qw.length);
        const isMulti = qw.length > 1;
        // Prioritize longer multi-letter Quranic words heavily (e.g. كهيعص=250, المص=160, طسم=90, حم=40)
        const wordWeight = isMulti ? (qw.length * qw.length * 15) : 3;
        const score = wordWeight + next.score;
        const multiWordCount = (isMulti ? 1 : 0) + next.multiWordCount;
        const quranicCoveredChars = qw.length + next.quranicCoveredChars;

        if (!best || score > best.score) {
          best = {
            score,
            multiWordCount,
            quranicCoveredChars,
            segments: [
              {
                text: qw,
                isQuranicWord: true,
                isMultiLetter: isMulti,
                isNooraniChar: true,
              },
              ...next.segments,
            ],
          };
        }
      }
    }

    // 2. Fallback to single character
    const singleChar = text[i];
    const isSingleNoorani = NOORANI_LETTERS_SET.has(singleChar);
    const isSingleQuranicWord = QURANIC_WORDS_SET.has(singleChar);
    const nextSingle = dp(i + 1);
    const singleScore = (isSingleNoorani ? 2 : 0) + nextSingle.score;

    if (!best || singleScore > best.score) {
      best = {
        score: singleScore,
        multiWordCount: nextSingle.multiWordCount,
        quranicCoveredChars: (isSingleNoorani ? 1 : 0) + nextSingle.quranicCoveredChars,
        segments: [
          {
            text: singleChar,
            isQuranicWord: isSingleQuranicWord,
            isMultiLetter: false,
            isNooraniChar: isSingleNoorani,
          },
          ...nextSingle.segments,
        ],
      };
    }

    memo.set(i, best);
    return best;
  }

  const result = dp(0);
  const formattedDisplay = result.segments.map((s) => s.text).join(' - ');

  return {
    ...result,
    formattedDisplay,
  };
}


