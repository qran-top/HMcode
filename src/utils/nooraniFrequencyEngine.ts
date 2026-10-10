// Noorani Frequency Gematria Engine (حساب تكرارات الحروف النورانية في فواتح السور)
// Calculates letter values based exclusively on the occurrence frequency of the 14 Noorani letters
// across all 29 Fawatih Al-Suwar (الحروف المقطعة في فواتح السور)، assigning 0 to all other letters.

import { cleanArabicTextForGematria, normalizeAbjadChar } from './gematriaEngine';
import { loadCompleteQuranCorpus, QuranAyahItem } from './inverseQuranicMatcher';
import { NOORANI_LETTERS_SET } from '../cipherData';
import { SURAH_NAMES } from './quranicDictionary';

/**
 * 29 Fawatih Al-Suwar (فواتح السور الـ 29 المقطعة)
 */
export const FAWATIH_SUWAR_ITEMS = [
  { surah: 2, name: 'البقرة', text: 'الم' },
  { surah: 3, name: 'آل عمران', text: 'الم' },
  { surah: 7, name: 'الأعراف', text: 'المص' },
  { surah: 10, name: 'يونس', text: 'الر' },
  { surah: 11, name: 'هود', text: 'الر' },
  { surah: 12, name: 'يوسف', text: 'الر' },
  { surah: 13, name: 'الرعد', text: 'المر' },
  { surah: 14, name: 'إبراهيم', text: 'الر' },
  { surah: 15, name: 'الحجر', text: 'الر' },
  { surah: 19, name: 'مريم', text: 'كهيعص' },
  { surah: 20, name: 'طه', text: 'طه' },
  { surah: 26, name: 'الشعراء', text: 'طسم' },
  { surah: 27, name: 'النمل', text: 'طس' },
  { surah: 28, name: 'القصص', text: 'طسم' },
  { surah: 29, name: 'العنكبوت', text: 'الم' },
  { surah: 30, name: 'الروم', text: 'الم' },
  { surah: 31, name: 'لقمان', text: 'الم' },
  { surah: 32, name: 'السجدة', text: 'الم' },
  { surah: 36, name: 'يس', text: 'يس' },
  { surah: 38, name: 'ص', text: 'ص' },
  { surah: 40, name: 'غافر', text: 'حم' },
  { surah: 41, name: 'فصلت', text: 'حم' },
  { surah: 42, name: 'الشورى', text: 'حم عسق' },
  { surah: 43, name: 'الزخرف', text: 'حم' },
  { surah: 44, name: 'الدخان', text: 'حم' },
  { surah: 45, name: 'الجاثية', text: 'حم' },
  { surah: 46, name: 'الأحقاف', text: 'حم' },
  { surah: 50, name: 'ق', text: 'ق' },
  { surah: 68, name: 'القلم', text: 'ن' },
];

/**
 * Exact frequency table for the 14 Noorani letters in Fawatih Al-Suwar
 */
export const NOORANI_FAWATIH_FREQUENCIES: Record<string, number> = {
  'م': 17,
  'ا': 13, 'أ': 13, 'إ': 13, 'آ': 13, 'ٱ': 13,
  'ل': 13,
  'ح': 7,
  'ر': 6,
  'س': 5,
  'ط': 4,
  'ص': 3,
  'ه': 2, 'هـ': 2, 'ة': 2,
  'ي': 2, 'ى': 2, 'ئ': 2,
  'ع': 2,
  'ق': 2,
  'ك': 1,
  'ن': 1,
};

/**
 * Canonical 14 Noorani letters ordered by frequency descending
 */
export const NOORANI_14_FREQ_ORDER = [
  { char: 'م', freq: 17, name: 'ميم' },
  { char: 'ا', freq: 13, name: 'ألف' },
  { char: 'ل', freq: 13, name: 'لام' },
  { char: 'ح', freq: 7, name: 'حاء' },
  { char: 'ر', freq: 6, name: 'راء' },
  { char: 'س', freq: 5, name: 'سين' },
  { char: 'ط', freq: 4, name: 'طاء' },
  { char: 'ص', freq: 3, name: 'صاد' },
  { char: 'هـ', freq: 2, name: 'هاء' },
  { char: 'ي', freq: 2, name: 'ياء' },
  { char: 'ع', freq: 2, name: 'عين' },
  { char: 'ق', freq: 2, name: 'قاف' },
  { char: 'ك', freq: 1, name: 'كاف' },
  { char: 'ن', freq: 1, name: 'نون' },
];

/**
 * Gets the Noorani frequency value for a character (or 0 if non-Noorani)
 */
export function getNooraniFreqCharValue(char: string): number {
  if (!char) return 0;
  const normalized = normalizeAbjadChar(char);
  return NOORANI_FAWATIH_FREQUENCIES[char] ?? NOORANI_FAWATIH_FREQUENCIES[normalized] ?? 0;
}

/**
 * Checks if a character is one of the 14 Noorani letters
 */
export function isNooraniChar(char: string): boolean {
  if (!char) return false;
  const normalized = normalizeAbjadChar(char);
  return NOORANI_LETTERS_SET.has(char) || NOORANI_LETTERS_SET.has(normalized);
}

export interface LetterBreakdownItem {
  char: string;
  normalized: string;
  isNoorani: boolean;
  value: number;
}

export interface WordBreakdownItem {
  word: string;
  cleanWord: string;
  value: number;
  letters: LetterBreakdownItem[];
}

export interface NooraniFreqCalculationResult {
  text: string;
  totalValue: number;
  wordCount: number;
  letterCount: number;
  nooraniLetterCount: number;
  nonNooraniLetterCount: number;
  words: WordBreakdownItem[];
}

/**
 * Calculates Gematria total and breakdown using Noorani letter frequencies
 */
export function calculateNooraniFreqGematria(text: string): NooraniFreqCalculationResult {
  if (!text || !text.trim()) {
    return {
      text: '',
      totalValue: 0,
      wordCount: 0,
      letterCount: 0,
      nooraniLetterCount: 0,
      nonNooraniLetterCount: 0,
      words: [],
    };
  }

  const rawWords = text.trim().split(/\s+/);
  let totalValue = 0;
  let letterCount = 0;
  let nooraniLetterCount = 0;
  let nonNooraniLetterCount = 0;
  const wordsBreakdown: WordBreakdownItem[] = [];

  for (const word of rawWords) {
    const cleanWord = cleanArabicTextForGematria(word);
    const chars = cleanWord.split('').filter((c) => /[\u0621-\u064A\u0671]/.test(c));

    let wordVal = 0;
    const letterItems: LetterBreakdownItem[] = [];

    for (const c of chars) {
      const norm = normalizeAbjadChar(c);
      const val = getNooraniFreqCharValue(c);
      const isNoor = isNooraniChar(c);

      wordVal += val;
      letterCount++;
      if (isNoor) {
        nooraniLetterCount++;
      } else {
        nonNooraniLetterCount++;
      }

      letterItems.push({
        char: c,
        normalized: norm,
        isNoorani: isNoor,
        value: val,
      });
    }

    totalValue += wordVal;
    wordsBreakdown.push({
      word,
      cleanWord,
      value: wordVal,
      letters: letterItems,
    });
  }

  return {
    text,
    totalValue,
    wordCount: rawWords.length,
    letterCount,
    nooraniLetterCount,
    nonNooraniLetterCount,
    words: wordsBreakdown,
  };
}

export interface NooraniQuranMatch {
  id: string;
  phrase: string;
  cleanPhrase: string;
  value: number;
  wordCount: number;
  letterCount: number;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  fullAyahText: string;
  matchType: 'full_ayah' | 'verse_chain' | 'single_word';
  matchTypeLabel: string;
  breakdown: WordBreakdownItem[];
  quranUrl: string;
}

export interface NooraniScannerProgress {
  percent: number;
  scannedAyahs: number;
  totalAyahs: number;
  currentSurahName: string;
  matchesCount: number;
  isRunning: boolean;
  isCompleted: boolean;
}

export interface NooraniSearchHistoryItem {
  id: string;
  query: string;
  value: number;
  wordCount: number;
  letterCount: number;
  matchesCount: number;
  timestamp: number;
  isFavorite?: boolean;
}

/**
 * Searches the Quran for matches having the given Noorani Frequency Gematria value
 * with asynchronous chunked scanning and real-time progress callbacks.
 */
export async function searchQuranByNooraniValue(
  targetValue: number,
  options?: {
    maxResults?: number;
    surahFilter?: number;
    matchScope?: 'all' | 'single_words' | 'phrases';
    onProgress?: (progress: NooraniScannerProgress) => void;
    abortSignal?: AbortSignal;
  }
): Promise<NooraniQuranMatch[]> {
  if (targetValue <= 0) return [];

  const maxResults = options?.maxResults ?? 50000;
  const surahFilter = options?.surahFilter ?? 0;
  const matchScope = options?.matchScope ?? 'all';
  const onProgress = options?.onProgress;
  const abortSignal = options?.abortSignal;

  const ayahs = await loadCompleteQuranCorpus();
  const totalAyahs = ayahs.length;
  const matches: NooraniQuranMatch[] = [];
  const seenPhrases = new Set<string>();

  let lastYieldTime = performance.now();

  for (let idx = 0; idx < totalAyahs; idx++) {
    if (abortSignal?.aborted) break;
    if (matches.length >= maxResults) break;

    const ayahItem = ayahs[idx];
    const now = performance.now();

    // Non-blocking yield: yield every 12ms to guarantee 60fps responsiveness and zero page freezes
    if (now - lastYieldTime > 12 || idx === totalAyahs - 1) {
      lastYieldTime = now;
      if (onProgress) {
        const percent = Math.min(100, Math.round(((idx + 1) / totalAyahs) * 100));
        onProgress({
          percent,
          scannedAyahs: idx + 1,
          totalAyahs,
          currentSurahName: ayahItem.s || SURAH_NAMES[ayahItem.sn] || 'سورة',
          matchesCount: matches.length,
          isRunning: true,
          isCompleted: false,
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    if (surahFilter > 0 && ayahItem.sn !== surahFilter) continue;

    const rawWords = ayahItem.t.split(/\s+/).filter(Boolean);
    const n = rawWords.length;
    if (n === 0) continue;

    // Fast pre-calculation: compute clean words and Noorani letter sums for each word once!
    const cleanWords: string[] = new Array(n);
    const wordValues: number[] = new Array(n);

    for (let wIdx = 0; wIdx < n; wIdx++) {
      const cw = cleanArabicTextForGematria(rawWords[wIdx]);
      cleanWords[wIdx] = cw;
      let wVal = 0;
      for (let cIdx = 0; cIdx < cw.length; cIdx++) {
        wVal += getNooraniFreqCharValue(cw[cIdx]);
      }
      wordValues[wIdx] = wVal;
    }

    // Evaluate single words and phrases up to 12 words
    const maxGram = matchScope === 'single_words' ? 1 : Math.min(n, 12);
    const minGram = matchScope === 'phrases' ? 2 : 1;

    for (let len = minGram; len <= maxGram; len++) {
      if (matches.length >= maxResults) break;

      let runningSum = 0;
      for (let k = 0; k < len && k < n; k++) {
        runningSum += wordValues[k];
      }

      for (let i = 0; i <= n - len; i++) {
        if (matches.length >= maxResults) break;

        if (i > 0) {
          runningSum = runningSum - wordValues[i - 1] + wordValues[i + len - 1];
        }

        if (runningSum === targetValue) {
          const phraseWords = rawWords.slice(i, i + len);
          const phraseText = phraseWords.join(' ');
          const cleanPhrase = cleanWords.slice(i, i + len).join(' ');

          if (!cleanPhrase || !cleanPhrase.trim()) continue;

          const dedupeKey = `${ayahItem.sn}_${ayahItem.a}_${cleanPhrase}`;
          if (seenPhrases.has(dedupeKey)) continue;
          seenPhrases.add(dedupeKey);

          const calc = calculateNooraniFreqGematria(cleanPhrase);

          let mType: 'full_ayah' | 'verse_chain' | 'single_word' = 'verse_chain';
          let mTypeLabel = 'سلسلة كلمات';
          if (len === 1) {
            mType = 'single_word';
            mTypeLabel = 'كلمة فردية';
          } else if (len === n) {
            mType = 'full_ayah';
            mTypeLabel = 'آية كاملة';
          }

          matches.push({
            id: `${ayahItem.sn}:${ayahItem.a}:${i}:${len}`,
            phrase: phraseText,
            cleanPhrase,
            value: calc.totalValue,
            wordCount: len,
            letterCount: calc.letterCount,
            surahName: ayahItem.s || SURAH_NAMES[ayahItem.sn] || 'سورة',
            surahNumber: ayahItem.sn,
            ayahNumber: ayahItem.a,
            fullAyahText: ayahItem.t,
            matchType: mType,
            matchTypeLabel: mTypeLabel,
            breakdown: calc.words,
            quranUrl: `https://quran.com/${ayahItem.sn}/${ayahItem.a}`,
          });
        }
      }
    }
  }

  if (onProgress) {
    onProgress({
      percent: 100,
      scannedAyahs: totalAyahs,
      totalAyahs,
      currentSurahName: 'اكتمل البحث في القرآن الكريم بالكامل (114 سورة)',
      matchesCount: matches.length,
      isRunning: false,
      isCompleted: true,
    });
  }

  return matches;
}
