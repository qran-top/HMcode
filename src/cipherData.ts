export interface LayerInfo {
  layer: number;
  cipherLetters: string[];
  arabicLetters: string[];
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
    activeText: 'text-stone-950 font-medium',
    activeBorder: 'border-amber-500',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-stone-950 font-medium',
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

export function getLayerColor(layerNum: number): LayerColorTheme {
  if (LAYER_RAINBOW_COLORS[layerNum]) {
    return LAYER_RAINBOW_COLORS[layerNum];
  }
  const key = (((Math.abs(layerNum) - 1) % 7) + 1);
  return LAYER_RAINBOW_COLORS[key] || LAYER_RAINBOW_COLORS[1];
}

export function createNineCipherSlots(c1 = '', c2 = ''): string[] {
  return [c1, c2].filter(Boolean);
}

export function createNineCipherSlotsFromList(chars: string[]): string[] {
  const flatChars: string[] = [];
  chars.forEach((item) => {
    if (!item) return;
    const trimmed = String(item).trim();
    // Decompose any multi-character string into individual Arabic characters
    const singleLetters = trimmed.replace(/[^ء-ي]/g, '').split('');
    if (singleLetters.length > 0) {
      flatChars.push(...singleLetters);
    }
  });
  return flatChars;
}

export const DEFAULT_CIPHER_LAYERS: LayerInfo[] = [
  {
    layer: 1,
    cipherLetters: createNineCipherSlotsFromList(['ن', 'ص']),
    arabicLetters: ['ا', 'ب', 'ج', 'د'],
    description: 'السماء 1: ن ص | ا ب ج د',
  },
  {
    layer: 2,
    cipherLetters: createNineCipherSlotsFromList(['ح', 'ك']),
    arabicLetters: ['ه', 'و', 'ز', 'ح'],
    description: 'السماء 2: ح ك | ه و ز ح',
  },
  {
    layer: 3,
    cipherLetters: createNineCipherSlotsFromList(['ي', 'م']),
    arabicLetters: ['ط', 'ي', 'ك', 'ل'],
    description: 'السماء 3: ي م | ط ي ك ل',
  },
  {
    layer: 4,
    cipherLetters: createNineCipherSlotsFromList(['ق', 'ا']),
    arabicLetters: ['م', 'ن', 'س', 'ع'],
    description: 'السماء 4: ق ا | م ن س ع',
  },
  {
    layer: 5,
    cipherLetters: createNineCipherSlotsFromList(['ط', 'ع']),
    arabicLetters: ['ف', 'ص', 'ق', 'ر'],
    description: 'السماء 5: ط ع | ف ص ق ر',
  },
  {
    layer: 6,
    cipherLetters: createNineCipherSlotsFromList(['ل', 'ه']),
    arabicLetters: ['ش', 'ت', 'ث', 'خ'],
    description: 'السماء 6: ل ه | ش ت ث خ',
  },
  {
    layer: 7,
    cipherLetters: createNineCipherSlotsFromList(['س', 'ر']),
    arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
    description: 'السماء 7: س ر | ذ ض ظ غ',
  },
];

export const BENCHMARK_TABLE_NAME = 'سماء: نصحك - لهسر × أرض: أبجد - ذضظغ';

export const CIPHER_LAYERS: LayerInfo[] = DEFAULT_CIPHER_LAYERS;

export const ALL_ARABIC_LETTERS_28: string[] = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق',
  'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
];

export interface ArabicDistributionPreset {
  id: string;
  name: string;
  badge?: string;
  description: string;
  arabicLayers: { layer: number; letters: [string, string, string, string] }[];
}

export interface NooraniDistributionPreset {
  id: string;
  name: string;
  badge?: string;
  description: string;
  nooraniLayers: { layer: number; cipherLetters: string[]; description?: string }[];
}

export const ARABIC_PRESETS: Record<string, ArabicDistributionPreset> = {
  arabic_1_az: {
    id: 'arabic_1_az',
    name: 'أبجد - ذضظغ',
    badge: '1: أبجد - ذضظغ',
    description: 'أرض 1: أ ب ج د ... ذ ض ظ غ (أبجد - ذضظغ)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ب', 'ج', 'د'] },
      { layer: 2, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 3, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'س', 'ع'] },
      { layer: 5, letters: ['ف', 'ص', 'ق', 'ر'] },
      { layer: 6, letters: ['ش', 'ت', 'ث', 'خ'] },
      { layer: 7, letters: ['ذ', 'ض', 'ظ', 'غ'] },
    ],
  },
  arabic_2_az: {
    id: 'arabic_2_az',
    name: 'أبجد - ذظغش',
    badge: '2: أبجد - ذظغش',
    description: 'أرض 2: أ ب ج د ... ذ ظ غ ش (أبجد - ذظغش)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ب', 'ج', 'د'] },
      { layer: 2, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 3, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'ص', 'ع'] },
      { layer: 5, letters: ['ف', 'ض', 'ق', 'ر'] },
      { layer: 6, letters: ['س', 'ت', 'ث', 'خ'] },
      { layer: 7, letters: ['ذ', 'ظ', 'غ', 'ش'] },
    ],
  },
  arabic_3_an: {
    id: 'arabic_3_an',
    name: 'أبتث - نهوي',
    badge: '3: أبتث - نهوي',
    description: 'أرض 3: أ ب ت ث ... ن ه و ي (أبتث - نهوي)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ب', 'ت', 'ث'] },
      { layer: 2, letters: ['ج', 'ح', 'خ', 'د'] },
      { layer: 3, letters: ['ذ', 'ر', 'ز', 'س'] },
      { layer: 4, letters: ['ش', 'ص', 'ض', 'ط'] },
      { layer: 5, letters: ['ظ', 'ع', 'غ', 'ف'] },
      { layer: 6, letters: ['ق', 'ك', 'ل', 'م'] },
      { layer: 7, letters: ['ن', 'ه', 'و', 'ي'] },
    ],
  },
  arabic_4_as: {
    id: 'arabic_4_as',
    name: 'أبتث - شهوي',
    badge: '4: أبتث - شهوي',
    description: 'أرض 4: أ ب ت ث ... ش ه و ي (أبتث - شهوي)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ب', 'ت', 'ث'] },
      { layer: 2, letters: ['ج', 'ح', 'خ', 'د'] },
      { layer: 3, letters: ['ذ', 'ر', 'ز', 'ط'] },
      { layer: 4, letters: ['ظ', 'ك', 'ل', 'م'] },
      { layer: 5, letters: ['ن', 'ص', 'ض', 'ع'] },
      { layer: 6, letters: ['غ', 'ف', 'ق', 'س'] },
      { layer: 7, letters: ['ش', 'ه', 'و', 'ي'] },
    ],
  },
  arabic_5_am: {
    id: 'arabic_5_am',
    name: 'عحهخ - مويأ',
    badge: '5: عحهخ - مويأ',
    description: 'أرض 5: ع ح ه خ ... م و ي أ (عحهخ - مويأ)',
    arabicLayers: [
      { layer: 1, letters: ['ع', 'ح', 'ه', 'خ'] },
      { layer: 2, letters: ['غ', 'ق', 'ك', 'ج'] },
      { layer: 3, letters: ['ش', 'ض', 'ص', 'س'] },
      { layer: 4, letters: ['ز', 'ط', 'د', 'ت'] },
      { layer: 5, letters: ['ظ', 'ذ', 'ث', 'ر'] },
      { layer: 6, letters: ['ل', 'ن', 'ف', 'ب'] },
      { layer: 7, letters: ['م', 'و', 'ي', 'أ'] },
    ],
  },
  arabic_6_af: {
    id: 'arabic_6_af',
    name: 'أهعح - فبمو',
    badge: '6: أهعح - فبمو',
    description: 'أرض 6: أ ه ع ح ... ف ب م و (أهعح - فبمو)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ه', 'ع', 'ح'] },
      { layer: 2, letters: ['غ', 'خ', 'ق', 'ك'] },
      { layer: 3, letters: ['ض', 'ج', 'ش', 'ي'] },
      { layer: 4, letters: ['ل', 'ر', 'ن', 'ط'] },
      { layer: 5, letters: ['د', 'ت', 'ص', 'ز'] },
      { layer: 6, letters: ['س', 'ظ', 'ذ', 'ث'] },
      { layer: 7, letters: ['ف', 'ب', 'م', 'و'] },
    ],
  },
  arabic_7_af2: {
    id: 'arabic_7_af2',
    name: 'أهعح - فبمو (2)',
    badge: '7: أهعح - فبمو',
    description: 'أرض 7: أ ه ع ح ... ف ب م و (أهعح - فبمو)',
    arabicLayers: [
      { layer: 1, letters: ['أ', 'ه', 'ع', 'ح'] },
      { layer: 2, letters: ['غ', 'خ', 'ق', 'ك'] },
      { layer: 3, letters: ['ج', 'ش', 'ي', 'ض'] },
      { layer: 4, letters: ['ل', 'ن', 'ر', 'ط'] },
      { layer: 5, letters: ['د', 'ت', 'ص', 'ز'] },
      { layer: 6, letters: ['س', 'ظ', 'ذ', 'ث'] },
      { layer: 7, letters: ['ف', 'ب', 'م', 'و'] },
    ],
  },
  arabic_8_be: {
    id: 'arabic_8_be',
    name: 'بموف - عهأض',
    badge: '8: بموف - عهأض',
    description: 'أرض 8: ب م و ف ... ع ه أ ض (بموف - عهأض)',
    arabicLayers: [
      { layer: 1, letters: ['ب', 'م', 'و', 'ف'] },
      { layer: 2, letters: ['ث', 'ذ', 'ظ', 'ت'] },
      { layer: 3, letters: ['د', 'ط', 'ن', 'ل'] },
      { layer: 4, letters: ['ر', 'ز', 'س', 'ص'] },
      { layer: 5, letters: ['ج', 'ش', 'ي', 'ك'] },
      { layer: 6, letters: ['ق', 'خ', 'غ', 'ح'] },
      { layer: 7, letters: ['ع', 'ه', 'أ', 'ض'] },
    ],
  },
  arabic_9_dr: {
    id: 'arabic_9_dr',
    name: 'ضصثق - رظزو',
    badge: '9: ضصثق - رظزو',
    description: 'أرض 9: ض ص ث ق ... ر ظ ز و (ضصثق - رظزو)',
    arabicLayers: [
      { layer: 1, letters: ['ض', 'ص', 'ث', 'ق'] },
      { layer: 2, letters: ['ف', 'غ', 'ع', 'ه'] },
      { layer: 3, letters: ['خ', 'ح', 'ج', 'د'] },
      { layer: 4, letters: ['ذ', 'ش', 'س', 'ي'] },
      { layer: 5, letters: ['ب', 'ل', 'ا', 'ت'] },
      { layer: 6, letters: ['ن', 'م', 'ك', 'ط'] },
      { layer: 7, letters: ['ر', 'ظ', 'ز', 'و'] },
    ],
  },
  arabic_10_at: {
    id: 'arabic_10_at',
    name: 'المي - ثزظذ',
    badge: '10: المي - ثزظذ',
    description: 'أرض 10: ا ل م ي ... ث ز ظ ذ (المي - ثزظذ)',
    arabicLayers: [
      { layer: 1, letters: ['ا', 'ل', 'م', 'ي'] },
      { layer: 2, letters: ['و', 'ن', 'ر', 'ت'] },
      { layer: 3, letters: ['ب', 'ه', 'د', 'ع'] },
      { layer: 4, letters: ['س', 'ف', 'ك', 'ق'] },
      { layer: 5, letters: ['ح', 'ج', 'ص', 'ش'] },
      { layer: 6, letters: ['ض', 'ط', 'خ', 'غ'] },
      { layer: 7, letters: ['ث', 'ز', 'ظ', 'ذ'] },
    ],
  },
  arabic_11_ak: {
    id: 'arabic_11_ak',
    name: 'النم - خثزظ',
    badge: '11: النم - خثزظ',
    description: 'أرض 11: ا ل ن م ... خ ث ز ظ (النم - خثزظ)',
    arabicLayers: [
      { layer: 1, letters: ['ا', 'ل', 'ن', 'م'] },
      { layer: 2, letters: ['و', 'ي', 'ه', 'ر'] },
      { layer: 3, letters: ['ب', 'ت', 'ك', 'ع'] },
      { layer: 4, letters: ['ف', 'ق', 'س', 'د'] },
      { layer: 5, letters: ['ح', 'ج', 'ش', 'ذ'] },
      { layer: 6, letters: ['ص', 'غ', 'ض', 'ط'] },
      { layer: 7, letters: ['خ', 'ث', 'ز', 'ظ'] },
    ],
  },
  arabic_12_hy: {
    id: 'arabic_12_hy',
    name: 'هلحم - يثصظ',
    badge: '12: هلحم - يثصظ',
    description: 'أرض 12: ه ل ح م ... ي ث ص ظ (هلحم - يثصظ)',
    arabicLayers: [
      { layer: 1, letters: ['ه', 'ل', 'ح', 'م'] },
      { layer: 2, letters: ['ق', 'و', 'ش', 'ر'] },
      { layer: 3, letters: ['ت', 'س', 'ك', 'ن'] },
      { layer: 4, letters: ['خ', 'ب', 'ف', 'أ'] },
      { layer: 5, letters: ['ع', 'ض', 'ج', 'د'] },
      { layer: 6, letters: ['غ', 'ط', 'ز', 'ذ'] },
      { layer: 7, letters: ['ي', 'ث', 'ص', 'ظ'] },
    ],
  },
};

export const NOORANI_PRESETS: Record<string, NooraniDistributionPreset> = {
  noorani_1_nl: {
    id: 'noorani_1_nl',
    name: 'نصحك - لهسر',
    badge: '1: نصحك - لهسر',
    description: 'ن ص، ح ك، ي م، ق ا، ط ع، ل ه، س ر (سماء 1: نصحك - لهسر)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ن', 'ص']), description: 'السماء 1: ن ص' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ح', 'ك']), description: 'السماء 2: ح ك' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ي', 'م']), description: 'السماء 3: ي م' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ق', 'ا']), description: 'السماء 4: ق ا' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ط', 'ع']), description: 'السماء 5: ط ع' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ل', 'ه']), description: 'السماء 6: ل ه' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['س', 'ر']), description: 'السماء 7: س ر' },
    ],
  },
  noorani_2_sq: {
    id: 'noorani_2_sq',
    name: 'صلهس - قطعك',
    badge: '2: صلهس - قطعك',
    description: 'ص ل، ه س، ح ي، ر ا، م ن، ق ط، ع ك (سماء 2: صلهس - قطعك)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ص', 'ل']), description: 'السماء 1: ص ل' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ه', 'س']), description: 'السماء 2: ه س' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ح', 'ي']), description: 'السماء 3: ح ي' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ر', 'ا']), description: 'السماء 4: ر ا' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['م', 'ن']), description: 'السماء 5: م ن' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ق', 'ط']), description: 'السماء 6: ق ط' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ع', 'ك']), description: 'السماء 7: ع ك' },
    ],
  },
  noorani_3_sh: {
    id: 'noorani_3_sh',
    name: 'سرحص - هقطع',
    badge: '3: سرحص - هقطع',
    description: 'س ر، ح ص، ي ن، ك ل، ا م، ه ق، ط ع (سماء 3: سرحص - هقطع)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['س', 'ر']), description: 'السماء 1: س ر' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ح', 'ص']), description: 'السماء 2: ح ص' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ي', 'ن']), description: 'السماء 3: ي ن' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ك', 'ل']), description: 'السماء 4: ك ل' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ا', 'م']), description: 'السماء 5: ا م' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ه', 'ق']), description: 'السماء 6: ه ق' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ط', 'ع']), description: 'السماء 7: ط ع' },
    ],
  },
  noorani_4_am: {
    id: 'noorani_4_am',
    name: 'احرس - منهي',
    badge: '4: احرس - منهي',
    description: 'ا ح، ر س، ص ط، ع ق، ك ل، م ن، ه ي (سماء 4: احرس - منهي)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ا', 'ح']), description: 'السماء 1: ا ح' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ر', 'س']), description: 'السماء 2: ر س' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ص', 'ط']), description: 'السماء 3: ص ط' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ع', 'ق']), description: 'السماء 4: ع ق' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ك', 'ل']), description: 'السماء 5: ك ل' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['م', 'ن']), description: 'السماء 6: م ن' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ه', 'ي']), description: 'السماء 7: ه ي' },
    ],
  },
  noorani_5_al: {
    id: 'noorani_5_al',
    name: 'اهعح - لنرم',
    badge: '5: اهعح - لنرم',
    description: 'ا ه، ع ح، ق ك، ي ط، ص س، ل ن، ر م (سماء 5: اهعح - لنرم)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ا', 'ه']), description: 'السماء 1: ا ه' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ع', 'ح']), description: 'السماء 2: ع ح' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ق', 'ك']), description: 'السماء 3: ق ك' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ي', 'ط']), description: 'السماء 4: ي ط' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ص', 'س']), description: 'السماء 5: ص س' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ل', 'ن']), description: 'السماء 6: ل ن' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ر', 'م']), description: 'السماء 7: ر م' },
    ],
  },
  noorani_6_as: {
    id: 'noorani_6_as',
    name: 'المص - سحقن',
    badge: '6: المص - سحقن',
    description: 'ا ل، م ص، ر ك، ه ي، ع ط، س ح، ق ن (سماء 6: المص - سحقن)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل']), description: 'السماء 1: ا ل' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['م', 'ص']), description: 'السماء 2: م ص' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ر', 'ك']), description: 'السماء 3: ر ك' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ه', 'ي']), description: 'السماء 4: ه ي' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ع', 'ط']), description: 'السماء 5: ع ط' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['س', 'ح']), description: 'السماء 6: س ح' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ق', 'ن']), description: 'السماء 7: ق ن' },
    ],
  },
  noorani_7_mc: {
    id: 'noorani_7_mc',
    name: 'ملاح - عقكن',
    badge: '7: ملاح - عقكن',
    description: 'م ل، ا ح، ر س، ط ص، ي ه، ع ق، ك ن (سماء 7: ملاح - عقكن)',
    nooraniLayers: [
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['م', 'ل']), description: 'السماء 1: م ل' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ا', 'ح']), description: 'السماء 2: ا ح' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ر', 'س']), description: 'السماء 3: ر س' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ط', 'ص']), description: 'السماء 4: ط ص' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ي', 'ه']), description: 'السماء 5: ي ه' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ع', 'ق']), description: 'السماء 6: ع ق' },
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ك', 'ن']), description: 'السماء 7: ك ن' },
    ],
  },
};

// Short alias maps for ultra-compact URL sharing
export const PRESET_SHORT_MAP: Record<string, string> = {
  // Noorani (Sky)
  noorani_1_nl: 'n1',
  noorani_2_sq: 'n2',
  noorani_3_sh: 'n3',
  noorani_4_am: 'n4',
  noorani_5_al: 'n5',
  noorani_6_as: 'n6',
  noorani_7_mc: 'n7',
  // Backwards compatibility aliases:
  noorani_an: 'n6',
  noorani_kn: 'nkn',
  noorani_nr: 'nnr',
  noorani_nr_alt: 'nnra',
  // Arabic (Earth)
  arabic_1_az: 'a1',
  arabic_2_az: 'a2',
  arabic_3_an: 'a3',
  arabic_4_as: 'a4',
  arabic_5_am: 'a5',
  arabic_6_af: 'a6',
  arabic_7_af2: 'a7',
  arabic_8_be: 'a8',
  arabic_9_dr: 'a9',
  arabic_10_at: 'a10',
  arabic_11_ak: 'a11',
  arabic_12_hy: 'a12',
  // Backwards compatibility aliases:
  arabic_abjad_sheen: 'a1',
  arabic_alphabetical: 'a3',
  arabic_abjad_ghain: 'a2',
  arabic_sowti: 'a5',
  arabic_noorani: 'ano',
  arabic_ehsa_i: 'a11',
  arabic_al_togh: 'aat',
  arabic_sar_zaza: 'asz',
  arabic_mar_daza: 'amd',
  arabic_zal_dagh: 'azd',
};

// Reverse map for URL parsing
export const PRESET_EXPAND_MAP: Record<string, string> = Object.entries(PRESET_SHORT_MAP).reduce(
  (acc, [longId, shortCode]) => {
    acc[shortCode] = longId;
    return acc;
  },
  {} as Record<string, string>
);

export function getShortPresetId(id: string): string {
  return PRESET_SHORT_MAP[id] || id;
}

export function getExpandedPresetId(idOrShort: string): string {
  return PRESET_EXPAND_MAP[idOrShort] || idOrShort;
}

export const BENCHMARK_PRESET = {
  id: 'noorani_1_nl_arabic_1_az',
  name: 'سماء: نصحك - لهسر × أرض: أبجد - ذضظغ',
  badge: 'افتراضي',
  description: 'منظومة حرة متقاطعة: [سماء: نصحك - لهسر] × [أرض: أبجد - ذضظغ]',
  createLayers: (): LayerInfo[] => JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)),
};

export function createPresetLayersFromNoorani(nooraniKey: keyof typeof NOORANI_PRESETS): LayerInfo[] {
  const np = NOORANI_PRESETS[nooraniKey];
  if (!np) return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const baseLayers: LayerInfo[] = JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const layerMap = new Map(np.nooraniLayers.map((nl) => [nl.layer, nl]));
  return baseLayers.map((bl) => {
    const nl = layerMap.get(bl.layer);
    if (!nl) return bl;
    return {
      ...bl,
      cipherLetters: createNineCipherSlotsFromList(nl.cipherLetters),
      description: nl.description || bl.description,
    };
  });
}

export function createPresetLayersFromArabic(arabicKey: keyof typeof ARABIC_PRESETS): LayerInfo[] {
  const ap = ARABIC_PRESETS[arabicKey];
  if (!ap) return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const baseLayers: LayerInfo[] = JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const layerMap = new Map(ap.arabicLayers.map((al) => [al.layer, al]));
  return baseLayers.map((bl) => {
    const al = layerMap.get(bl.layer);
    if (!al) return bl;
    return {
      ...bl,
      arabicLetters: [...al.letters],
    };
  });
}

// Generate all 18 combinations (3 Noorani × 6 Arabic)
export const PRESET_TABLES: Record<string, { id: string; name: string; badge: string; description: string; createLayers: () => LayerInfo[] }> = {};

Object.values(NOORANI_PRESETS).forEach((noorani) => {
  Object.values(ARABIC_PRESETS).forEach((arabic) => {
    const id = `${noorani.id}_${arabic.id}`;
    const name = `سماء: ${noorani.name} × أرض: ${arabic.name}`;
    PRESET_TABLES[id] = {
      id,
      name,
      badge: `${noorani.name} × ${arabic.name}`,
      description: `منظومة متقاطعة: [سماء: ${noorani.name}] × [أرض: ${arabic.name}]`,
      createLayers: () => {
        const nooraniMap = new Map(noorani.nooraniLayers.map((nl) => [nl.layer, nl.cipherLetters]));
        const arabicMap = new Map(arabic.arabicLayers.map((al) => [al.layer, al.letters]));
        const layers: LayerInfo[] = [];
        for (let l = 7; l >= 1; l--) {
          const ciphers = nooraniMap.get(l) || [];
          const arabics = arabicMap.get(l) || ['', '', '', ''];
          layers.push({
            layer: l,
            cipherLetters: createNineCipherSlotsFromList(ciphers),
            arabicLetters: [...arabics],
            description: `السماء ${l}: [سماء: ${noorani.name}] × [أرض: ${arabic.name}]`,
          });
        }
        return layers;
      },
    };
  });
});

export interface InitialBrowserTable {
  id: string;
  name: string;
  description: string;
  layers: LayerInfo[];
}

export const INITIAL_OPTIONAL_BROWSER_TABLES: InitialBrowserTable[] = [];

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
  cipherOptions: string[];
  isSpecialOrSpace: boolean;
}

export function findLayerForChar(char: string, layers: LayerInfo[] = CIPHER_LAYERS): LayerInfo | null {
  if (!char || !layers || layers.length === 0) return null;
  const norm = normalizeArabicChar(char);
  for (const l of layers) {
    if (!l || !Array.isArray(l.arabicLetters)) continue;

    // 1. Direct match with exact character
    if (l.arabicLetters.includes(char)) {
      return l;
    }

    // 2. Direct match with normalized character
    if (norm && l.arabicLetters.includes(norm)) {
      return l;
    }

    // 3. Match normalized character against normalized characters in the layer
    if (norm && l.arabicLetters.some((c) => normalizeArabicChar(c) === norm)) {
      return l;
    }

    // 4. Match any Alef / Hamza variation (ا, أ, إ, آ, ء, ى)
    const isAlefVar = ['ا', 'أ', 'إ', 'آ', 'ء', 'ى'].includes(char);
    if (isAlefVar && l.arabicLetters.some((c) => ['ا', 'أ', 'إ', 'آ', 'ء', 'ى'].includes(c))) {
      return l;
    }

    // 5. Match Ta Marbuta / Ha variations (ة / ه)
    if ((char === 'ة' || char === 'ه') && l.arabicLetters.some((c) => c === 'ه' || c === 'ة')) {
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
        cipherOptions: [char],
        isSpecialOrSpace: true,
      };
    }

    const layer = findLayerForChar(char, layers);
    if (!layer) {
      const isArabic = /[ء-ي]/.test(char);
      return {
        originalChar: char,
        normalizedChar: normalizeArabicChar(char),
        layer: null,
        prob1: isArabic ? '؟' : char,
        prob2: isArabic ? '؟' : char,
        cipherOptions: isArabic ? ['؟'] : [char],
        isSpecialOrSpace: !isArabic,
      };
    }

    const filledCiphers = (Array.isArray(layer.cipherLetters) ? layer.cipherLetters : [])
      .map((c) => (c || '').trim())
      .filter(Boolean);
    const options = filledCiphers.length > 0 ? filledCiphers : ['؟'];

    return {
      originalChar: char,
      normalizedChar: normalizeArabicChar(char),
      layer,
      prob1: options[0] || '؟',
      prob2: options[1] || options[0] || '؟',
      cipherOptions: options,
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
      // Use unique options to avoid producing duplicate identical permutations if user duplicates cipher letters
      const opts = item.cipherOptions && item.cipherOptions.length > 0
        ? Array.from(new Set(item.cipherOptions))
        : [item.prob1, item.prob2];

      for (const opt of opts) {
        if (results.length >= maxCombinations) return;
        backtrack(index + 1, currentStr + opt);
      }
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
    Array.isArray(l.cipherLetters) &&
    l.cipherLetters.map((c) => (c || '').trim()).filter(Boolean).includes(char)
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


