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
    layer: 7,
    cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']),
    arabicLetters: ['ا', 'ب', 'ت', 'ث'],
    description: 'السماء 7: ن ق | ا ب ت ث',
  },
  {
    layer: 6,
    cipherLetters: createNineCipherSlotsFromList(['ح', 'م']),
    arabicLetters: ['ج', 'ح', 'خ', 'د'],
    description: 'السماء 6: ح م | ج ح خ د',
  },
  {
    layer: 5,
    cipherLetters: createNineCipherSlotsFromList(['ع', 'س']),
    arabicLetters: ['ذ', 'ر', 'ز', 'س'],
    description: 'السماء 5: ع س | ذ ر ز س',
  },
  {
    layer: 4,
    cipherLetters: createNineCipherSlotsFromList(['ص', 'ي']),
    arabicLetters: ['ش', 'ص', 'ض', 'ط'],
    description: 'السماء 4: ص ي | ش ص ض ط',
  },
  {
    layer: 3,
    cipherLetters: createNineCipherSlotsFromList(['ط', 'ه']),
    arabicLetters: ['ظ', 'ع', 'غ', 'ف'],
    description: 'السماء 3: ط ه | ظ ع غ ف',
  },
  {
    layer: 2,
    cipherLetters: createNineCipherSlotsFromList(['ك', 'ا']),
    arabicLetters: ['ق', 'ك', 'ل', 'م'],
    description: 'السماء 2: ك ا | ق ك ل م',
  },
  {
    layer: 1,
    cipherLetters: createNineCipherSlotsFromList(['ل', 'ر']),
    arabicLetters: ['ن', 'ه', 'و', 'ي'],
    description: 'السماء 1: ل ر | ن ه و ي',
  },
];

export const BENCHMARK_TABLE_NAME = 'سماء: ترتيب ن ر × أرض: الفبائي';

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
  arabic_alphabetical: {
    id: 'arabic_alphabetical',
    name: 'اب - وي',
    badge: 'اب - وي',
    description: 'الترتيب الهجائي الألفبائي (أ ب ت ث ... ن ه و ي)',
    arabicLayers: [
      { layer: 7, letters: ['أ', 'ب', 'ت', 'ث'] },
      { layer: 6, letters: ['ج', 'ح', 'خ', 'د'] },
      { layer: 5, letters: ['ذ', 'ر', 'ز', 'س'] },
      { layer: 4, letters: ['ش', 'ص', 'ض', 'ط'] },
      { layer: 3, letters: ['ظ', 'ع', 'غ', 'ف'] },
      { layer: 2, letters: ['ق', 'ك', 'ل', 'م'] },
      { layer: 1, letters: ['ن', 'ه', 'و', 'ي'] },
    ],
  },
  arabic_abjad_sheen: {
    id: 'arabic_abjad_sheen',
    name: 'اب - ظغ',
    badge: 'اب - ظغ',
    description: 'أبجد هوز المشهور بشين (ا ب ج د ... ذ ض ظ غ)',
    arabicLayers: [
      { layer: 7, letters: ['ا', 'ب', 'ج', 'د'] },
      { layer: 6, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 5, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'س', 'ع'] },
      { layer: 3, letters: ['ف', 'ص', 'ق', 'ر'] },
      { layer: 2, letters: ['ش', 'ت', 'ث', 'خ'] },
      { layer: 1, letters: ['ذ', 'ض', 'ظ', 'غ'] },
    ],
  },
  arabic_abjad_ghain: {
    id: 'arabic_abjad_ghain',
    name: 'اب - غش',
    badge: 'اب - غش',
    description: 'أبجد هوز المغربي بغين (ا ب ج د ... ذ ظ غ ش)',
    arabicLayers: [
      { layer: 7, letters: ['ا', 'ب', 'ج', 'د'] },
      { layer: 6, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 5, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'ص', 'ع'] },
      { layer: 3, letters: ['ف', 'ض', 'ق', 'ر'] },
      { layer: 2, letters: ['س', 'ت', 'ث', 'خ'] },
      { layer: 1, letters: ['ذ', 'ظ', 'غ', 'ش'] },
    ],
  },
  arabic_sowti: {
    id: 'arabic_sowti',
    name: 'عح - يا',
    badge: 'عح - يا',
    description: 'الترتيب الصوتي حسب مخارج الحروف (ع ح ه خ ... م و ي ا)',
    arabicLayers: [
      { layer: 7, letters: ['ع', 'ح', 'ه', 'خ'] },
      { layer: 6, letters: ['غ', 'ق', 'ك', 'ج'] },
      { layer: 5, letters: ['ش', 'ض', 'ص', 'س'] },
      { layer: 4, letters: ['ز', 'ط', 'د', 'ت'] },
      { layer: 3, letters: ['ظ', 'ذ', 'ث', 'ر'] },
      { layer: 2, letters: ['ل', 'ن', 'ف', 'ب'] },
      { layer: 1, letters: ['م', 'و', 'ي', 'ا'] },
    ],
  },
  arabic_noorani: {
    id: 'arabic_noorani',
    name: 'نص - فو',
    badge: 'نص - فو',
    description: 'الأحرف النورانية أولاً ثم غير النورانية (ن ص ح ك ... ظ غ ف و)',
    arabicLayers: [
      { layer: 7, letters: ['ن', 'ص', 'ح', 'ك'] },
      { layer: 6, letters: ['ي', 'م', 'ق', 'ا'] },
      { layer: 5, letters: ['ط', 'ع', 'ل', 'ه'] },
      { layer: 4, letters: ['س', 'ر', 'ب', 'ت'] },
      { layer: 3, letters: ['ث', 'ج', 'خ', 'د'] },
      { layer: 2, letters: ['ذ', 'ز', 'ش', 'ض'] },
      { layer: 1, letters: ['ظ', 'غ', 'ف', 'و'] },
    ],
  },
  arabic_ehsa_i: {
    id: 'arabic_ehsa_i',
    name: 'ال - ظغ',
    badge: 'ال - ظغ',
    description: 'الترتيب الإحصائي لتكرار الحروف في القرآن الكريم (ا ل ن م ... ط ث ظ غ)',
    arabicLayers: [
      { layer: 7, letters: ['ا', 'ل', 'ن', 'م'] },
      { layer: 6, letters: ['و', 'ي', 'ه', 'ر'] },
      { layer: 5, letters: ['ب', 'ت', 'ك', 'ع'] },
      { layer: 4, letters: ['ف', 'س', 'د', 'ق'] },
      { layer: 3, letters: ['ح', 'ج', 'ش', 'ض'] },
      { layer: 2, letters: ['ص', 'خ', 'ذ', 'ز'] },
      { layer: 1, letters: ['ط', 'ث', 'ظ', 'غ'] },
    ],
  },
  arabic_al_togh: {
    id: 'arabic_al_togh',
    name: 'ال - طغ',
    badge: 'ال - طغ',
    description: 'أرض أ ل س ف ... ج خ ط غ (الم نشرح)',
    arabicLayers: [
      { layer: 7, letters: ['ا', 'ل', 'س', 'ف'] },
      { layer: 6, letters: ['ت', 'ن', 'ه', 'ر'] },
      { layer: 5, letters: ['و', 'م', 'ب', 'ع'] },
      { layer: 4, letters: ['ك', 'ح', 'د', 'ث'] },
      { layer: 3, letters: ['ش', 'ص', 'ض', 'ز'] },
      { layer: 2, letters: ['ذ', 'ي', 'ق', 'ظ'] },
      { layer: 1, letters: ['ج', 'خ', 'ط', 'غ'] },
    ],
  },
  arabic_sar_zaza: {
    id: 'arabic_sar_zaza',
    name: 'صر - زظ',
    badge: 'صر - زظ',
    description: 'أرض ص ر ف ن ... ض خ ز ظ (تعجب)',
    arabicLayers: [
      { layer: 7, letters: ['ص', 'ر', 'ف', 'ن'] },
      { layer: 6, letters: ['ا', 'ي', 'ه', 'ذ'] },
      { layer: 5, letters: ['ل', 'ق', 'س', 'م'] },
      { layer: 4, letters: ['ك', 'ث', 'و', 'ش'] },
      { layer: 3, letters: ['ج', 'د', 'ع', 'ت'] },
      { layer: 2, letters: ['غ', 'ب', 'ط', 'ح'] },
      { layer: 1, letters: ['ض', 'خ', 'ز', 'ظ'] },
    ],
  },
  arabic_mar_daza: {
    id: 'arabic_mar_daza',
    name: 'مر - دظ',
    badge: 'مر - دظ',
    description: 'أرض م ر ا و ... ز ض د ظ (ذكر عسق)',
    arabicLayers: [
      { layer: 7, letters: ['م', 'ر', 'ا', 'و'] },
      { layer: 6, letters: ['ع', 'ب', 'ت', 'س'] },
      { layer: 5, letters: ['ي', 'ف', 'ذ', 'ك'] },
      { layer: 4, letters: ['ش', 'ل', 'ص', 'ق'] },
      { layer: 3, letters: ['ح', 'خ', 'غ', 'ج'] },
      { layer: 2, letters: ['ن', 'ه', 'ط', 'ث'] },
      { layer: 1, letters: ['ز', 'ض', 'د', 'ظ'] },
    ],
  },
  arabic_zal_dagh: {
    id: 'arabic_zal_dagh',
    name: 'ذل - ضغ',
    badge: 'ذل - ضغ',
    description: 'أرض ذ ل ا م ... ز ش ض غ (ذكر للعالمين)',
    arabicLayers: [
      { layer: 7, letters: ['ذ', 'ل', 'ا', 'م'] },
      { layer: 6, letters: ['و', 'ك', 'ث', 'ب'] },
      { layer: 5, letters: ['ف', 'ع', 'ص', 'س'] },
      { layer: 4, letters: ['ح', 'ن', 'خ', 'ت'] },
      { layer: 3, letters: ['ق', 'ر', 'ط', 'د'] },
      { layer: 2, letters: ['ي', 'ه', 'ظ', 'ج'] },
      { layer: 1, letters: ['ز', 'ش', 'ض', 'غ'] },
    ],
  },
};

export const NOORANI_PRESETS: Record<string, NooraniDistributionPreset> = {
  noorani_kn: {
    id: 'noorani_kn',
    name: 'ن - ك',
    badge: 'ن - ك',
    description: 'ن ق، ص ح، م ي، س ط، ه ا، ل ر، ع ك (سماء ن ك)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']), description: 'السماء 7: ن ق' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ص', 'ح']), description: 'السماء 6: ص ح' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['م', 'ي']), description: 'السماء 5: م ي' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['س', 'ط']), description: 'السماء 4: س ط' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ه', 'ا']), description: 'السماء 3: ه ا' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ل', 'ر']), description: 'السماء 2: ل ر' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ع', 'ك']), description: 'السماء 1: ع ك' },
    ],
  },
  noorani_nr: {
    id: 'noorani_nr',
    name: 'ن - ر',
    badge: 'ن - ر',
    description: 'ن ق، ح م، ع س، ص ي، ط ه، ك ا، ل ر (سماء ن ر)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']), description: 'السماء 7: ن ق' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ح', 'م']), description: 'السماء 6: ح م' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ع', 'س']), description: 'السماء 5: ع س' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ص', 'ي']), description: 'السماء 4: ص ي' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ط', 'ه']), description: 'السماء 3: ط ه' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ك', 'ا']), description: 'السماء 2: ك ا' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ل', 'ر']), description: 'السماء 1: ل ر' },
    ],
  },
  noorani_an: {
    id: 'noorani_an',
    name: 'ا - ن',
    badge: 'ا - ن',
    description: 'ا ل، م ص، ر ك، ه ي، ع ط، س ح، ق ن (سماء ا ن)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل']), description: 'السماء 7: ا ل' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['م', 'ص']), description: 'السماء 6: م ص' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ر', 'ك']), description: 'السماء 5: ر ك' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ه', 'ي']), description: 'السماء 4: ه ي' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ع', 'ط']), description: 'السماء 3: ع ط' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['س', 'ح']), description: 'السماء 2: س ح' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ق', 'ن']), description: 'السماء 1: ق ن' },
    ],
  },
  noorani_nr_alt: {
    id: 'noorani_nr_alt',
    name: 'ن - ر (٢)',
    badge: 'ن - ر',
    description: 'ن ق، ح م، ع س، ص ي، ا ل، ط ه، ك ر (سماء ن ر قديم)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']), description: 'السماء 7: ن ق' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ح', 'م']), description: 'السماء 6: ح م' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ع', 'س']), description: 'السماء 5: ع س' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ص', 'ي']), description: 'السماء 4: ص ي' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل']), description: 'السماء 3: ا ل' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ط', 'ه']), description: 'السماء 2: ط ه' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ك', 'ر']), description: 'السماء 1: ك ر' },
    ],
  },
};

// Short alias maps for ultra-compact URL sharing
export const PRESET_SHORT_MAP: Record<string, string> = {
  // Noorani (Sky)
  noorani_an: 'nan',
  noorani_kn: 'nkn',
  noorani_nr: 'nnr',
  noorani_nr_alt: 'nnra',
  // Arabic (Earth)
  arabic_ehsa_i: 'ae1',
  arabic_alphabetical: 'aal',
  arabic_abjad_sheen: 'aas',
  arabic_abjad_ghain: 'aag',
  arabic_sowti: 'aso',
  arabic_noorani: 'ano',
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
  id: 'noorani_nr_arabic_alphabetical',
  name: 'سماء: ن - ر × أرض: اب - وي',
  badge: 'افتراضي',
  description: 'منظومة حرة متقاطعة: [سماء: ن - ر] × [أرض: اب - وي]',
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
        cipherOptions: [char],
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
        cipherOptions: [char],
        isSpecialOrSpace: true,
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


