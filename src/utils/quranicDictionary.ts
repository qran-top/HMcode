// Quranic Lexicon, Orthography Rules, and Complete Corpus Service
// Supports full Uthmani orthography, Dagger Alif (الألف الخنجرية), Shaddah gemination (التضعيف),
// Hamzat & Waslah, Affix stripping, and exhaustive 6,236 Ayah verse matching.

import { getCipherBaseString } from '../cipherData';

export interface QuranicWordMeta {
  word: string;
  originalQuranicWord: string;
  surahName: string;
  surahNumber: number;
  ayahNum: number;
  occurrences: number;
  isExact: boolean;
  isDirectExact?: boolean;
  confidence?: number;
  isShaddahVariant?: boolean;
  isDaggerAlifVariant?: boolean;
  isAffixVariant?: boolean;
  matchRule?: string;
  ayahText?: string;
  sampleAyahText?: string;
}

export interface QuranicNearestMatch {
  word: string;
  originalQuranicWord: string;
  surahName: string;
  surahNumber: number;
  ayahNum: number;
  occurrences?: number;
  distance: number;
  similarity: number; // 0 - 100%
  matchRule?: string;
  ayahText?: string;
  sampleAyahText?: string;
}

export const SURAH_NAMES: string[] = [
  '', // index 0 dummy
  'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة',
  'يونس', 'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم',
  'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت',
  'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر',
  'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات',
  'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر',
  'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة',
  'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات',
  'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر',
  'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة',
  'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون',
  'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'
];

/**
 * 29 Quranic Surahs that open with Disconnected Letters (الأحرف المقطعة في فواتح السور الـ 29)
 */
export const SURAH_MUQATTAAT_MAP: Record<number, string> = {
  2: 'الم',
  3: 'الم',
  7: 'المص',
  10: 'الر',
  11: 'الر',
  12: 'الر',
  13: 'المر',
  14: 'الر',
  15: 'الر',
  19: 'كهيعص',
  20: 'طه',
  26: 'طسم',
  27: 'طس',
  28: 'طسم',
  29: 'الم',
  30: 'الم',
  31: 'الم',
  32: 'الم',
  36: 'يس',
  38: 'ص',
  40: 'حم',
  41: 'حم',
  42: 'حم عسق',
  43: 'حم',
  44: 'حم',
  45: 'حم',
  46: 'حم',
  50: 'ق',
  68: 'ن',
};

export const SURAH_NAME_MUQATTAAT_MAP: Record<string, string> = {
  'البقرة': 'الم',
  'آل عمران': 'الم',
  'ال عمران': 'الم',
  'الأعراف': 'المص',
  'الاعراف': 'المص',
  'يونس': 'الر',
  'هود': 'الر',
  'يوسف': 'الر',
  'الرعد': 'المر',
  'إبراهيم': 'الر',
  'ابراهيم': 'الر',
  'الحجر': 'الر',
  'مريم': 'كهيعص',
  'طه': 'طه',
  'الشعراء': 'طسم',
  'النمل': 'طس',
  'القصص': 'طسم',
  'العنكبوت': 'الم',
  'الروم': 'الم',
  'لقمان': 'الم',
  'السجدة': 'الم',
  'يس': 'يس',
  'ص': 'ص',
  'غافر': 'حم',
  'فصلت': 'حم',
  'الشورى': 'حم عسق',
  'الزخرف': 'حم',
  'الدخان': 'حم',
  'الجاثية': 'حم',
  'الأحقاف': 'حم',
  'الاحقاف': 'حم',
  'ق': 'ق',
  'القلم': 'ن',
};

export function getSurahMuqattaat(surahNumber?: number, surahName?: string): string | null {
  if (surahNumber && SURAH_MUQATTAAT_MAP[surahNumber]) {
    return SURAH_MUQATTAAT_MAP[surahNumber];
  }
  if (surahName) {
    const clean = surahName.replace(/^سورة\s+/, '').trim();
    if (SURAH_NAME_MUQATTAAT_MAP[clean]) {
      return SURAH_NAME_MUQATTAAT_MAP[clean];
    }
  }
  return null;
}

export function getSurahNumber(nameOrNum: string | number): number {
  if (typeof nameOrNum === 'number' && nameOrNum >= 1 && nameOrNum <= 114) {
    return nameOrNum;
  }
  const clean = String(nameOrNum).replace(/^سورة\s+/, '').trim();
  const norm = normalizeArabicText(clean);
  for (let i = 1; i <= 114; i++) {
    if (SURAH_NAMES[i] === clean || normalizeArabicText(SURAH_NAMES[i]) === norm) {
      return i;
    }
  }
  return 1;
}

export function getQuranTopAyahUrl(surah: string | number, ayah: number = 1): string {
  const surahNum = getSurahNumber(surah);
  const safeAyah = Math.max(1, ayah || 1);
  return `https://qran-top.github.io/#/surah/${surahNum}?ayah=${safeAyah}`;
}

export function getQuranTopSearchUrl(query: string): string {
  const clean = query.trim();
  return `https://qran-top.github.io/#/search/${encodeURIComponent(clean)}`;
}

export function getQuranTopWordUrl(
  word: string,
  _surah?: string | number,
  _ayah: number = 1,
  _occurrences: number = 1
): string {
  return getQuranTopSearchUrl(word);
}

export function getArabicDictSearchUrl(word: string): string {
  const clean = word.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}

/**
 * Normalization function that handles Uthmani signs, diacritics, and basic letter unification
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06E0-\u06EC\u0610-\u061A]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .trim();
}

/**
 * Specialized Dagger Alif & Uthmani Orthography Word Expansion (قواعد الألف الخنجرية والرسم العثماني)
 */
export const DAGGER_ALIF_SPECIAL_MAP: Record<string, string[]> = {
  'رحمن': ['رحمٰن', 'رحمان'],
  'رحمان': ['رحمن', 'رحمٰن'],
  'صلوة': ['صلاة', 'صلوٰة'],
  'صلاة': ['صلوة', 'صلوٰة'],
  'زكوة': ['زكاة', 'زكوٰة'],
  'زكاة': ['زكوة', 'زكوٰة'],
  'حيوة': ['حياة', 'حيوٰة'],
  'حياة': ['حيوة', 'حيوٰة'],
  'هذا': ['هٰذا', 'هاذا'],
  'هاذا': ['هذا', 'هٰذا'],
  'هذه': ['هٰذه', 'هاذه'],
  'ذلك': ['ذٰلك', 'ذالك'],
  'ذالك': ['ذلك', 'ذٰلك'],
  'اله': ['إلٰه', 'إلاه', 'إله', 'الاه'],
  'إله': ['إلٰه', 'إلاه', 'اله', 'الاه'],
  'إلاه': ['إله', 'اله', 'إلٰه'],
  'سموات': ['سماوات', 'سمٰوٰت'],
  'سماوات': ['سموات', 'سمٰوٰت'],
  'اسمعيل': ['إسماعيل', 'إسمـٰعيل'],
  'إسماعيل': ['اسمعيل', 'إسمـٰعيل'],
  'اسحق': ['إسحاق', 'إسحـٰق'],
  'إسحاق': ['اسحق', 'إسحـٰق'],
  'ابرهيم': ['إبراهيم', 'إبرٰهيم'],
  'إبراهيم': ['ابرهيم', 'إبرٰهيم'],
  'هرون': ['هارون', 'هـٰرون'],
  'هارون': ['هرون', 'هـٰرون'],
  'سلـمن': ['سليمان'],
  'سليمان': ['سلـمن'],
  'داود': ['داوود'],
  'داوود': ['داود'],
  'ربوا': ['ربا', 'ربوٰا'],
  'ربا': ['ربوا', 'ربوٰا'],
  'مشكوة': ['مشكاة', 'مشكوٰة'],
  'مشكاة': ['مشكوة', 'مشكوٰة'],
  // Alif Maqsura is Double Alif (الألف المقصورة = دبل ا / اا)
  'هدى': ['هداا', 'هدا'],
  'هداا': ['هدى', 'هدا'],
  'موسى': ['موساا', 'موسا'],
  'موساا': ['موسى', 'موسا'],
  'عيسى': ['عيساا', 'عيسا'],
  'عيساا': ['عيسى', 'عيسا'],
  'ضحى': ['ضحاا', 'ضحا'],
  'ضحاا': ['ضحى', 'ضحا'],
  'سعى': ['سعاا', 'سعا'],
  'سعاا': ['سعى', 'سعا'],
  'قضى': ['قضاا', 'قضا'],
  'قضاا': ['قضى', 'قضا'],
  'أتى': ['أتاا', 'اتاا', 'أتا'],
  'أتاا': ['أتى', 'اتا', 'أتا'],
  'اتاا': ['أتى', 'اتى', 'أتا'],
  'رعى': ['رعاا', 'رعا'],
  'رعاا': ['رعى', 'رعا'],
  'فتى': ['فتاا', 'فتا'],
  'فتاا': ['فتى', 'فتا'],
  'طوى': ['طواا', 'طوا'],
  'طواا': ['طوى', 'طوا'],
  'قرى': ['قراا', 'قرا'],
  'قراا': ['قرى', 'قرا'],
  'توى': ['تواا', 'توا'],
  'تواا': ['توى', 'توا'],
};

// Common Quranic prefixes and suffixes for rule evaluation
const QURANIC_PREFIXES = ['وال', 'فال', 'بال', 'كال', 'ولل', 'فلل', 'لل', 'ال', 'وب', 'فب', 'ول', 'فل', 'و', 'ف', 'ب', 'ك', 'ل', 'س'];
const QURANIC_SUFFIXES = ['هم', 'هن', 'ها', 'كم', 'كن', 'نا', 'ات', 'ين', 'ون', 'ان', 'وا', 'تم', 'تن', 'ني', 'ي', 'ك', 'ه', 'ة'];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// Built-in immediate core set of prominent Quranic vocabulary (instant 0ms availability)
const INITIAL_CORE_QURANIC: Record<string, [string, number, number, string]> = {
  'وقب': ['الفلق', 3, 1, 'وقب'],
  'غاسق': ['الفلق', 3, 1, 'غاسق'],
  'الفلق': ['الفلق', 1, 1, 'الفلق'],
  'فلق': ['الفلق', 1, 1, 'الفلق'],
  'صمد': ['الإخلاص', 2, 1, 'الصمد'],
  'الصمد': ['الإخلاص', 2, 1, 'الصمد'],
  'أحد': ['الإخلاص', 1, 30, 'أحد'],
  'احد': ['الإخلاص', 1, 30, 'أحد'],
  'كفو': ['الإخلاص', 4, 1, 'كفوا'],
  'مسد': ['المسد', 5, 1, 'مسد'],
  'لهب': ['المسد', 1, 1, 'لهب'],
  'نصر': ['النصر', 1, 22, 'نصر'],
  'فتح': ['النصر', 1, 28, 'الفتح'],
  'كوثر': ['الكوثر', 1, 1, 'الكوثر'],
  'ماعون': ['الماعون', 7, 1, 'الماعون'],
  'قريش': ['قريش', 1, 1, 'قريش'],
  'فيل': ['الفيل', 1, 1, 'الفيل'],
  'همزة': ['الهمزة', 1, 1, 'همزة'],
  'عصر': ['العصر', 1, 1, 'العصر'],
  'قارعة': ['القارعة', 1, 1, 'القارعة'],
  'زلزلة': ['الزلزلة', 1, 1, 'الزلزلة'],
  'قدر': ['القدر', 1, 1, 'القدر'],
  'علق': ['العلق', 2, 1, 'علق'],
  'تين': ['التين', 1, 1, 'التين'],
  'زيتون': ['التين', 1, 1, 'الزيتون'],
  'شرح': ['الشرح', 1, 1, 'نشرح'],
  'ضحى': ['الضحى', 1, 1, 'الضحى'],
  'ليل': ['الليل', 1, 92, 'الليل'],
  'شمس': ['الشمس', 1, 33, 'الشمس'],
  'قمر': ['القمر', 1, 27, 'القمر'],
  'نور': ['المائدة', 15, 8, 'نور'],
  'ملك': ['البقرة', 102, 31, 'ملك'],
  'علم': ['العلق', 4, 105, 'علم'],
  'حق': ['البقرة', 26, 247, 'الحق'],
  'رب': ['الفاتحة', 2, 975, 'رب'],
  'سلام': ['الأنعام', 54, 42, 'سلام'],
  'كتاب': ['البقرة', 2, 260, 'الكتاب'],
  'حكيم': ['البقرة', 32, 97, 'حكيم'],
  'عليم': ['البقرة', 29, 162, 'عليم'],
  'قدير': ['البقرة', 20, 45, 'قدير'],
  'سميع': ['البقرة', 127, 47, 'سميع'],
  'بصير': ['البقرة', 96, 53, 'بصير'],
  'رحمن': ['الفاتحة', 1, 57, 'الرحمن'],
  'رحيم': ['الفاتحة', 1, 115, 'الرحيم'],
  'غفور': ['البقرة', 173, 91, 'غفور'],
  'حليم': ['البقرة', 225, 15, 'حليم'],
  'عظيم': ['البقرة', 7, 107, 'عظيم'],
  'جنة': ['البقرة', 25, 66, 'جنة'],
  'نار': ['البقرة', 24, 145, 'نار'],
  'ماء': ['البقرة', 22, 63, 'ماء'],
  'سماء': ['البقرة', 19, 120, 'السماء'],
  'أرض': ['البقرة', 11, 461, 'الأرض'],
  'ارض': ['البقرة', 11, 461, 'الأرض'],
  'قلب': ['البقرة', 10, 168, 'قلوبهم'],
  'روح': ['الإسراء', 85, 21, 'الروح'],
  'صبر': ['البقرة', 45, 103, 'الصبر'],
  'شكر': ['البقرة', 52, 75, 'تشكرون'],
  'حمد': ['الفاتحة', 2, 68, 'الحمد'],
  'ذكر': ['البقرة', 152, 292, 'فاذكروني'],
  'توبة': ['التوبة', 104, 87, 'التوبة'],
  'صلاة': ['البقرة', 3, 83, 'الصلاة'],
  'زكاة': ['البقرة', 43, 32, 'الزكاة'],
  'صوم': ['البقرة', 187, 14, 'الصيام'],
  'حج': ['البقرة', 158, 12, 'الحج'],
  'عمرة': ['البقرة', 196, 2, 'العمرة'],
  'صدقة': ['البقرة', 196, 12, 'صدقة'],
  'معروف': ['البقرة', 178, 38, 'المعروف'],
  'إحسان': ['البقرة', 83, 12, 'إحسانا'],
  'تقوى': ['البقرة', 197, 17, 'التقوى'],
  'إيمان': ['البقرة', 108, 45, 'الإيمان'],
  'إسلام': ['آل عمران', 19, 8, 'الإسلام'],
  'قرآن': ['البقرة', 185, 70, 'القرآن'],
  'فرقان': ['البقرة', 53, 7, 'الفرقان'],
  'توراة': ['آل عمران', 3, 18, 'التوراة'],
  'إنجيل': ['آل عمران', 3, 12, 'الإنجيل'],
  'زبور': ['النساء', 163, 3, 'زبورا'],
  'صحف': ['طه', 133, 8, 'الصحف'],
  'ملكوت': ['الأنعام', 75, 4, 'ملكوت'],
  'عرش': ['يونس', 3, 26, 'العرش'],
  'كرسي': ['البقرة', 255, 1, 'كرسيه'],
  'لوح': ['البروج', 22, 1, 'لوح'],
  'قلم': ['القلم', 1, 2, 'القلم'],
  'نبي': ['البقرة', 61, 75, 'النبيين'],
  'رسول': ['البقرة', 101, 332, 'رسول'],
  'إمام': ['البقرة', 124, 8, 'إماما'],
  'شهيد': ['البقرة', 143, 35, 'شهيدا'],
  'صديق': ['النساء', 69, 6, 'الصديقين'],
  'صالح': ['البقرة', 62, 136, 'صالحا'],
  'ولي': ['البقرة', 107, 86, 'ولي'],
  'نصير': ['البقرة', 107, 24, 'نصير'],
  'وكيل': ['آل عمران', 173, 24, 'وكيل'],
  'حسيب': ['النساء', 6, 4, 'حسيبا'],
  'رقيب': ['النساء', 1, 3, 'رقيبا'],
  'مبين': ['البقرة', 168, 119, 'مبين'],
};

class QuranicDictionaryService {
  private dataMap = new Map<string, [string, number, number, string]>();
  private normalizedMap = new Map<string, string>(); // norm -> original key in dataMap
  private cipherBaseMap = new Map<string, string>(); // cipherBase -> original key in dataMap
  private wordsByLength = new Map<number, string[]>();
  private sampleMap = new Map<string, string>(); // word -> verse sample snippet
  private ayahsMap = new Map<string, string>(); // 'surahNum:ayahNum' -> full Ayah text
  private allAyahsList: { sn: number; s: string; a: number; t: string; norm: string }[] = [];
  private loaded: boolean = false;
  private loading: boolean = false;
  private listeners: ((loaded: boolean, count: number) => void)[] = [];
  private nearestCache = new Map<string, QuranicNearestMatch | null>();
  private detailsCache = new Map<string, QuranicWordMeta | null>();

  constructor() {
    // Populate immediate core set
    this.ingestRecord(INITIAL_CORE_QURANIC);

    // Auto-initiate background load of full dataset
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 50);
    }
  }

  private ingestWord(w: string, surahName: string, ayahNum: number, occurrences: number = 1, originalQuranicWord?: string, sample?: string) {
    if (!w || w.length < 2) return;
    const cleanW = w.trim();
    if (!this.dataMap.has(cleanW)) {
      this.dataMap.set(cleanW, [surahName, ayahNum, occurrences, originalQuranicWord || cleanW]);
    }
    if (sample && !this.sampleMap.has(cleanW)) {
      this.sampleMap.set(cleanW, sample);
    }
    const nw = normalizeArabicText(cleanW);
    if (!this.normalizedMap.has(nw)) {
      this.normalizedMap.set(nw, cleanW);
    }
    const cb = getCipherBaseString(cleanW);
    if (!this.cipherBaseMap.has(cb)) {
      this.cipherBaseMap.set(cb, cleanW);
    }
    const l = cleanW.length;
    if (!this.wordsByLength.has(l)) {
      this.wordsByLength.set(l, []);
    }
    this.wordsByLength.get(l)!.push(cleanW);
  }

  private ingestRecord(record: Record<string, [string, number, number, string]>) {
    for (const [w, val] of Object.entries(record)) {
      this.dataMap.set(w, val);
      const nw = normalizeArabicText(w);
      if (!this.normalizedMap.has(nw)) {
        this.normalizedMap.set(nw, w);
      }
      const cb = getCipherBaseString(w);
      if (!this.cipherBaseMap.has(cb)) {
        this.cipherBaseMap.set(cb, w);
      }
      const l = w.length;
      if (!this.wordsByLength.has(l)) {
        this.wordsByLength.set(l, []);
      }
      this.wordsByLength.get(l)!.push(w);
    }
  }

  subscribe(listener: (loaded: boolean, count: number) => void) {
    this.listeners.push(listener);
    listener(this.loaded, this.dataMap.size);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      l(this.loaded, this.dataMap.size);
    }
  }

  async init(): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;

    try {
      const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

      const fetchFile = async (filename: string): Promise<any | null> => {
        const candidateUrls: string[] = [
          `${cleanBase}${filename}`,
          `/${filename}`,
          `./${filename}`,
        ];
        if (typeof window !== 'undefined' && window.location) {
          try {
            candidateUrls.push(new URL(filename, window.location.href).href);
          } catch {}
          if (window.location.origin && window.location.origin !== 'null') {
            candidateUrls.push(`${window.location.origin}/${filename}`);
          }
        }
        const uniqueUrls = Array.from(new Set(candidateUrls));
        for (const u of uniqueUrls) {
          try {
            const res = await fetch(u);
            if (res.ok) {
              return await res.json();
            }
          } catch {}
        }
        return null;
      };

      const fetchTextFile = async (filename: string): Promise<string | null> => {
        const candidateUrls: string[] = [
          `${cleanBase}${filename}`,
          `/${filename}`,
          `./${filename}`,
        ];
        if (typeof window !== 'undefined' && window.location) {
          try {
            candidateUrls.push(new URL(filename, window.location.href).href);
          } catch {}
          if (window.location.origin && window.location.origin !== 'null') {
            candidateUrls.push(`${window.location.origin}/${filename}`);
          }
        }
        const uniqueUrls = Array.from(new Set(candidateUrls));
        for (const u of uniqueUrls) {
          try {
            const res = await fetch(u);
            if (res.ok) {
              return await res.text();
            }
          } catch {}
        }
        return null;
      };

      // Load all datasets in parallel for complete Quranic vocabulary and full Ayahs
      const [wordsInfoJson, lexiconJson, completeAyahsJson, wordsTxt] = await Promise.all([
        fetchFile('quranic_words_info.json'),
        fetchFile('quranic_lexicon.json'),
        fetchFile('quran_complete_ayahs.json'),
        fetchTextFile('quranic_words.txt'),
      ]);

      if (wordsInfoJson) {
        this.ingestRecord(wordsInfoJson as Record<string, [string, number, number, string]>);
      }

      if (lexiconJson) {
        for (const [w, entry] of Object.entries(lexiconJson as Record<string, any>)) {
          if (entry && entry.s) {
            this.ingestWord(w, entry.s, entry.a || 1, entry.c || 1, w, entry.sample);
            const strippedAl = w.replace(/^(وال|فال|بال|كال|لل|ال)/, '');
            if (strippedAl && strippedAl.length >= 2) {
              this.ingestWord(strippedAl, entry.s, entry.a || 1, entry.c || 1, w, entry.sample);
            }
          }
        }
      }

      if (Array.isArray(completeAyahsJson)) {
        this.allAyahsList = [];
        for (const item of completeAyahsJson) {
          const sn = item.sn || item.surahNumber || 1;
          const a = item.a || item.ayahNumber || 1;
          const text = item.t || item.text || '';
          const sName = item.s || SURAH_NAMES[sn] || 'القرآن الكريم';
          if (text) {
            this.ayahsMap.set(`${sn}:${a}`, text);
            this.ayahsMap.set(`${sName}:${a}`, text);
            const cleanS = String(sName).replace(/^سورة\s+/, '').trim();
            this.ayahsMap.set(`${cleanS}:${a}`, text);
            this.allAyahsList.push({
              sn,
              s: sName,
              a,
              t: text,
              norm: normalizeArabicText(text),
            });

            // Index individual words in the Ayah
            const tokens = text.split(/\s+/);
            for (const rawToken of tokens) {
              const cleanToken = rawToken.replace(/[^ء-ي]/g, '');
              if (cleanToken.length >= 2 && !this.dataMap.has(cleanToken)) {
                this.ingestWord(cleanToken, sName, a, 1, rawToken, text);
              }
            }
          }
        }
      }

      if (wordsTxt) {
        const lines = wordsTxt.split(/\r?\n/);
        for (const line of lines) {
          const w = line.trim();
          if (w.length >= 2 && !this.dataMap.has(w)) {
            this.ingestWord(w, 'القرآن الكريم', 1, 1, w);
          }
        }
      }

      this.loaded = true;
      this.loading = false;
      this.notify();
    } catch (err) {
      console.warn('Quranic dictionary fetch notice (using core set):', err);
      this.loading = false;
      this.loaded = true;
      this.notify();
    }
  }

  getAyahText(surahNumberOrName: number | string, ayahNum: number): string | null {
    if (typeof surahNumberOrName === 'number') {
      const byNum = this.ayahsMap.get(`${surahNumberOrName}:${ayahNum}`);
      if (byNum) return byNum;
      const surahName = SURAH_NAMES[surahNumberOrName];
      if (surahName) {
        const byName = this.ayahsMap.get(`${surahName}:${ayahNum}`);
        if (byName) return byName;
      }
    } else {
      const cleanName = String(surahNumberOrName).replace(/^سورة\s+/, '').trim();
      const byName = this.ayahsMap.get(`${cleanName}:${ayahNum}`) || this.ayahsMap.get(`${surahNumberOrName}:${ayahNum}`);
      if (byName) return byName;
      const sNum = getSurahNumber(cleanName);
      if (sNum > 0) {
        const byNum = this.ayahsMap.get(`${sNum}:${ayahNum}`);
        if (byNum) return byNum;
      }
    }
    return null;
  }

  getAyahForWord(word: string, fallbackSurahName?: string, fallbackAyahNum?: number): { surahName: string; surahNumber: number; ayahNum: number; ayahText: string; sample?: string } | null {
    const details = this.getWordDetails(word);
    const surahName = details?.surahName || fallbackSurahName || '';
    const surahNumber = details?.surahNumber || (surahName ? getSurahNumber(surahName) : 0);
    const ayahNum = details?.ayahNum || fallbackAyahNum || 1;
    const sample = this.sampleMap.get(word) || details?.sampleAyahText;

    if (surahNumber > 0 || surahName) {
      const fullText = this.getAyahText(surahNumber > 0 ? surahNumber : surahName, ayahNum);
      if (fullText) {
        return {
          surahName: surahName || SURAH_NAMES[surahNumber] || 'القرآن الكريم',
          surahNumber: surahNumber > 0 ? surahNumber : getSurahNumber(surahName),
          ayahNum,
          ayahText: fullText,
          sample,
        };
      }
    }

    // Direct scan across all verses for the word
    if (this.allAyahsList.length > 0) {
      const normWord = normalizeArabicText(word);
      const foundAyah = this.allAyahsList.find((ay) => ay.norm.includes(normWord));
      if (foundAyah) {
        return {
          surahName: foundAyah.s,
          surahNumber: foundAyah.sn,
          ayahNum: foundAyah.a,
          ayahText: foundAyah.t,
          sample: foundAyah.t,
        };
      }
    }

    if (sample) {
      return {
        surahName: surahName || 'القرآن الكريم',
        surahNumber: surahNumber > 0 ? surahNumber : 1,
        ayahNum,
        ayahText: sample,
        sample,
      };
    }

    return null;
  }

  isQuranic(word: string): boolean {
    return this.getWordDetails(word) !== null;
  }

  /**
   * Comprehensive Multi-Rule Quranic Matcher
   * Implements Dagger Alif (الألف الخنجرية), Shaddah Gemination (التضعيف),
   * Waslah & Hamzat, Prefix & Affix evaluation, and direct Ayah searching.
   */
  getWordDetails(word: string): QuranicWordMeta | null {
    if (!word) return null;
    const clean = word.trim();
    if (clean.length < 2) return null;

    if (this.detailsCache.has(clean)) {
      return this.detailsCache.get(clean)!;
    }

    // Rule 1: Exact entry in dictionary
    let entry = this.dataMap.get(clean);
    let matchedKey = clean;
    let matchRule = 'تطابق قرآني مباشر';
    let isDirectExact = false;
    let confidence = 100;
    let isShaddahVariant = false;
    let isDaggerAlifVariant = false;
    let isAffixVariant = false;

    if (entry) {
      isDirectExact = true;
      confidence = 100;
    }

    // Rule 2: Dagger Alif & Orthography Map (الألف الخنجرية)
    if (!entry && DAGGER_ALIF_SPECIAL_MAP[clean]) {
      for (const alt of DAGGER_ALIF_SPECIAL_MAP[clean]) {
        if (this.dataMap.has(alt)) {
          entry = this.dataMap.get(alt);
          matchedKey = alt;
          isDaggerAlifVariant = true;
          isDirectExact = false;
          confidence = 95;
          matchRule = `قاعدة الألف الخنجرية والرسم العثماني (${alt})`;
          break;
        }
      }
    }

    // Rule 3: Normalized Orthographic Match (أ / إ / آ / ٱ / ى / ة)
    if (!entry) {
      const nw = normalizeArabicText(clean);
      const originalKey = this.normalizedMap.get(nw);
      if (originalKey) {
        entry = this.dataMap.get(originalKey);
        matchedKey = originalKey;
        isDirectExact = (clean === originalKey);
        confidence = (clean === originalKey) ? 100 : 96;
        matchRule = 'تطابق قرآني مع توحيد الهمزات والياء والألف';
      }
    }

    // Rule 4: Shaddah Gemination Contraction & Expansion (التضعيف وفكه: مدد <-> مد)
    if (!entry) {
      if (/(.)\1/.test(clean)) {
        const collapsed = clean.replace(/(.)\1/g, '$1');
        let colEntry = this.dataMap.get(collapsed);
        let colKey = collapsed;
        if (!colEntry) {
          const nwCol = normalizeArabicText(collapsed);
          const origColKey = this.normalizedMap.get(nwCol);
          if (origColKey) {
            colEntry = this.dataMap.get(origColKey);
            colKey = origColKey;
          }
        }
        if (colEntry) {
          entry = colEntry;
          matchedKey = colKey;
          isShaddahVariant = true;
          isDirectExact = false;
          confidence = 92;
          matchRule = `تطابق قرآني بدمج التضعيف المشدد (${colKey})`;
        }
      } else {
        // Expand last char if double candidate e.g. مد -> مدد
        const lastChar = clean[clean.length - 1];
        const expanded = clean + lastChar;
        let expEntry = this.dataMap.get(expanded);
        if (expEntry) {
          entry = expEntry;
          matchedKey = expanded;
          isShaddahVariant = true;
          isDirectExact = false;
          confidence = 92;
          matchRule = `تطابق قرآني بفك تضعيف الحرف (${expanded})`;
        }
      }
    }

    // Rule 4.5: Alif Maqsura as Double Alif Rule (قاعدة الألف المقصورة كدبل ألف: ى ↔ اا)
    if (!entry) {
      if (clean.includes('اا')) {
        const withMaqsuraEnd = clean.replace(/اا$/, 'ى');
        const withMaqsuraAll = clean.replace(/اا/g, 'ى');
        for (const cand of [withMaqsuraEnd, withMaqsuraAll]) {
          if (this.dataMap.has(cand)) {
            entry = this.dataMap.get(cand);
            matchedKey = cand;
            isDirectExact = false;
            confidence = 93;
            matchRule = `قاعدة الألف المقصورة كدبل ألف (${clean} ↔ ${cand})`;
            break;
          }
          const nCand = normalizeArabicText(cand);
          const origKey = this.normalizedMap.get(nCand);
          if (origKey) {
            entry = this.dataMap.get(origKey);
            matchedKey = origKey;
            isDirectExact = false;
            confidence = 93;
            matchRule = `قاعدة الألف المقصورة كدبل ألف (${clean} ↔ ${origKey})`;
            break;
          }
        }
      } else if (clean.includes('ى') || clean.endsWith('ا')) {
        const withDoubleAlifEnd = clean.replace(/ى$/, 'اا');
        const withDoubleAlifAll = clean.replace(/ى/g, 'اا');
        for (const cand of [withDoubleAlifEnd, withDoubleAlifAll]) {
          if (cand !== clean && this.dataMap.has(cand)) {
            entry = this.dataMap.get(cand);
            matchedKey = cand;
            isDirectExact = false;
            confidence = 93;
            matchRule = `قاعدة الألف المقصورة كدبل ألف (${clean} ↔ ${cand})`;
            break;
          }
          const nCand = normalizeArabicText(cand);
          const origKey = this.normalizedMap.get(nCand);
          if (origKey && origKey !== clean) {
            entry = this.dataMap.get(origKey);
            matchedKey = origKey;
            isDirectExact = false;
            confidence = 93;
            matchRule = `قاعدة الألف المقصورة كدبل ألف (${clean} ↔ ${origKey})`;
            break;
          }
        }
      }
    }

    // Rule 5: Prefix and Suffix Stripping / Affix Scanning (السوابق واللواحق القرآنية)
    if (!entry) {
      for (const p of QURANIC_PREFIXES) {
        if (clean.startsWith(p) && clean.length - p.length >= 2) {
          const sub = clean.slice(p.length);
          if (this.dataMap.has(sub)) {
            entry = this.dataMap.get(sub);
            matchedKey = sub;
            isAffixVariant = true;
            isDirectExact = false;
            const diff = clean.length - sub.length;
            confidence = Math.max(75, 90 - diff * 3);
            matchRule = `مفردة قرآنية بإسقاط السابقة (${p})`;
            break;
          }
          const nwSub = normalizeArabicText(sub);
          const origSub = this.normalizedMap.get(nwSub);
          if (origSub) {
            entry = this.dataMap.get(origSub);
            matchedKey = origSub;
            isAffixVariant = true;
            isDirectExact = false;
            const diff = clean.length - origSub.length;
            confidence = Math.max(75, 90 - diff * 3);
            matchRule = `مفردة قرآنية بإسقاط السابقة (${p})`;
            break;
          }
        }
      }
    }

    if (!entry) {
      for (const s of QURANIC_SUFFIXES) {
        if (clean.endsWith(s) && clean.length - s.length >= 2) {
          const sub = clean.slice(0, clean.length - s.length);
          if (this.dataMap.has(sub)) {
            entry = this.dataMap.get(sub);
            matchedKey = sub;
            isAffixVariant = true;
            isDirectExact = false;
            const diff = clean.length - sub.length;
            confidence = Math.max(75, 90 - diff * 3);
            matchRule = `مفردة قرآنية بإسقاط اللاحقة (${s})`;
            break;
          }
          const nwSub = normalizeArabicText(sub);
          const origSub = this.normalizedMap.get(nwSub);
          if (origSub) {
            entry = this.dataMap.get(origSub);
            matchedKey = origSub;
            isAffixVariant = true;
            isDirectExact = false;
            const diff = clean.length - origSub.length;
            confidence = Math.max(75, 90 - diff * 3);
            matchRule = `مفردة قرآنية بإسقاط اللاحقة (${s})`;
            break;
          }
        }
      }
    }

    // Rule 6: Cipher / Phonetic Base
    if (!entry) {
      const cb = getCipherBaseString(clean);
      const cbKey = this.cipherBaseMap.get(cb);
      if (cbKey) {
        entry = this.dataMap.get(cbKey);
        matchedKey = cbKey;
        isDirectExact = false;
        confidence = 85;
        matchRule = 'تطابق تقاربي في قاعدة التشفير القرآنية';
      }
    }

    if (!entry) {
      this.detailsCache.set(clean, null);
      return null;
    }

    const [surahName, ayahNum, occurrences, originalQuranicWord] = entry;
    const surahNumber = getSurahNumber(surahName);
    const sample = this.sampleMap.get(matchedKey) || this.sampleMap.get(clean);
    const ayahText = this.getAyahText(surahNumber, ayahNum) || sample;

    const res: QuranicWordMeta = {
      word: matchedKey,
      originalQuranicWord: originalQuranicWord || matchedKey,
      surahName,
      surahNumber,
      ayahNum,
      occurrences,
      isExact: true,
      isDirectExact: isDirectExact && clean === matchedKey,
      confidence: (isDirectExact && clean === matchedKey) ? 100 : Math.min(confidence, 95),
      isShaddahVariant,
      isDaggerAlifVariant,
      isAffixVariant,
      matchRule,
      ayahText: ayahText || undefined,
      sampleAyahText: sample || undefined,
    };

    this.detailsCache.set(clean, res);
    return res;
  }

  findClosestQuranicWord(query: string): QuranicNearestMatch | null {
    if (!query || query.length < 2) return null;
    const clean = query.trim();

    if (this.nearestCache.has(clean)) {
      return this.nearestCache.get(clean)!;
    }

    // 1. Exact or rule-based match
    const exact = this.getWordDetails(clean);
    if (exact) {
      const match: QuranicNearestMatch = {
        word: exact.word,
        originalQuranicWord: exact.originalQuranicWord,
        surahName: exact.surahName,
        surahNumber: exact.surahNumber,
        ayahNum: exact.ayahNum,
        distance: 0,
        similarity: 100,
        matchRule: exact.matchRule,
        ayahText: exact.ayahText,
        sampleAyahText: exact.sampleAyahText,
      };
      this.nearestCache.set(clean, match);
      return match;
    }

    // 2. Nearest in candidate pool
    const qLen = clean.length;
    const candidateLengths = [qLen, qLen - 1, qLen + 1].filter((len) => len >= 2);

    let bestMatch: QuranicNearestMatch | null = null;
    let minDistance = 999;
    const firstChar = clean[0];

    for (const len of candidateLengths) {
      const words = this.wordsByLength.get(len) || [];
      let evaluated = 0;
      for (const w of words) {
        if (evaluated > 350) break;
        if (w[0] === firstChar || qLen <= 3) {
          evaluated++;
          const d = levenshteinDistance(clean, w);
          if (d < minDistance) {
            minDistance = d;
            const entry = this.dataMap.get(w);
            if (entry) {
              const maxLen = Math.max(clean.length, w.length);
              const similarity = Math.min(95, Math.max(0, Math.round((1 - d / maxLen) * 100)));
              const surahNumber = getSurahNumber(entry[0]);
              const sample = this.sampleMap.get(w);
              const ayahText = this.getAyahText(surahNumber, entry[1]) || sample;
              bestMatch = {
                word: w,
                originalQuranicWord: entry[3] || w,
                surahName: entry[0],
                surahNumber,
                ayahNum: entry[1],
                occurrences: entry[2] || 1,
                distance: d,
                similarity,
                matchRule: `تقارب لفظي (${similarity}%)`,
                ayahText: ayahText || undefined,
                sampleAyahText: sample || undefined,
              };
              if (d <= 1 && similarity >= 70) break;
            }
          }
        }
      }
      if (bestMatch && bestMatch.distance <= 1) break;
    }

    this.nearestCache.set(clean, bestMatch);
    return bestMatch;
  }

  /**
   * Asynchronous Progressive Quranic Search with Real Frame-by-Frame Progress Reporting
   */
  async searchQuranicWordsAsync(
    words: { word: string; isReversed: boolean; original?: string }[],
    onProgress?: (percent: number, currentItem: string) => void
  ): Promise<{ word: string; meta: QuranicWordMeta; isReversed: boolean; original?: string }[]> {
    const results: { word: string; meta: QuranicWordMeta; isReversed: boolean; original?: string }[] = [];
    const seen = new Set<string>();
    const total = words.length;
    if (total === 0) {
      if (onProgress) onProgress(100, '');
      return results;
    }

    let processed = 0;
    const CHUNK = 100;

    for (let i = 0; i < total; i += CHUNK) {
      const slice = words.slice(i, i + CHUNK);
      for (const item of slice) {
        if (!seen.has(item.word)) {
          const meta = this.getWordDetails(item.word);
          if (meta) {
            seen.add(item.word);
            results.push({ word: item.word, meta, isReversed: item.isReversed, original: item.original });
          }
        }
      }
      processed += slice.length;
      if (onProgress) {
        const p = Math.min(100, Math.round((processed / total) * 100));
        onProgress(p, slice[slice.length - 1]?.word || '');
      }
      // Instant non-blocking yield for UI rendering
      await new Promise((r) => setTimeout(r, 0));
    }

    if (onProgress) onProgress(100, 'اكتمل مسح المصحف الشريف');
    return results;
  }

  getWordCount(): number {
    return this.dataMap.size;
  }

  getAllKeys(): string[] {
    return Array.from(this.dataMap.keys());
  }

  getAllWords(): QuranicWordMeta[] {
    const list: QuranicWordMeta[] = [];
    for (const [w, entry] of this.dataMap.entries()) {
      const [surahName, ayahNum, occurrences, originalQuranicWord] = entry;
      list.push({
        word: w,
        originalQuranicWord: originalQuranicWord || w,
        surahName,
        surahNumber: getSurahNumber(surahName),
        ayahNum,
        occurrences,
        isExact: true,
      });
    }
    return list;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const quranicDictionary = new QuranicDictionaryService();
