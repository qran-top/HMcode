import { getCipherBaseString } from '../cipherData';
import { ARABIC_COMMON_LEXICON_PARTS } from './arabicLexiconParts';

export interface ArabicDictMatchMeta {
  word: string;
  matchedLemma: string;
  root?: string;
  weight?: string;
  matchType: 'exact' | 'orthographic' | 'shaddah' | 'affix_stripped' | 'root_derived' | 'cipher_phonetic';
  matchTypeLabel: string;
  confidence: number; // 0 - 100%
}

// Common Arabic roots & patterns helper for advanced lemmatization
const COMMON_PREFIXES = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل', 'س', 'ي', 'ت', 'ن', 'ا', 'م', 'است'];
const COMMON_SUFFIXES = ['هم', 'هن', 'ها', 'كم', 'كن', 'نا', 'ات', 'ين', 'ون', 'ان', 'وا', 'تم', 'تن', 'تما', 'هما', 'ني', 'ي', 'ك', 'ه', 'ة'];

export function normalizeArabicForDict(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // Remove tashkeel and Quranic marks
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '') // Remove tatweel
    .trim();
}

/**
 * Advanced Tri-literal & Morphological Arabic Root Extractor (استخراج الجذور الثلاثية الصرفية)
 */
export function extractArabicRoot(word: string): string | null {
  const clean = normalizeArabicForDict(word);
  if (!clean || clean.length < 2) return null;
  
  // Two-letter geminated root (e.g. مد -> مدد, حب -> حبب, حق -> حقق)
  if (clean.length === 2) {
    return clean[0] + clean[1] + clean[1];
  }
  
  if (clean.length === 3) return clean;

  // Strip prefixes
  let stripped = clean;
  for (const p of COMMON_PREFIXES) {
    if (stripped.startsWith(p) && stripped.length - p.length >= 3) {
      stripped = stripped.slice(p.length);
      break;
    }
  }

  // Strip suffixes
  for (const s of COMMON_SUFFIXES) {
    if (stripped.endsWith(s) && stripped.length - s.length >= 3) {
      stripped = stripped.slice(0, stripped.length - s.length);
      break;
    }
  }

  if (stripped.length === 2) {
    return stripped[0] + stripped[1] + stripped[1];
  }
  if (stripped.length === 3) return stripped;

  // Morphological pattern heuristics for 4-6 letter stems
  if (stripped.length === 4) {
    // فاعل -> فعل (remove 2nd letter if Alif)
    if (stripped[1] === 'ا') return stripped[0] + stripped[2] + stripped[3];
    // مفعل / تفعل / يفعل / نفعل / أفعل (remove 1st letter if prefix)
    if (['م', 'ت', 'ي', 'ن', 'ا'].includes(stripped[0])) return stripped.slice(1);
    // فعيل / فعول (remove 3rd letter if Ya or Waw)
    if (stripped[2] === 'ي' || stripped[2] === 'و' || stripped[2] === 'ا') return stripped[0] + stripped[1] + stripped[3];
    // فعلة (remove last Ta Marbuta / Ha)
    if (stripped[3] === 'ه' || stripped[3] === 'ي') return stripped.slice(0, 3);
  } else if (stripped.length === 5) {
    // مفعول (remove 1st M and 4th W)
    if (stripped[0] === 'م' && stripped[3] === 'و') return stripped[1] + stripped[2] + stripped[4];
    // افتعال (remove 1st Alif, 3rd Ta, 4th Alif)
    if (stripped[0] === 'ا' && stripped[2] === 'ت' && stripped[4] === 'ا') return stripped[1] + stripped[3] + stripped[5] || stripped.slice(1, 4);
    // تفاعل (remove 1st T, 3rd Alif)
    if (stripped[0] === 'ت' && stripped[2] === 'ا') return stripped[1] + stripped[3] + stripped[4];
    // مفاعلة (remove 1st M, 3rd Alif, 5th Ha)
    if (stripped[0] === 'م' && stripped[2] === 'ا') return stripped[1] + stripped[3] + stripped[4];
  } else if (stripped.length >= 6) {
    if (stripped.startsWith('است')) return stripped.slice(3, 6);
    if (stripped.startsWith('مست')) return stripped.slice(3, 6);
  }

  return stripped.length >= 3 ? stripped.slice(0, 3) : null;
}

class DictionaryService {
  private wordSet: Set<string> = new Set();
  private normalizedMap: Map<string, string> = new Map(); // norm -> original
  private cipherBaseMap: Map<string, string> = new Map();
  private rootIndex: Map<string, string[]> = new Map(); // root -> list of words
  private loaded: boolean = false;
  private loading: boolean = false;
  private loadProgress: number = 0;
  private retryCount: number = 0;
  private maxRetries: number = 2;
  private listeners: ((progress: number, done: boolean, count: number) => void)[] = [];
  private cacheMatchMeta: Map<string, ArabicDictMatchMeta | null> = new Map();

  constructor() {
    // 1. Immediately seed core Arabic lexicon (instant 0ms availability)
    this.ingestLexiconParts(ARABIC_COMMON_LEXICON_PARTS);
    this.loaded = true;
    this.loadProgress = 100;

    // 2. Auto-kick background load of the full dictionary
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 100);
    }
  }

  private ingestWordInternal(w: string) {
    if (!w) return;
    const clean = w.trim();
    if (!clean) return;
    this.wordSet.add(clean);
    
    const norm = normalizeArabicForDict(clean);
    if (!this.normalizedMap.has(norm)) {
      this.normalizedMap.set(norm, clean);
    }
    
    const cb = getCipherBaseString(clean);
    if (!this.cipherBaseMap.has(cb)) {
      this.cipherBaseMap.set(cb, clean);
    }

    // Index root
    const root = extractArabicRoot(clean);
    if (root) {
      const bucket = this.rootIndex.get(root) || [];
      if (bucket.length < 15) {
        bucket.push(clean);
        this.rootIndex.set(root, bucket);
      }
    }
  }

  private ingestLexiconParts(parts: string[][]) {
    for (const part of parts) {
      for (const w of part) {
        this.ingestWordInternal(w);
      }
    }
  }

  isLoading(): boolean {
    return this.loading;
  }

  subscribe(listener: (progress: number, done: boolean, count: number) => void) {
    this.listeners.push(listener);
    listener(this.loadProgress, this.loaded, this.wordSet.size);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.loadProgress, this.loaded, this.wordSet.size);
    }
  }

  async init(): Promise<void> {
    if (this.loading) return;
    if (this.wordSet.size > 100000) return;
    this.loading = true;
    this.loaded = false;
    this.loadProgress = 0;
    this.notify();

    try {
      const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const candidateUrls: string[] = [
        `${cleanBase}arabic_dictionary.txt`,
        '/arabic_dictionary.txt',
        './arabic_dictionary.txt'
      ];

      if (typeof window !== 'undefined' && window.location) {
        try {
          candidateUrls.push(new URL('arabic_dictionary.txt', window.location.href).href);
        } catch {}
        if (window.location.origin && window.location.origin !== 'null') {
          candidateUrls.push(`${window.location.origin}/arabic_dictionary.txt`);
        }
      }

      const uniqueUrls = Array.from(new Set(candidateUrls));
      let response: Response | null = null;
      let lastError: unknown = null;

      for (const url of uniqueUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            response = res;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!response) {
        // Fallback to quranic_words.txt if large dict is not found
        const fallbackUrls = [
          `${cleanBase}quranic_words.txt`,
          '/quranic_words.txt',
          './quranic_words.txt'
        ];
        for (const url of fallbackUrls) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              response = res;
              break;
            }
          } catch {}
        }
      }

      if (!response) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          this.loading = false;
          setTimeout(() => this.init(), 1500 * this.retryCount);
          return;
        }
        console.warn('Notice: Full Arabic dictionary download deferred (using embedded core lexicon):', lastError || 'File unreachable');
        this.loading = false;
        this.loaded = true;
        this.loadProgress = 100;
        this.notify();
        return;
      }

      const text = await response.text();
      const lines = text.split('\n');
      const total = lines.length;

      let index = 0;
      const CHUNK_SIZE = 15000;

      const processChunk = () => {
        const start = performance.now();
        while (index < total && performance.now() - start < 12) {
          const limit = Math.min(index + CHUNK_SIZE, total);
          for (let i = index; i < limit; i++) {
            this.ingestWordInternal(lines[i]);
          }
          index = limit;
        }

        this.loadProgress = Math.min(100, Math.round((index / total) * 100));
        this.notify();

        if (index < total) {
          requestAnimationFrame(processChunk);
        } else {
          this.loaded = true;
          this.loading = false;
          this.loadProgress = 100;
          this.notify();
        }
      };

      requestAnimationFrame(processChunk);
    } catch (err) {
      console.warn('Notice: Dictionary background load deferred (using embedded core lexicon):', err);
      this.loading = false;
      this.loaded = true;
      this.loadProgress = 100;
      this.notify();
    }
  }

  /**
   * Advanced High-Accuracy Dictionary Matcher with Multi-Tier Morphological & Lexical Rules
   */
  searchWordRich(rawWord: string): ArabicDictMatchMeta | null {
    if (!rawWord) return null;
    const clean = rawWord.trim();
    if (clean.length < 2) return null;

    if (this.cacheMatchMeta.has(clean)) {
      return this.cacheMatchMeta.get(clean)!;
    }

    // Tier 1: Exact direct match
    if (this.wordSet.has(clean)) {
      const root = extractArabicRoot(clean);
      const res: ArabicDictMatchMeta = {
        word: clean,
        matchedLemma: clean,
        root: root || undefined,
        matchType: 'exact',
        matchTypeLabel: 'تطابق معجمي مباشر أصيل',
        confidence: 100,
      };
      this.cacheMatchMeta.set(clean, res);
      return res;
    }

    // Tier 2: Normalized orthographic match (توحيد الهمزات والياء والألف)
    const norm = normalizeArabicForDict(clean);
    if (this.wordSet.has(norm) || this.normalizedMap.has(norm)) {
      const matched = this.normalizedMap.get(norm) || norm;
      const root = extractArabicRoot(matched);
      const res: ArabicDictMatchMeta = {
        word: clean,
        matchedLemma: matched,
        root: root || undefined,
        matchType: 'orthographic',
        matchTypeLabel: 'تطابق معجمي مع توحيد الرسم',
        confidence: 96,
      };
      this.cacheMatchMeta.set(clean, res);
      return res;
    }

    // Tier 3: Alif Maqsura as Double Alif Rule (قاعدة الألف المقصورة كدبل ألف: ى ↔ اا)
    if (clean.includes('اا')) {
      const withMaqsura = clean.replace(/اا/g, 'ى');
      if (this.wordSet.has(withMaqsura) || this.normalizedMap.has(normalizeArabicForDict(withMaqsura))) {
        const matched = this.normalizedMap.get(normalizeArabicForDict(withMaqsura)) || withMaqsura;
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: matched,
          root: extractArabicRoot(matched) || undefined,
          matchType: 'orthographic',
          matchTypeLabel: 'قاعدة الألف المقصورة كدبل ألف (ى ↔ اا)',
          confidence: 94,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
      const withSingleAlif = clean.replace(/اا/g, 'ا');
      if (this.wordSet.has(withSingleAlif) || this.normalizedMap.has(normalizeArabicForDict(withSingleAlif))) {
        const matched = this.normalizedMap.get(normalizeArabicForDict(withSingleAlif)) || withSingleAlif;
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: matched,
          root: extractArabicRoot(matched) || undefined,
          matchType: 'orthographic',
          matchTypeLabel: 'تطابق فك الألف المزدوجة (اا ↔ ا)',
          confidence: 93,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
    } else if (clean.includes('ى') || clean.endsWith('ا')) {
      const withDoubleAlif = clean.replace(/ى$/, 'اا');
      if (withDoubleAlif !== clean && (this.wordSet.has(withDoubleAlif) || this.normalizedMap.has(normalizeArabicForDict(withDoubleAlif)))) {
        const matched = this.normalizedMap.get(normalizeArabicForDict(withDoubleAlif)) || withDoubleAlif;
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: matched,
          root: extractArabicRoot(matched) || undefined,
          matchType: 'orthographic',
          matchTypeLabel: 'قاعدة الألف المقصورة كدبل ألف (ى ↔ اا)',
          confidence: 94,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
    }

    // Tier 4: Shaddah / Gemination expansion or contraction (مدد <-> مد, حبب <-> حب)
    if (/(.)\1/.test(clean)) {
      const collapsed = clean.replace(/(.)\1/g, '$1');
      if (this.wordSet.has(collapsed) || this.normalizedMap.has(normalizeArabicForDict(collapsed))) {
        const matched = this.normalizedMap.get(normalizeArabicForDict(collapsed)) || collapsed;
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: matched,
          root: collapsed,
          matchType: 'shaddah',
          matchTypeLabel: 'تطابق معجمي بفك/دمج التضعيف (الشدة)',
          confidence: 92,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
    } else if (clean.length === 2) {
      // Expand 2-letter stem to 3-letter geminated (حب -> حبب, مد -> مدد, حق -> حقق)
      const expanded = clean + clean[1];
      if (this.wordSet.has(expanded) || this.normalizedMap.has(normalizeArabicForDict(expanded))) {
        const matched = this.normalizedMap.get(normalizeArabicForDict(expanded)) || expanded;
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: matched,
          root: expanded,
          matchType: 'shaddah',
          matchTypeLabel: 'تطابق جذر مضعف ثنائي الأصل (مشدد)',
          confidence: 90,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
    }

    // Tier 5: Prefix & Suffix Stripping (سوابق ولواحق: ال، بال، فال، كال، وال، ضمائر المتكلم والغائب)
    for (const prefix of COMMON_PREFIXES) {
      if (clean.startsWith(prefix) && clean.length - prefix.length >= 2) {
        const sub = clean.slice(prefix.length);
        if (this.wordSet.has(sub) || this.normalizedMap.has(normalizeArabicForDict(sub))) {
          const matched = this.normalizedMap.get(normalizeArabicForDict(sub)) || sub;
          const res: ArabicDictMatchMeta = {
            word: clean,
            matchedLemma: matched,
            root: extractArabicRoot(matched) || undefined,
            matchType: 'affix_stripped',
            matchTypeLabel: `اشتقاق معجمي بإسقاط السابقة (${prefix})`,
            confidence: 88,
          };
          this.cacheMatchMeta.set(clean, res);
          return res;
        }
      }
    }

    for (const suffix of COMMON_SUFFIXES) {
      if (clean.endsWith(suffix) && clean.length - suffix.length >= 2) {
        const sub = clean.slice(0, clean.length - suffix.length);
        if (this.wordSet.has(sub) || this.normalizedMap.has(normalizeArabicForDict(sub))) {
          const matched = this.normalizedMap.get(normalizeArabicForDict(sub)) || sub;
          const res: ArabicDictMatchMeta = {
            word: clean,
            matchedLemma: matched,
            root: extractArabicRoot(matched) || undefined,
            matchType: 'affix_stripped',
            matchTypeLabel: `اشتقاق معجمي بإسقاط اللاحقة (${suffix})`,
            confidence: 87,
          };
          this.cacheMatchMeta.set(clean, res);
          return res;
        }
      }
    }

    // Tier 6: Morphological Root Derivations (اشتقاقات الجذر اللغوي الثلاثي)
    const root = extractArabicRoot(clean);
    if (root && this.rootIndex.has(root)) {
      const candidates = this.rootIndex.get(root)!;
      if (candidates.length > 0) {
        const res: ArabicDictMatchMeta = {
          word: clean,
          matchedLemma: candidates[0],
          root,
          matchType: 'root_derived',
          matchTypeLabel: `جذر معجمي مشترك [${root}]`,
          confidence: 82,
        };
        this.cacheMatchMeta.set(clean, res);
        return res;
      }
    }

    // Tier 7: Cipher & Phonetic Base Mapping
    const cb = getCipherBaseString(clean);
    if (this.cipherBaseMap.has(cb)) {
      const matched = this.cipherBaseMap.get(cb)!;
      const res: ArabicDictMatchMeta = {
        word: clean,
        matchedLemma: matched,
        root: extractArabicRoot(matched) || undefined,
        matchType: 'cipher_phonetic',
        matchTypeLabel: 'تطابق تقاربي في قاعدة التشفير',
        confidence: 76,
      };
      this.cacheMatchMeta.set(clean, res);
      return res;
    }

    this.cacheMatchMeta.set(clean, null);
    return null;
  }

  getMatchedWord(rawWord: string): string | null {
    const meta = this.searchWordRich(rawWord);
    return meta ? meta.matchedLemma : null;
  }

  isWord(rawWord: string): boolean {
    return this.searchWordRich(rawWord) !== null;
  }

  /**
   * Asynchronous Progressive Dictionary Search with Real Frame-by-Frame Progress Reporting
   */
  async searchDictionaryAsync(
    words: { word: string; isReversed: boolean; original?: string }[],
    onProgress?: (percent: number, currentItem: string) => void
  ): Promise<{ word: string; meta: ArabicDictMatchMeta; isReversed: boolean; original?: string }[]> {
    const results: { word: string; meta: ArabicDictMatchMeta; isReversed: boolean; original?: string }[] = [];
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
          const meta = this.searchWordRich(item.word);
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
      // Yield to event loop for UI responsiveness
      await new Promise((r) => setTimeout(r, 0));
    }

    if (onProgress) onProgress(100, 'اكتمل البحث في المعجم العربي');

    // Sort by confidence descending, prioritizing exact and authentic root matches
    results.sort((a, b) => {
      if (b.meta.confidence !== a.meta.confidence) {
        return b.meta.confidence - a.meta.confidence;
      }
      // Non-reversed original order takes precedence
      if (a.isReversed !== b.isReversed) {
        return a.isReversed ? 1 : -1;
      }
      return a.word.length - b.word.length;
    });

    return results;
  }

  getAllWords(): string[] {
    return Array.from(this.wordSet);
  }

  getWordCount(): number {
    return this.wordSet.size;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getProgress(): number {
    return this.loadProgress;
  }
}

export const arabicDictionary = new DictionaryService();

/**
 * Generates the dictionary lookup URL via Google Search:
 * Example: https://www.google.com/search?q=%D8%AD%D9%85%D8%AF
 */
export function getArabicDictSearchUrl(word: string): string {
  const clean = word.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}
