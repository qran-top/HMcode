// Quranic Lexicon and Dictionary Service
// Provides exact matching and nearest fuzzy matching against 20,000+ words & lemmas
// from the Holy Quran (مفردات وألفاظ القرآن الكريم).

export interface QuranicWordMeta {
  word: string;
  originalQuranicWord: string;
  surahName: string;
  surahNumber: number;
  ayahNum: number;
  occurrences: number;
  isExact: boolean;
  isShaddahVariant?: boolean;
}

export interface QuranicNearestMatch {
  word: string;
  originalQuranicWord: string;
  surahName: string;
  surahNumber: number;
  ayahNum: number;
  distance: number;
  similarity: number; // 0 - 100%
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

/**
 * Returns the 1-114 Surah index number
 */
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

/**
 * Generates the official direct link to the verse on qran-top on GitHub
 * Example: https://qran-top.github.io/#/surah/2?ayah=2
 */
export function getQuranTopAyahUrl(surah: string | number, ayah: number = 1): string {
  const surahNum = getSurahNumber(surah);
  const safeAyah = Math.max(1, ayah || 1);
  return `https://qran-top.github.io/#/surah/${surahNum}?ayah=${safeAyah}`;
}

/**
 * Generates the official search link on qran-top on GitHub
 * Example: https://qran-top.github.io/#/search/%D9%87%D8%A7%D8%B1%D9%88%D9%86
 */
export function getQuranTopSearchUrl(query: string): string {
  const clean = query.trim();
  return `https://qran-top.github.io/#/search/${encodeURIComponent(clean)}`;
}

/**
 * Generates the dictionary lookup URL via Google Search:
 * Example: https://www.google.com/search?q=%D8%AD%D9%85%D8%AF
 */
export function getArabicDictSearchUrl(word: string): string {
  const clean = word.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}

/**
 * Generates the appropriate link on qran-top:
 * If the word occurs multiple times (> 1), links directly to the search page for that word
 * so the user can see all Quranic results.
 * If it occurs only once (= 1), links directly to the exact Surah and Ayah.
 */
export function getQuranTopWordUrl(
  word: string,
  _surah?: string | number,
  _ayah: number = 1,
  _occurrences: number = 1
): string {
  // Always search for the word in the Quran on qran-top as requested
  return getQuranTopSearchUrl(word);
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

function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

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

import { getCipherBaseString } from '../cipherData';

class QuranicDictionaryService {
  private dataMap = new Map<string, [string, number, number, string]>();
  private normalizedMap = new Map<string, string>(); // norm -> original key in dataMap
  private cipherBaseMap = new Map<string, string>(); // cipherBase -> original key in dataMap
  private wordsByLength = new Map<number, string[]>();
  private loaded: boolean = false;
  private loading: boolean = false;
  private listeners: ((loaded: boolean, count: number) => void)[] = [];
  private nearestCache = new Map<string, QuranicNearestMatch | null>();

  constructor() {
    // Populate immediate core set
    this.ingestRecord(INITIAL_CORE_QURANIC);

    // Auto-initiate background load of full dataset
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 50);
    }
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

      // Load both datasets in parallel for maximum Quranic vocabulary coverage
      const [wordsInfoJson, lexiconJson] = await Promise.all([
        fetchFile('quranic_words_info.json'),
        fetchFile('quranic_lexicon.json'),
      ]);

      if (wordsInfoJson) {
        this.ingestRecord(wordsInfoJson as Record<string, [string, number, number, string]>);
      }

      if (lexiconJson) {
        // lexiconJson format: {"word": {"c": count, "s": surahName, "sn": surahNumber, "a": ayahNum, "sample": "..."}}
        const convertedRecord: Record<string, [string, number, number, string]> = {};
        for (const [w, entry] of Object.entries(lexiconJson as Record<string, any>)) {
          if (entry && entry.s) {
            convertedRecord[w] = [entry.s, entry.a || 1, entry.c || 1, w];
            // Also ingest normalized and stripped variations if not present
            const strippedAl = w.replace(/^(وال|فال|بال|كال|لل|ال)/, '');
            if (strippedAl && strippedAl.length >= 2 && !convertedRecord[strippedAl]) {
              convertedRecord[strippedAl] = [entry.s, entry.a || 1, entry.c || 1, w];
            }
          }
        }
        this.ingestRecord(convertedRecord);
      }

      this.loaded = true;
      this.loading = false;
      this.notify();
    } catch (err) {
      console.warn('Quranic dictionary fetch notice (using core set):', err);
      this.loading = false;
      this.loaded = true; // core set is active
      this.notify();
    }
  }

  /**
   * Check if text is an exact Quranic word or lemma
   */
  isQuranic(word: string): boolean {
    if (!word) return false;
    const clean = word.trim();
    if (this.dataMap.has(clean)) return true;
    const nw = normalizeArabicText(clean);
    if (this.normalizedMap.has(nw)) return true;
    const cb = getCipherBaseString(clean);
    if (this.cipherBaseMap.has(cb)) return true;

    if (/(.)\1/.test(clean)) {
      const collapsed = clean.replace(/(.)\1/g, '$1');
      if (this.dataMap.has(collapsed)) return true;
      const nwCol = normalizeArabicText(collapsed);
      if (this.normalizedMap.has(nwCol)) return true;
      const cbCol = getCipherBaseString(collapsed);
      if (this.cipherBaseMap.has(cbCol)) return true;
    }

    return false;
  }

  /**
   * Get rich Quranic metadata for a word (Surah name, Ayah, occurrences)
   */
  getWordDetails(word: string): QuranicWordMeta | null {
    if (!word) return null;
    const clean = word.trim();
    let entry = this.dataMap.get(clean);
    let matchedKey = clean;
    let isShaddahVariant = false;

    if (!entry) {
      const nw = normalizeArabicText(clean);
      const originalKey = this.normalizedMap.get(nw);
      if (originalKey) {
        entry = this.dataMap.get(originalKey);
        matchedKey = originalKey;
      } else {
        // Fallback to phonetic cipher matching (e.g. كفأ matches كفى)
        const cb = getCipherBaseString(clean);
        const cbKey = this.cipherBaseMap.get(cb);
        if (cbKey) {
          entry = this.dataMap.get(cbKey);
          matchedKey = cbKey;
        } else if (/(.)\1/.test(clean)) {
          // Check Shaddah variant (doubled consecutive letters e.g. مدد -> مد)
          const collapsed = clean.replace(/(.)\1/g, '$1');
          let colEntry = this.dataMap.get(collapsed);
          let colKey = collapsed;
          if (!colEntry) {
            const nwCol = normalizeArabicText(collapsed);
            const origColKey = this.normalizedMap.get(nwCol);
            if (origColKey) {
              colEntry = this.dataMap.get(origColKey);
              colKey = origColKey;
            } else {
              const cbCol = getCipherBaseString(collapsed);
              const cbColKey = this.cipherBaseMap.get(cbCol);
              if (cbColKey) {
                colEntry = this.dataMap.get(cbColKey);
                colKey = cbColKey;
              }
            }
          }
          if (colEntry) {
            entry = colEntry;
            matchedKey = colKey;
            isShaddahVariant = true;
          }
        }
      }
    }

    if (!entry) return null;

    const [surahName, ayahNum, occurrences, originalQuranicWord] = entry;
    const surahNumber = getSurahNumber(surahName);
    return {
      word: matchedKey,
      originalQuranicWord: originalQuranicWord || matchedKey,
      surahName,
      surahNumber,
      ayahNum,
      occurrences,
      isExact: true,
      isShaddahVariant,
    };
  }

  /**
   * Find the closest Quranic vocabulary word with high optical similarity
   */
  findClosestQuranicWord(query: string): QuranicNearestMatch | null {
    if (!query || query.length < 2) return null;
    const clean = query.trim();

    if (this.nearestCache.has(clean)) {
      return this.nearestCache.get(clean)!;
    }

    // 1. Exact match check
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
      };
      this.nearestCache.set(clean, match);
      return match;
    }

    // 2. Search nearest in candidate pool (words with length within ± 1)
    const qLen = clean.length;
    // Lengths ± 1 are sufficient for high quality matches (>= 60%)
    const candidateLengths = [qLen, qLen - 1, qLen + 1].filter((len) => len >= 2);

    let bestMatch: QuranicNearestMatch | null = null;
    let minDistance = 999;
    const firstChar = clean[0];

    for (const len of candidateLengths) {
      const words = this.wordsByLength.get(len) || [];
      // Prioritize words that start with the same letter or common root prefix
      let evaluated = 0;
      for (const w of words) {
        // Fast early skip: if lengths are same and first letter differs by a lot, still check, but cap evaluations
        if (evaluated > 350) break;

        // Fast check: if first char matches or length <= 3
        if (w[0] === firstChar || qLen <= 3) {
          evaluated++;
          const d = levenshteinDistance(clean, w);
          if (d < minDistance) {
            minDistance = d;
            const entry = this.dataMap.get(w);
            if (entry) {
              const maxLen = Math.max(clean.length, w.length);
              const similarity = Math.max(0, Math.round((1 - d / maxLen) * 100));
              const surahNumber = getSurahNumber(entry[0]);
              bestMatch = {
                word: w,
                originalQuranicWord: entry[3] || w,
                surahName: entry[0],
                surahNumber,
                ayahNum: entry[1],
                distance: d,
                similarity,
              };
              if (d <= 1 && similarity >= 70) {
                break;
              }
            }
          }
        }
      }
      if (bestMatch && bestMatch.distance <= 1) break;
    }

    this.nearestCache.set(clean, bestMatch);
    return bestMatch;
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
