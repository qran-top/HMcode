export interface LayerInfo {
  layer: number;
  cipherLetters: [string, string];
  arabicLetters: [string, string, string, string];
  description: string;
}

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

// Normalize Arabic letters (stripping diacritics, unifying forms of alef, etc.)
export function normalizeArabicChar(char: string): string {
  // Strip Tashkeel
  const stripped = char.replace(/[\u064B-\u065F\u0670]/g, '');
  if (!stripped) return '';

  const c = stripped[0];
  if (['أ', 'إ', 'آ', 'ا'].includes(c)) return 'أ';
  if (c === 'ى') return 'ي';
  if (c === 'ة') return 'ه';
  if (c === 'ؤ') return 'و';
  if (c === 'ئ') return 'ي';
  return c;
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

// Generate all combinations (up to a safe limit)
export function getAllCombinations(
  details: EncryptedLetterDetail[],
  maxCombinations = 128
): string[] {
  const filtered = details.filter((d) => !d.isSpecialOrSpace);
  if (filtered.length === 0) return [];
  if (filtered.length > 12) {
    // If word is too long (2^13+ is too big), we cap or sample
    // We will generate the 1st maxCombinations
  }

  const results: string[] = [];

  function backtrack(index: number, currentStr: string) {
    if (results.length >= maxCombinations) return;
    if (index === details.length) {
      results.push(currentStr);
      return;
    }

    const item = details[index];
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
