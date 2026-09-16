import { getCipherBaseString } from '../cipherData';

class DictionaryService {
  private wordSet: Set<string> = new Set();
  private cipherBaseMap: Map<string, string> = new Map();
  private loaded: boolean = false;
  private loading: boolean = false;
  private loadProgress: number = 0;
  private listeners: ((progress: number, done: boolean) => void)[] = [];

  constructor() {
    // Auto-kick background load
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 100);
    }
  }

  subscribe(listener: (progress: number, done: boolean) => void) {
    this.listeners.push(listener);
    listener(this.loadProgress, this.loaded);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.loadProgress, this.loaded);
    }
  }

  async init(): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;

    try {
      const baseUrl = import.meta.env.BASE_URL || './';
      const dictUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}arabic_dictionary.txt`;
      const response = await fetch(dictUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch dictionary');
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
      console.error('Dictionary load error:', err);
      this.loading = false;
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
