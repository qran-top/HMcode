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

export const CIPHER_LAYERS: LayerInfo[] = [
  {
    layer: 1,
    cipherLetters: ['ك', 'ر'],
    arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
    description: 'الطبقة الأولى: ك ر المقابلة لـ (ذ ض ظ غ)',
  },
  {
    layer: 2,
    cipherLetters: ['ط', 'ه'],
    arabicLetters: ['ش', 'ت', 'ث', 'خ'],
    description: 'الطبقة الثانية: ط ه المقابلة لـ (ش ت ث خ)',
  },
  {
    layer: 3,
    cipherLetters: ['ا', 'ل'],
    arabicLetters: ['ف', 'ص', 'ق', 'ر'],
    description: 'الطبقة الثالثة: ا ل المقابلة لـ (ف ص ق ر)',
  },
  {
    layer: 4,
    cipherLetters: ['ص', 'ي'],
    arabicLetters: ['م', 'ن', 'س', 'ع'],
    description: 'الطبقة الرابعة: ص ي المقابلة لـ (م ن س ع)',
  },
  {
    layer: 5,
    cipherLetters: ['ع', 'س'],
    arabicLetters: ['ط', 'ي', 'ك', 'ل'],
    description: 'الطبقة الخامسة: ع س المقابلة لـ (ط ي ك ل)',
  },
  {
    layer: 6,
    cipherLetters: ['ح', 'م'],
    arabicLetters: ['ه', 'و', 'ز', 'ح'],
    description: 'الطبقة السادسة: ح م المقابلة لـ (ه و ز ح)',
  },
  {
    layer: 7,
    cipherLetters: ['ن', 'ق'],
    arabicLetters: ['أ', 'ب', 'ج', 'د'],
    description: 'الطبقة السابعة: ن ق المقابلة لـ (أ ب ج د)',
  },
];

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
  if (['أ', 'إ', 'آ', 'ا', 'ء', 'ى'].includes(c)) return 'أ'; // ى and ء mapped to أ (Layer 7) phonetically
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

export function findLayerForChar(char: string): LayerInfo | null {
  const norm = normalizeArabicChar(char);
  for (const l of CIPHER_LAYERS) {
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

export function analyzeWord(text: string): EncryptedLetterDetail[] {
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

    const layer = findLayerForChar(char);
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
      prob1: layer.cipherLetters[0],
      prob2: layer.cipherLetters[1],
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

export function decryptCipherChar(char: string): DecryptedLetterDetail {
  const matchingLayers = CIPHER_LAYERS.filter((l) =>
    l.cipherLetters.includes(char)
  );

  const possibleLetters = Array.from(
    new Set(matchingLayers.flatMap((l) => l.arabicLetters))
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


