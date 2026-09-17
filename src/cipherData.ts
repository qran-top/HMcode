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
  return [c1, c2, '', '', '', '', '', '', ''];
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
  const targetLength = Math.max(9, flatChars.length);
  return Array.from({ length: targetLength }, (_, i) => (flatChars[i] != null ? flatChars[i] : ''));
}

export const DEFAULT_CIPHER_LAYERS: LayerInfo[] = [
  {
    layer: 7,
    cipherLetters: createNineCipherSlots('ن', 'ق'),
    arabicLetters: ['أ', 'ب', 'ج', 'د'],
    description: 'الطبقة السابعة: ن ق المقابلة لـ (أ ب ج د)',
  },
  {
    layer: 6,
    cipherLetters: createNineCipherSlots('ح', 'م'),
    arabicLetters: ['ه', 'و', 'ز', 'ح'],
    description: 'الطبقة السادسة: ح م المقابلة لـ (ه و ز ح)',
  },
  {
    layer: 5,
    cipherLetters: createNineCipherSlots('ع', 'س'),
    arabicLetters: ['ط', 'ي', 'ك', 'ل'],
    description: 'الطبقة الخامسة: ع س المقابلة لـ (ط ي ك ل)',
  },
  {
    layer: 4,
    cipherLetters: createNineCipherSlots('ص', 'ي'),
    arabicLetters: ['م', 'ن', 'س', 'ع'],
    description: 'الطبقة الرابعة: ص ي المقابلة لـ (م ن س ع)',
  },
  {
    layer: 3,
    cipherLetters: createNineCipherSlots('ا', 'ل'),
    arabicLetters: ['ف', 'ص', 'ق', 'ر'],
    description: 'الطبقة الثالثة: ا ل المقابلة لـ (ف ص ق ر)',
  },
  {
    layer: 2,
    cipherLetters: createNineCipherSlots('ط', 'ه'),
    arabicLetters: ['ش', 'ت', 'ث', 'خ'],
    description: 'الطبقة الثانية: ط ه المقابلة لـ (ش ت ث خ)',
  },
  {
    layer: 1,
    cipherLetters: createNineCipherSlots('ك', 'ر'),
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
  abjadEastern: {
    id: 'abjadEastern',
    name: 'الترتيب الأبجدي الشرقي المعتمد',
    badge: 'الافتراضي',
    description: 'أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ (من أ ب ج د في الطبقة 7 إلى ذ ض ظ غ في الطبقة 1)',
    arabicLayers: [
      { layer: 7, letters: ['أ', 'ب', 'ج', 'د'] },
      { layer: 6, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 5, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'س', 'ع'] },
      { layer: 3, letters: ['ف', 'ص', 'ق', 'ر'] },
      { layer: 2, letters: ['ش', 'ت', 'ث', 'خ'] },
      { layer: 1, letters: ['ذ', 'ض', 'ظ', 'غ'] },
    ],
  },
  abjadWestern: {
    id: 'abjadWestern',
    name: 'الترتيب الأبجدي الغربي (المغربي)',
    badge: 'المغربي',
    description: 'أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش (من أ ب ج د في الطبقة 7 إلى ذ ظ غ ش في الطبقة 1)',
    arabicLayers: [
      { layer: 7, letters: ['أ', 'ب', 'ج', 'د'] },
      { layer: 6, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 5, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 4, letters: ['م', 'ن', 'ص', 'ع'] },
      { layer: 3, letters: ['ف', 'ض', 'ق', 'ر'] },
      { layer: 2, letters: ['س', 'ت', 'ث', 'خ'] },
      { layer: 1, letters: ['ذ', 'ظ', 'غ', 'ش'] },
    ],
  },
  abjadEasternAscending: {
    id: 'abjadEasternAscending',
    name: 'الترتيب الأبجدي الشرقي الصاعد',
    badge: 'صاعد ⬆️',
    description: 'يبدأ من (أ ب ج د) في الطبقة 1 صعوداً إلى (ذ ض ظ غ) في الطبقة 7',
    arabicLayers: [
      { layer: 7, letters: ['ذ', 'ض', 'ظ', 'غ'] },
      { layer: 6, letters: ['ش', 'ت', 'ث', 'خ'] },
      { layer: 5, letters: ['ف', 'ص', 'ق', 'ر'] },
      { layer: 4, letters: ['م', 'ن', 'س', 'ع'] },
      { layer: 3, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 2, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 1, letters: ['أ', 'ب', 'ج', 'د'] },
    ],
  },
  abjadWesternAscending: {
    id: 'abjadWesternAscending',
    name: 'الترتيب الأبجدي الغربي الصاعد',
    badge: 'مغربي صاعد ⬆️',
    description: 'يبدأ من (أ ب ج د) في الطبقة 1 صعوداً إلى (ذ ظ غ ش) في الطبقة 7',
    arabicLayers: [
      { layer: 7, letters: ['ذ', 'ظ', 'غ', 'ش'] },
      { layer: 6, letters: ['س', 'ت', 'ث', 'خ'] },
      { layer: 5, letters: ['ف', 'ض', 'ق', 'ر'] },
      { layer: 4, letters: ['م', 'ن', 'ص', 'ع'] },
      { layer: 3, letters: ['ط', 'ي', 'ك', 'ل'] },
      { layer: 2, letters: ['ه', 'و', 'ز', 'ح'] },
      { layer: 1, letters: ['أ', 'ب', 'ج', 'د'] },
    ],
  },
  alphabeticalHijai: {
    id: 'alphabeticalHijai',
    name: 'الترتيب الهجائي الألفبائي الحديث',
    badge: 'هجائي',
    description: 'أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي (من ط7 نزولاً إلى ط1)',
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
  alphabeticalHijaiAscending: {
    id: 'alphabeticalHijaiAscending',
    name: 'الترتيب الهجائي الألفبائي الصاعد',
    badge: 'هجائي صاعد ⬆️',
    description: 'يبدأ من (أ ب ت ث) في الطبقة 1 صعوداً حتى (ن هـ و ي) في الطبقة 7',
    arabicLayers: [
      { layer: 7, letters: ['ن', 'ه', 'و', 'ي'] },
      { layer: 6, letters: ['ق', 'ك', 'ل', 'م'] },
      { layer: 5, letters: ['ظ', 'ع', 'غ', 'ف'] },
      { layer: 4, letters: ['ش', 'ص', 'ض', 'ط'] },
      { layer: 3, letters: ['ذ', 'ر', 'ز', 'س'] },
      { layer: 2, letters: ['ج', 'ح', 'خ', 'د'] },
      { layer: 1, letters: ['أ', 'ب', 'ت', 'ث'] },
    ],
  },
  clearArabic: {
    id: 'clearArabic',
    name: 'تفريغ الأحرف العربية فقط',
    badge: 'تفريغ',
    description: 'تفريغ جميع خانات الأحرف العربية الـ 28 مع الإبقاء على أحرف التشفير النورانية',
    arabicLayers: [
      { layer: 7, letters: ['', '', '', ''] },
      { layer: 6, letters: ['', '', '', ''] },
      { layer: 5, letters: ['', '', '', ''] },
      { layer: 4, letters: ['', '', '', ''] },
      { layer: 3, letters: ['', '', '', ''] },
      { layer: 2, letters: ['', '', '', ''] },
      { layer: 1, letters: ['', '', '', ''] },
    ],
  },
};

export const NOORANI_PRESETS: Record<string, NooraniDistributionPreset> = {
  distribution29: {
    id: 'distribution29',
    name: 'توزيعة 29',
    badge: 'توزيعة 29',
    description: 'توزيع فواتح السور الـ 29 بالأحرف المفردة (ن، ق، ح م، ع س ق، ص، ي س، ا ل م، ط س م، ط س، ط ه، ك ه ي ع ص، ا ل ر، ا ل م ر، ا ل م ص)',
    nooraniLayers: [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ن', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        description: 'الطبقة 7: ن (القلم)، ق (ق)، حم (الأحقاف)، حم (الجاثية)، حم (الدخان)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق', 'ح', 'م', 'ح', 'م']),
        description: 'الطبقة 6: حم (الزخرف)، حم عسق (الشورى)، حم (فصلت)، حم (غافر)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 5: ص (ص)، يس (يس)، الم (السجدة)، الم (لقمان)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'س', 'م', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 4: طس (النمل)، طسم (القصص)، الم (العنكبوت)، الم (الروم)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'ه', 'ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']),
        description: 'الطبقة 3: طسم (الشعراء)، طه (طه)، كهيعص (مريم)، الر (الحجر)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر', 'ا', 'ل', 'ر', 'ا', 'ل', 'ر']),
        description: 'الطبقة 2: الر (إبراهيم)، المر (الرعد)، الر (يوسف)، الر (هود)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ص', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 1: الر (يونس)، المص (الأعراف)، الم (آل عمران)، الم (البقرة)',
      },
    ],
  },
  distribution30: {
    id: 'distribution30',
    name: 'توزيعة 30',
    badge: 'توزيعة 30',
    description: 'توزيع فواتح السور الـ 30 بالأحرف المفردة (بفصل عسق كفاتحة مستقلة في الشورى وترحيل الحواميم)',
    nooraniLayers: [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ن', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        description: 'الطبقة 7: ن (القلم)، ق (ق)، حم (الأحقاف)، حم (الجاثية)، حم (الدخان)، حم (الزخرف)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ع', 'س', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        description: 'الطبقة 6: عسق (الشورى آية 2)، حم (الشورى آية 1)، حم (فصلت)، حم (غافر)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 5: ص (ص)، يس (يس)، الم (السجدة)، الم (لقمان)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'س', 'م', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 4: طس (النمل)، طسم (القصص)، الم (العنكبوت)، الم (الروم)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'ه', 'ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']),
        description: 'الطبقة 3: طسم (الشعراء)، طه (طه)، كهيعص (مريم)، الر (الحجر)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر', 'ا', 'ل', 'ر', 'ا', 'ل', 'ر']),
        description: 'الطبقة 2: الر (إبراهيم)، المر (الرعد)، الر (يوسف)، الر (هود)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ص', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        description: 'الطبقة 1: الر (يونس)، المص (الأعراف)، الم (آل عمران)، الم (البقرة)',
      },
    ],
  },
  distributionNoon: {
    id: 'distributionNoon',
    name: 'توزيعة ن (فلترة من تحت لفوق - صعوداً من آخر المصحف)',
    badge: 'توزيعة ن ⬆️',
    description: 'المجموعات 1 إلى 7 صعوداً: (ن-ق)، (حم-حم عسق)، (ص-يس)، (الم-طسم)، (طس-طه)، (كهيعص-الر)، (المر-المص)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']), description: 'المجموعة 1: القلم + ق (ن - ق)' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق']), description: 'المجموعة 2: الأحقاف + الشورى (حم - حم عسق)' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س']), description: 'المجموعة 3: ص + يس (ص - يس)' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ط', 'س', 'م']), description: 'المجموعة 4: السجدة + القصص (الم - طسم)' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'ه']), description: 'المجموعة 5: النمل + طه (طس - طه)' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']), description: 'المجموعة 6: مريم + الحجر (كهيعص - الر)' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ر', 'ا', 'ل', 'م', 'ص']), description: 'المجموعة 7: الرعد + الأعراف (المر - المص)' },
    ],
  },
  distributionAlef: {
    id: 'distributionAlef',
    name: 'توزيعة الف (فلترة من فوق لتحت - نزولاً من أول المصحف)',
    badge: 'توزيعة الف ⬇️',
    description: 'المجموعات 1 إلى 7 نزولاً: (الم-المص)، (الر-المر)، (كهيعص-طه)، (طسم-طس)، (يس-ص)، (حم-حم عسق)، (ق-ن)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ا', 'ل', 'م', 'ص']), description: 'المجموعة 1: البقرة + الأعراف (الم - المص)' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر']), description: 'المجموعة 2: يونس + الرعد (الر - المر)' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ك', 'ه', 'ي', 'ع', 'ص', 'ط', 'ه']), description: 'المجموعة 3: مريم + طه (كهيعص - طه)' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'س']), description: 'المجموعة 4: الشعراء + النمل (طسم - طس)' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ي', 'س', 'ص']), description: 'المجموعة 5: يس + ص (يس - ص)' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق']), description: 'المجموعة 6: غافر + الشورى (حم - حم عسق)' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ق', 'ن']), description: 'المجموعة 7: ق + القلم (ق - ن)' },
    ],
  },
  defaultQuranicPairs: {
    id: 'defaultQuranicPairs',
    name: 'الترتيب الثنائي المعتمد (جدول الفرقان)',
    badge: 'الافتراضي',
    description: 'ن ق، ح م، ع س، ص ي، ا ل، ط ه، ك ر (حرفان لكل طبقة)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), description: 'الطبقة السابعة: ن ق' },
      { layer: 6, cipherLetters: createNineCipherSlots('ح', 'م'), description: 'الطبقة السادسة: ح م' },
      { layer: 5, cipherLetters: createNineCipherSlots('ع', 'س'), description: 'الطبقة الخامسة: ع س' },
      { layer: 4, cipherLetters: createNineCipherSlots('ص', 'ي'), description: 'الطبقة الرابعة: ص ي' },
      { layer: 3, cipherLetters: createNineCipherSlots('ا', 'ل'), description: 'الطبقة الثالثة: ا ل' },
      { layer: 2, cipherLetters: createNineCipherSlots('ط', 'ه'), description: 'الطبقة الثانية: ط ه' },
      { layer: 1, cipherLetters: createNineCipherSlots('ك', 'ر'), description: 'الطبقة الأولى: ك ر' },
    ],
  },
  distinct14Noorani: {
    id: 'distinct14Noorani',
    name: 'الحروف النورانية الـ 14 بدون تكرار',
    badge: '14 حرفاً',
    description: 'توزيع الحروف النورانية الـ 14 بدون أي تكرار عبر الطبقات السبع (حرفان في كل طبقة)',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), description: 'الطبقة 7: ن ق' },
      { layer: 6, cipherLetters: createNineCipherSlots('ص', 'ي'), description: 'الطبقة 6: ص ي' },
      { layer: 5, cipherLetters: createNineCipherSlots('س', 'ك'), description: 'الطبقة 5: س ك' },
      { layer: 4, cipherLetters: createNineCipherSlots('ع', 'ه'), description: 'الطبقة 4: ع ه' },
      { layer: 3, cipherLetters: createNineCipherSlots('م', 'ط'), description: 'الطبقة 3: م ط' },
      { layer: 2, cipherLetters: createNineCipherSlots('ل', 'ح'), description: 'الطبقة 2: ل ح' },
      { layer: 1, cipherLetters: createNineCipherSlots('ا', 'ر'), description: 'الطبقة 1: ا ر' },
    ],
  },
  surahOpeningsGradual: {
    id: 'surahOpeningsGradual',
    name: 'فواتح السور حسب الطول والتركيب',
    badge: 'فواتح السور',
    description: 'من الحروف المفردة (ن، ق، ص) إلى الفواتح الثنائية والثلاثية ثم المركبة الطويلة',
    nooraniLayers: [
      { layer: 7, cipherLetters: createNineCipherSlotsFromList(['ن']), description: 'الطبقة 7: ن (القلم)' },
      { layer: 6, cipherLetters: createNineCipherSlotsFromList(['ق']), description: 'الطبقة 6: ق' },
      { layer: 5, cipherLetters: createNineCipherSlotsFromList(['ص']), description: 'الطبقة 5: ص' },
      { layer: 4, cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'ه']), description: 'الطبقة 4: طس + طه' },
      { layer: 3, cipherLetters: createNineCipherSlotsFromList(['ي', 'س', 'ح', 'م']), description: 'الطبقة 3: يس + حم' },
      { layer: 2, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ط', 'س', 'م']), description: 'الطبقة 2: الر + طسم' },
      { layer: 1, cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ك', 'ه', 'ي', 'ع', 'ص']), description: 'الطبقة 1: الم + كهيعص' },
    ],
  },
  clearNoorani: {
    id: 'clearNoorani',
    name: 'تفريغ أحرف التشفير النورانية فقط',
    badge: 'تفريغ',
    description: 'تفريغ جميع خانات أحرف التشفير في كافة الطبقات مع الإبقاء على الأحرف العربية',
    nooraniLayers: [
      { layer: 7, cipherLetters: Array(9).fill(''), description: 'الطبقة 7' },
      { layer: 6, cipherLetters: Array(9).fill(''), description: 'الطبقة 6' },
      { layer: 5, cipherLetters: Array(9).fill(''), description: 'الطبقة 5' },
      { layer: 4, cipherLetters: Array(9).fill(''), description: 'الطبقة 4' },
      { layer: 3, cipherLetters: Array(9).fill(''), description: 'الطبقة 3' },
      { layer: 2, cipherLetters: Array(9).fill(''), description: 'الطبقة 2' },
      { layer: 1, cipherLetters: Array(9).fill(''), description: 'الطبقة 1' },
    ],
  },
};

export const PRESET_TABLES = {
  distribution29: {
    id: 'distribution29',
    name: 'توزيعة 29',
    description: 'توزيع فواتح السور الـ 29 بالأحرف المفردة مع الأحرف العربية المعتمدة',
    createLayers: (): LayerInfo[] => [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ن', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        arabicLetters: ['أ', 'ب', 'ج', 'د'],
        description: 'الطبقة 7: ن (القلم)، ق (ق)، حم (الأحقاف)، حم (الجاثية)، حم (الدخان)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق', 'ح', 'م', 'ح', 'م']),
        arabicLetters: ['ه', 'و', 'ز', 'ح'],
        description: 'الطبقة 6: حم (الزخرف)، حم عسق (الشورى)، حم (فصلت)، حم (غافر)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['ط', 'ي', 'ك', 'ل'],
        description: 'الطبقة 5: ص (ص)، يس (يس)، الم (السجدة)، الم (لقمان)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'س', 'م', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['م', 'ن', 'س', 'ع'],
        description: 'الطبقة 4: طس (النمل)، طسم (القصص)، الم (العنكبوت)، الم (الروم)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'ه', 'ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']),
        arabicLetters: ['ف', 'ص', 'ق', 'ر'],
        description: 'الطبقة 3: طسم (الشعراء)، طه (طه)، كهيعص (مريم)، الر (الحجر)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر', 'ا', 'ل', 'ر', 'ا', 'ل', 'ر']),
        arabicLetters: ['ش', 'ت', 'ث', 'خ'],
        description: 'الطبقة 2: الر (إبراهيم)، المر (الرعد)، الر (يوسف)، الر (هود)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ص', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
        description: 'الطبقة 1: الر (يونس)، المص (الأعراف)، الم (آل عمران)، الم (البقرة)',
      },
    ],
  },
  distribution30: {
    id: 'distribution30',
    name: 'توزيعة 30',
    description: 'توزيع فواتح السور الـ 30 بالأحرف المفردة (بفصل عسق كفاتحة مستقلة في الشورى) مع الأحرف العربية المعتمدة',
    createLayers: (): LayerInfo[] => [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ن', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        arabicLetters: ['أ', 'ب', 'ج', 'د'],
        description: 'الطبقة 7: ن (القلم)، ق (ق)، حم (الأحقاف)، حم (الجاثية)، حم (الدخان)، حم (الزخرف)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ع', 'س', 'ق', 'ح', 'م', 'ح', 'م', 'ح', 'م']),
        arabicLetters: ['ه', 'و', 'ز', 'ح'],
        description: 'الطبقة 6: عسق (الشورى آية 2)، حم (الشورى آية 1)، حم (فصلت)، حم (غافر)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['ط', 'ي', 'ك', 'ل'],
        description: 'الطبقة 5: ص (ص)، يس (يس)، الم (السجدة)، الم (لقمان)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'س', 'م', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['م', 'ن', 'س', 'ع'],
        description: 'الطبقة 4: طس (النمل)، طسم (القصص)، الم (العنكبوت)، الم (الروم)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'ه', 'ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']),
        arabicLetters: ['ف', 'ص', 'ق', 'ر'],
        description: 'الطبقة 3: طسم (الشعراء)، طه (طه)، كهيعص (مريم)، الر (الحجر)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر', 'ا', 'ل', 'ر', 'ا', 'ل', 'ر']),
        arabicLetters: ['ش', 'ت', 'ث', 'خ'],
        description: 'الطبقة 2: الر (إبراهيم)، المر (الرعد)، الر (يوسف)، الر (هود)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ص', 'ا', 'ل', 'م', 'ا', 'ل', 'م']),
        arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
        description: 'الطبقة 1: الر (يونس)، المص (الأعراف)، الم (آل عمران)، الم (البقرة)',
      },
    ],
  },
  distributionNoon: {
    id: 'distributionNoon',
    name: 'توزيعة ن (فلترة من تحت لفوق - صعوداً من آخر المصحف)',
    description: 'المجموعات 1 إلى 7 صعوداً: (ن-ق)، (حم-حم عسق)، (ص-يس)، (الم-طسم)، (طس-طه)، (كهيعص-الر)، (المر-المص)',
    createLayers: (): LayerInfo[] => [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ن', 'ق']),
        arabicLetters: ['أ', 'ب', 'ج', 'د'],
        description: 'المجموعة 1: القلم + ق (ن - ق)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق']),
        arabicLetters: ['ه', 'و', 'ز', 'ح'],
        description: 'المجموعة 2: الأحقاف + الشورى (حم - حم عسق)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ص', 'ي', 'س']),
        arabicLetters: ['ط', 'ي', 'ك', 'ل'],
        description: 'المجموعة 3: ص + يس (ص - يس)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ط', 'س', 'م']),
        arabicLetters: ['م', 'ن', 'س', 'ع'],
        description: 'المجموعة 4: السجدة + القصص (الم - طسم)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'ط', 'ه']),
        arabicLetters: ['ف', 'ص', 'ق', 'ر'],
        description: 'المجموعة 5: النمل + طه (طس - طه)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ك', 'ه', 'ي', 'ع', 'ص', 'ا', 'ل', 'ر']),
        arabicLetters: ['ش', 'ت', 'ث', 'خ'],
        description: 'المجموعة 6: مريم + الحجر (كهيعص - الر)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ر', 'ا', 'ل', 'م', 'ص']),
        arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
        description: 'المجموعة 7: الرعد + الأعراف (المر - المص)',
      },
    ],
  },
  distributionAlef: {
    id: 'distributionAlef',
    name: 'توزيعة الف (فلترة من فوق لتحت - نزولاً من أول المصحف)',
    description: 'المجموعات 1 إلى 7 نزولاً: (الم-المص)، (الر-المر)، (كهيعص-طه)، (طسم-طس)، (يس-ص)، (حم-حم عسق)، (ق-ن)',
    createLayers: (): LayerInfo[] => [
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'م', 'ا', 'ل', 'م', 'ص']),
        arabicLetters: ['أ', 'ب', 'ج', 'د'],
        description: 'المجموعة 1: البقرة + الأعراف (الم - المص)',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(['ا', 'ل', 'ر', 'ا', 'ل', 'م', 'ر']),
        arabicLetters: ['ه', 'و', 'ز', 'ح'],
        description: 'المجموعة 2: يونس + الرعد (الر - المر)',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(['ك', 'ه', 'ي', 'ع', 'ص', 'ط', 'ه']),
        arabicLetters: ['ط', 'ي', 'ك', 'ل'],
        description: 'المجموعة 3: مريم + طه (كهيعص - طه)',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(['ط', 'س', 'م', 'ط', 'س']),
        arabicLetters: ['م', 'ن', 'س', 'ع'],
        description: 'المجموعة 4: الشعراء + النمل (طسم - طس)',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(['ي', 'س', 'ص']),
        arabicLetters: ['ف', 'ص', 'ق', 'ر'],
        description: 'المجموعة 5: يس + ص (يس - ص)',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(['ح', 'م', 'ح', 'م', 'ع', 'س', 'ق']),
        arabicLetters: ['ش', 'ت', 'ث', 'خ'],
        description: 'المجموعة 6: غافر + الشورى (حم - حم عسق)',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(['ق', 'ن']),
        arabicLetters: ['ذ', 'ض', 'ظ', 'غ'],
        description: 'المجموعة 7: ق + القلم (ق - ن)',
      },
    ],
  },
  defaultQuranic: {
    id: 'defaultQuranic',
    name: 'الترتيب الأبجدي الشرقي المعتمد (جدول الفرقان)',
    description: 'الطبقة 7 (أ ب ج د) إلى 1 (ذ ض ظ غ) - أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ',
    createLayers: (): LayerInfo[] => JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)),
  },
  abjadWestern: {
    id: 'abjadWestern',
    name: 'الترتيب الأبجدي الغربي (المغربي)',
    description: 'الطبقة 7 (أ ب ج د) إلى 1 (ذ ظ غ ش) - أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش',
    createLayers: (): LayerInfo[] => [
      {
        layer: 7,
        cipherLetters: createNineCipherSlots('ن', 'ق'),
        arabicLetters: ['أ', 'ب', 'ج', 'د'],
        description: 'الطبقة السابعة: ن ق المقابلة لـ (أ ب ج د) [أبجد]',
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlots('ح', 'م'),
        arabicLetters: ['ه', 'و', 'ز', 'ح'],
        description: 'الطبقة السادسة: ح م المقابلة لـ (ه و ز ح) [هوز + ح]',
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlots('ع', 'س'),
        arabicLetters: ['ط', 'ي', 'ك', 'ل'],
        description: 'الطبقة الخامسة: ع س المقابلة لـ (ط ي ك ل) [طي + كل]',
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlots('ص', 'ي'),
        arabicLetters: ['م', 'ن', 'ص', 'ع'],
        description: 'الطبقة الرابعة: ص ي المقابلة لـ (م ن ص ع) [من + صع]',
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlots('ا', 'ل'),
        arabicLetters: ['ف', 'ض', 'ق', 'ر'],
        description: 'الطبقة الثالثة: ا ل المقابلة لـ (ف ض ق ر) [فض + قر]',
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlots('ط', 'ه'),
        arabicLetters: ['س', 'ت', 'ث', 'خ'],
        description: 'الطبقة الثانية: ط ه المقابلة لـ (س ت ث خ) [ست + ثخ]',
      },
      {
        layer: 1,
        cipherLetters: createNineCipherSlots('ك', 'ر'),
        arabicLetters: ['ذ', 'ظ', 'غ', 'ش'],
        description: 'الطبقة الأولى: ك ر المقابلة لـ (ذ ظ غ ش) [ذ + ظغش]',
      },
    ],
  },
  abjadAscending: {
    id: 'abjadAscending',
    name: 'الترتيب الأبجدي الشرقي الصاعد',
    description: 'الطبقة 1 (أ ب ج د) صعوداً إلى الطبقة 7 (ذ ض ظ غ)',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), arabicLetters: ['ذ', 'ض', 'ظ', 'غ'], description: 'الطبقة 7: ذ ض ظ غ' },
      { layer: 6, cipherLetters: createNineCipherSlots('ح', 'م'), arabicLetters: ['ش', 'ت', 'ث', 'خ'], description: 'الطبقة 6: ش ت ث خ' },
      { layer: 5, cipherLetters: createNineCipherSlots('ع', 'س'), arabicLetters: ['ف', 'ص', 'ق', 'ر'], description: 'الطبقة 5: ف ص ق ر' },
      { layer: 4, cipherLetters: createNineCipherSlots('ص', 'ي'), arabicLetters: ['م', 'ن', 'س', 'ع'], description: 'الطبقة 4: م ن س ع' },
      { layer: 3, cipherLetters: createNineCipherSlots('ا', 'ل'), arabicLetters: ['ط', 'ي', 'ك', 'ل'], description: 'الطبقة 3: ط ي ك ل' },
      { layer: 2, cipherLetters: createNineCipherSlots('ط', 'ه'), arabicLetters: ['ه', 'و', 'ز', 'ح'], description: 'الطبقة 2: ه و ز ح' },
      { layer: 1, cipherLetters: createNineCipherSlots('ك', 'ر'), arabicLetters: ['أ', 'ب', 'ج', 'د'], description: 'الطبقة 1: أ ب ج د' },
    ],
  },
  abjadWesternAscending: {
    id: 'abjadWesternAscending',
    name: 'الترتيب الأبجدي الغربي الصاعد',
    description: 'الطبقة 1 (أ ب ج د) صعوداً إلى الطبقة 7 (ذ ظ غ ش)',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), arabicLetters: ['ذ', 'ظ', 'غ', 'ش'], description: 'الطبقة 7: ذ ظ غ ش' },
      { layer: 6, cipherLetters: createNineCipherSlots('ح', 'م'), arabicLetters: ['س', 'ت', 'ث', 'خ'], description: 'الطبقة 6: س ت ث خ' },
      { layer: 5, cipherLetters: createNineCipherSlots('ع', 'س'), arabicLetters: ['ف', 'ض', 'ق', 'ر'], description: 'الطبقة 5: ف ض ق ر' },
      { layer: 4, cipherLetters: createNineCipherSlots('ص', 'ي'), arabicLetters: ['م', 'ن', 'ص', 'ع'], description: 'الطبقة 4: م ن ص ع' },
      { layer: 3, cipherLetters: createNineCipherSlots('ا', 'ل'), arabicLetters: ['ط', 'ي', 'ك', 'ل'], description: 'الطبقة 3: ط ي ك ل' },
      { layer: 2, cipherLetters: createNineCipherSlots('ط', 'ه'), arabicLetters: ['ه', 'و', 'ز', 'ح'], description: 'الطبقة 2: ه و ز ح' },
      { layer: 1, cipherLetters: createNineCipherSlots('ك', 'ر'), arabicLetters: ['أ', 'ب', 'ج', 'د'], description: 'الطبقة 1: أ ب ج د' },
    ],
  },
  alphabeticalHijai: {
    id: 'alphabeticalHijai',
    name: 'الترتيب الهجائي الألفبائي',
    description: 'من (أ ب ت ث) في الطبقة 7 حتى (ن هـ و ي) في الطبقة 1',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), arabicLetters: ['أ', 'ب', 'ت', 'ث'], description: 'الطبقة 7: أ ب ت ث' },
      { layer: 6, cipherLetters: createNineCipherSlots('ح', 'م'), arabicLetters: ['ج', 'ح', 'خ', 'د'], description: 'الطبقة 6: ج ح خ د' },
      { layer: 5, cipherLetters: createNineCipherSlots('ع', 'س'), arabicLetters: ['ذ', 'ر', 'ز', 'س'], description: 'الطبقة 5: ذ ر ز س' },
      { layer: 4, cipherLetters: createNineCipherSlots('ص', 'ي'), arabicLetters: ['ش', 'ص', 'ض', 'ط'], description: 'الطبقة 4: ش ص ض ط' },
      { layer: 3, cipherLetters: createNineCipherSlots('ا', 'ل'), arabicLetters: ['ظ', 'ع', 'غ', 'ف'], description: 'الطبقة 3: ظ ع غ ف' },
      { layer: 2, cipherLetters: createNineCipherSlots('ط', 'ه'), arabicLetters: ['ق', 'ك', 'ل', 'م'], description: 'الطبقة 2: ق ك ل م' },
      { layer: 1, cipherLetters: createNineCipherSlots('ك', 'ر'), arabicLetters: ['ن', 'ه', 'و', 'ي'], description: 'الطبقة 1: ن ه و ي' },
    ],
  },
  emptyTable: {
    id: 'emptyTable',
    name: 'جدول فارغ تماماً (إنشاء مخصص من الصفر)',
    description: 'تفريغ جميع الخانات الـ 28 لتوزيع الحروف يدوياً',
    createLayers: (): LayerInfo[] => [
      { layer: 7, cipherLetters: createNineCipherSlots('ن', 'ق'), arabicLetters: ['', '', '', ''], description: 'الطبقة 7' },
      { layer: 6, cipherLetters: createNineCipherSlots('ح', 'م'), arabicLetters: ['', '', '', ''], description: 'الطبقة 6' },
      { layer: 5, cipherLetters: createNineCipherSlots('ع', 'س'), arabicLetters: ['', '', '', ''], description: 'الطبقة 5' },
      { layer: 4, cipherLetters: createNineCipherSlots('ص', 'ي'), arabicLetters: ['', '', '', ''], description: 'الطبقة 4' },
      { layer: 3, cipherLetters: createNineCipherSlots('ا', 'ل'), arabicLetters: ['', '', '', ''], description: 'الطبقة 3' },
      { layer: 2, cipherLetters: createNineCipherSlots('ط', 'ه'), arabicLetters: ['', '', '', ''], description: 'الطبقة 2' },
      { layer: 1, cipherLetters: createNineCipherSlots('ك', 'ر'), arabicLetters: ['', '', '', ''], description: 'الطبقة 1' },
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


