import { getCipherBaseString } from '../cipherData';
import { ARABIC_COMMON_LEXICON_PARTS } from './arabicLexiconParts';

class DictionaryService {
  private wordSet: Set<string> = new Set();
  private cipherBaseMap: Map<string, string> = new Map();
  private loaded: boolean = false;
  private loading: boolean = false;
  private loadProgress: number = 0;
  private retryCount: number = 0;
  private maxRetries: number = 2;
  private listeners: ((progress: number, done: boolean, count: number) => void)[] = [];

  constructor() {
    // 1. Immediately seed core Arabic lexicon (instant 0ms availability)
    this.ingestLexiconParts(ARABIC_COMMON_LEXICON_PARTS);
    this.loaded = true;
    this.loadProgress = 100;

    // 2. Auto-kick background load of the full dictionary
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 200);
    }
  }

  private ingestLexiconParts(parts: string[][]) {
    for (const part of parts) {
      for (const w of part) {
        if (!w) continue;
        const clean = w.trim();
        if (!clean) continue;
        this.wordSet.add(clean);
        const cb = getCipherBaseString(clean);
        if (!this.cipherBaseMap.has(cb)) {
          this.cipherBaseMap.set(cb, clean);
        }
      }
    }
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
    // If we already loaded a large set (> 100,000 words), we're done
    if (this.wordSet.size > 100000) return;
    this.loading = true;

    try {
      // Build candidate URLs to be resilient against varying base paths and hosting environments
      const candidateUrls: string[] = [];
      const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      candidateUrls.push(`${cleanBase}arabic_dictionary.txt`);

      if (typeof window !== 'undefined' && window.location) {
        try {
          candidateUrls.push(new URL('arabic_dictionary.txt', window.location.href).href);
        } catch {
          // ignore url parse error
        }
        if (window.location.origin && window.location.origin !== 'null') {
          candidateUrls.push(`${window.location.origin}/arabic_dictionary.txt`);
        }
      }
      candidateUrls.push('/arabic_dictionary.txt');
      candidateUrls.push('./arabic_dictionary.txt');

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

      // If full 11MB file wasn't reachable, try fallback to quranic_words.txt (172KB)
      if (!response) {
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
          } catch {
            // continue
          }
        }
      }

      if (!response) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          this.loading = false;
          setTimeout(() => this.init(), 1500 * this.retryCount);
          return;
        }
        // Graceful notice without raising uncaught console errors
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

      // Ingest lines into Set in non-blocking chunks of 15ms per frame
      let index = 0;
      const CHUNK_SIZE = 15000;

      const processChunk = () => {
        const start = performance.now();
        while (index < total && performance.now() - start < 12) {
          const limit = Math.min(index + CHUNK_SIZE, total);
          for (let i = index; i < limit; i++) {
            const w = lines[i].trim();
            if (w) {
              this.wordSet.add(w);
              const cb = getCipherBaseString(w);
              if (!this.cipherBaseMap.has(cb)) {
                this.cipherBaseMap.set(cb, w);
              }
            }
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

  getMatchedWord(rawWord: string): string | null {
    if (!rawWord) return null;
    const clean = rawWord.trim();
    if (this.wordSet.has(clean)) return clean;

    // Normalizations: check with/without hamzas or alif maqsura
    const norm = clean
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');

    if (this.wordSet.has(norm)) return norm;
    
    const cb = getCipherBaseString(clean);
    if (this.cipherBaseMap.has(cb)) return this.cipherBaseMap.get(cb) || null;

    return null;
  }

  isWord(rawWord: string): boolean {
    return this.getMatchedWord(rawWord) !== null;
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
