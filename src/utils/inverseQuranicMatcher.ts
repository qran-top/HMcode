// Ultra-Fast Exhaustive Quranic Inverse Gematria Matcher & Verse Chain Engine
// Scans all 114 Surahs and all 6,236 Ayahs & multi-word n-grams in real-time.
// Supports simultaneous Dual-Engine (Maghribi + Mashriqi + Common) scanning with distinct color tagging.

import {
  cleanArabicTextForGematria,
  normalizeAbjadChar,
  calculateGematriaWithOptions,
  GematriaCalculationOptions,
  DEFAULT_GEMATRIA_OPTIONS,
} from './gematriaEngine';
import { NOORANI_LETTERS_SET } from '../cipherData';
import { getQuranTopSearchUrl, SURAH_NAMES } from './quranicDictionary';
import {
  MAGHRIBI_VALUES,
  MASHRIQI_VALUES,
  SRQM_1_VALUES,
  SRQT_2_VALUES,
  SRQD_3_VALUES,
  SRTG_4_VALUES,
} from '../context/GematriaContext';

export interface QuranAyahItem {
  sn: number; // Surah number (1-114)
  s: string;  // Surah name
  a: number;  // Ayah number
  t: string;  // Full Ayah text
}

export interface InverseQuranicMatch {
  id: string;
  phrase: string;
  cleanPhrase: string;
  value: number; // matched target value
  maghribiValue: number;
  mashriqiValue: number;
  srqm1Value?: number;
  srqt2Value?: number;
  srqd3Value?: number;
  srtg4Value?: number;
  systemOrigin: 'common' | 'maghribi' | 'mashriqi' | 'srqm1' | 'srqt2' | 'srqd3' | 'srtg4';
  systemLabel: string; // 'مشترك' | 'غربي' | 'شرقي' | 'صرقم 1' | 'صرقم 2' | 'صرقم 3' | 'صرتغ 4'
  isIntrinsicCommon: boolean; // maghribiValue === mashriqiValue === srqm1Value ...
  wordCount: number;
  letterCount: number;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  fullAyahText: string;
  matchType: 'fawatih' | 'creed_tauhid' | 'full_ayah' | 'verse_chain' | 'single_word';
  matchTypeLabel: string;
  isPureNoorani: boolean;
  breakdown: {
    word: string;
    value: number;
    magVal: number;
    mashVal: number;
    srqm1Val?: number;
    srqt2Val?: number;
    srqd3Val?: number;
    srtg4Val?: number;
    letters: {
      char: string;
      magVal: number;
      mashVal: number;
      srqm1Val?: number;
      srqt2Val?: number;
      srqd3Val?: number;
      srtg4Val?: number;
    }[];
  }[];
  quranUrl: string;
}

export interface ScannerProgress {
  percent: number; // 0 - 100
  scannedCount: number;
  totalCount: number;
  matchesCount: number;
  itemsPerSecond: number;
  currentSurahOrPhase: string;
  isRunning: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
}

export interface ScannerOptions {
  mode?: 'dual' | 'all' | string;
  targetMaghribi: number;
  targetMashriqi: number;
  targetSrqm1?: number;
  targetSrqt2?: number;
  targetSrqd3?: number;
  targetSrtg4?: number;
  calcOptions?: Partial<GematriaCalculationOptions>;
  scope: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words';
  onlyNoorani?: boolean;
  maxResults?: number;
  maxPhraseLength?: number;
  alternateTargets?: number[];
  onProgress?: (progress: ScannerProgress) => void;
  onMatch?: (match: InverseQuranicMatch) => void;
  onComplete?: (matches: InverseQuranicMatch[], cancelled: boolean) => void;
}

let cachedAyahsList: QuranAyahItem[] | null = null;
let cachedSurahBuckets: Map<number, QuranAyahItem[]> | null = null;
let isFetchingCorpus: boolean = false;

/**
 * Loads the complete Quran dataset (all 114 Surahs and all 6,236 Ayahs)
 */
export async function loadCompleteQuranCorpus(): Promise<QuranAyahItem[]> {
  if (cachedAyahsList && cachedAyahsList.length >= 6200) {
    return cachedAyahsList;
  }

  if (isFetchingCorpus) {
    while (isFetchingCorpus) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (cachedAyahsList && cachedAyahsList.length >= 6200) return cachedAyahsList;
  }

  isFetchingCorpus = true;
  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

    const candidateUrls = [
      `${cleanBase}quran_complete_ayahs.json`,
      '/quran_complete_ayahs.json',
      './quran_complete_ayahs.json',
    ];

    let ayahs: QuranAyahItem[] = [];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 6000) {
            ayahs = data.map((item: any) => ({
              sn: item.sn || item.surahNumber || item.surah || 1,
              s: item.s || item.surahName || SURAH_NAMES[item.sn || item.surahNumber || 1] || 'سورة',
              a: item.a || item.ayahNumber || item.ayah || 1,
              t: item.t || item.text || item.word || '',
            }));
            break;
          }
        }
      } catch {
        // Try next candidate URL
      }
    }

    if (ayahs.length === 0) {
      // Direct remote fetch if local bundle was somehow not ready
      try {
        const apiRes = await fetch('https://api.alquran.cloud/v1/quran/quran-simple-clean');
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          const surahs = apiJson?.data?.surahs;
          if (Array.isArray(surahs)) {
            for (const s of surahs) {
              const sNum = s.number;
              const sName = SURAH_NAMES[sNum] || s.name;
              for (const a of s.ayahs) {
                ayahs.push({
                  sn: sNum,
                  s: sName,
                  a: a.numberInSurah,
                  t: a.text,
                });
              }
            }
          }
        }
      } catch {
        // network fallback
      }
    }

    if (ayahs.length === 0) {
      ayahs = getFallbackQuranAyahs();
    }

    cachedAyahsList = ayahs;
    cachedSurahBuckets = new Map();
    for (const ayah of ayahs) {
      const bucket = cachedSurahBuckets.get(ayah.sn) || [];
      bucket.push(ayah);
      cachedSurahBuckets.set(ayah.sn, bucket);
    }

    return ayahs;
  } finally {
    isFetchingCorpus = false;
  }
}

/**
 * Fallback Quran Ayahs corpus if network / file is unavailable
 */
function getFallbackQuranAyahs(): QuranAyahItem[] {
  return [
    { sn: 1, s: 'الفاتحة', a: 1, t: 'بسم الله الرحمن الرحيم' },
    { sn: 1, s: 'الفاتحة', a: 2, t: 'الحمد لله رب العالمين' },
    { sn: 2, s: 'البقرة', a: 1, t: 'الم' },
    { sn: 2, s: 'البقرة', a: 163, t: 'وإلهكم إله واحد لا إله إلا هو الرحمن الرحيم' },
    { sn: 2, s: 'البقرة', a: 255, t: 'الله لا إله إلا هو الحي القيوم' },
    { sn: 3, s: 'آل عمران', a: 1, t: 'الم' },
    { sn: 3, s: 'آل عمران', a: 2, t: 'الله لا إله إلا هو الحي القيوم' },
    { sn: 3, s: 'آل عمران', a: 18, t: 'شهد الله أنه لا إله إلا هو والملائكة وأولو العلم قائما بالقسط لا إله إلا هو العزيز الحكيم' },
    { sn: 19, s: 'مريم', a: 1, t: 'كهيعص' },
    { sn: 20, s: 'طه', a: 1, t: 'طه' },
    { sn: 20, s: 'طه', a: 8, t: 'الله لا إله إلا هو له الأسماء الحسنى' },
    { sn: 20, s: 'طه', a: 14, t: 'إنني أنا الله لا إله إلا أنا فاعبدني وأقم الصلاة لذكري' },
    { sn: 37, s: 'الصافات', a: 35, t: 'إنهم كانوا إذا قيل لهم لا إله إلا الله يستكبرون' },
    { sn: 47, s: 'محمد', a: 19, t: 'فاعلم أنه لا إله إلا الله واستغفر لذنبك وللمؤمنين والمؤمنات والله يعلم متقلبكم ومثواكم' },
    { sn: 112, s: 'الإخلاص', a: 1, t: 'قل هو الله أحد' },
    { sn: 112, s: 'الإخلاص', a: 2, t: 'الله الصمد' },
    { sn: 112, s: 'الإخلاص', a: 3, t: 'لم يلد ولم يولد' },
    { sn: 112, s: 'الإخلاص', a: 4, t: 'ولم يكن له كفوا أحد' },
  ];
}

/**
 * Scanner Engine with Integrated Dual Eastern & Western Scanning
 */
export class InverseQuranicScanner {
  private isScanning: boolean = false;
  private abortController: AbortController | null = null;

  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isScanning = false;
  }

  public async scan(
    targetMaghribi: number,
    targetMashriqi: number,
    options: Omit<ScannerOptions, 'targetMaghribi' | 'targetMashriqi'>,
    targetSrqm1?: number,
    targetSrqt2?: number,
    targetSrqd3?: number,
    targetSrtg4?: number
  ): Promise<InverseQuranicMatch[]> {
    this.stop();
    this.isScanning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const {
      calcOptions = DEFAULT_GEMATRIA_OPTIONS,
      scope = 'all',
      onlyNoorani = false,
      maxResults = 2500,
      maxPhraseLength = 16,
      alternateTargets = [],
      onProgress,
      onMatch,
      onComplete,
    } = options;

    const effectiveTargetSrqm1 = targetSrqm1 ?? options.targetSrqm1 ?? 0;
    const effectiveTargetSrqt2 = targetSrqt2 ?? options.targetSrqt2 ?? 0;
    const effectiveTargetSrqd3 = targetSrqd3 ?? options.targetSrqd3 ?? 0;
    const effectiveTargetSrtg4 = targetSrtg4 ?? options.targetSrtg4 ?? 0;
    const magTargetsSet = new Set<number>([targetMaghribi, ...alternateTargets].filter((v) => v > 0));
    const mashTargetsSet = new Set<number>([targetMashriqi, ...alternateTargets].filter((v) => v > 0));
    const srqm1TargetsSet = effectiveTargetSrqm1 > 0 ? new Set<number>([effectiveTargetSrqm1, ...alternateTargets]) : new Set<number>();
    const srqt2TargetsSet = effectiveTargetSrqt2 > 0 ? new Set<number>([effectiveTargetSrqt2, ...alternateTargets]) : new Set<number>();
    const srqd3TargetsSet = effectiveTargetSrqd3 > 0 ? new Set<number>([effectiveTargetSrqd3, ...alternateTargets]) : new Set<number>();
    const srtg4TargetsSet = effectiveTargetSrtg4 > 0 ? new Set<number>([effectiveTargetSrtg4, ...alternateTargets]) : new Set<number>();
    const maxTarget = Math.max(targetMaghribi, targetMashriqi, effectiveTargetSrqm1, effectiveTargetSrqt2, effectiveTargetSrqd3, effectiveTargetSrtg4, ...alternateTargets);

    if (onProgress) {
      onProgress({
        percent: 0,
        scannedCount: 0,
        totalCount: 114,
        matchesCount: 0,
        itemsPerSecond: 0,
        currentSurahOrPhase: 'تحميل نصوص القرآن الكريم كاملة (6,236 آية)...',
        isRunning: true,
        isCompleted: false,
        isCancelled: false,
      });
    }

    await loadCompleteQuranCorpus();

    if (signal.aborted) {
      this.isScanning = false;
      return [];
    }

    const matches: InverseQuranicMatch[] = [];
    const seenMatches = new Set<string>();
    let totalCombinationsScanned = 0;
    const startTime = Date.now();

    const minWords = scope === 'chains_only' || scope === 'verses_and_chains' ? 2 : 1;
    const maxWords = scope === 'single_words' ? 1 : maxPhraseLength;

    return new Promise((resolve) => {
      let currentSurah = 1;
      const totalSurahs = 114;

      const step = () => {
        if (signal.aborted) {
          this.isScanning = false;
          if (onProgress) {
            onProgress({
              percent: Math.round((currentSurah / totalSurahs) * 100),
              scannedCount: totalCombinationsScanned,
              totalCount: totalSurahs,
              matchesCount: matches.length,
              itemsPerSecond: 0,
              currentSurahOrPhase: 'تم إيقاف البحث',
              isRunning: false,
              isCompleted: false,
              isCancelled: true,
            });
          }
          if (onComplete) onComplete(matches, true);
          resolve(matches);
          return;
        }

        // Adaptive Surah Batching: Process 1 Surah at a time for long initial Surahs, 2-3 for medium, up to 5 for short
        let surahsPerBatch = 5;
        if (currentSurah <= 7) {
          surahsPerBatch = 1; // Longest surahs (Al-Baqarah, Al-Imran, An-Nisa, etc.)
        } else if (currentSurah <= 25) {
          surahsPerBatch = 2; // Medium-long surahs
        } else if (currentSurah <= 60) {
          surahsPerBatch = 4;
        }
        const endSurah = Math.min(currentSurah + surahsPerBatch - 1, totalSurahs);

        for (let sNum = currentSurah; sNum <= endSurah; sNum++) {
          const ayahsInSurah = cachedSurahBuckets?.get(sNum) || [];
          const surahName = SURAH_NAMES[sNum] || (ayahsInSurah[0] ? ayahsInSurah[0].s : `سورة ${sNum}`);

          for (const ayah of ayahsInSurah) {
            const rawTokens = ayah.t.split(/\s+/).filter(Boolean);
            if (rawTokens.length === 0) continue;

            // Calculate clean words and word values in Maghribi, Mashriqi, SRQM 1, SRQT 2, SRQD 3
            // CRITICAL FIX: Pass rawTokens (not cleanTokens) so dagger alifs (\u0670), shaddahs, and Uthmani orthography are preserved!
            const cleanTokens = rawTokens.map((w) => cleanArabicTextForGematria(w));
            const magWordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, MAGHRIBI_VALUES)
            );
            const mashWordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, MASHRIQI_VALUES)
            );
            const srqm1WordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, SRQM_1_VALUES)
            );
            const srqt2WordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, SRQT_2_VALUES)
            );
            const srqd3WordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, SRQD_3_VALUES)
            );
            const srtg4WordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, SRTG_4_VALUES)
            );

            const n = rawTokens.length;

            // Sliding Window over all n-grams
            for (let i = 0; i < n; i++) {
              let currentMagSum = 0;
              let currentMashSum = 0;
              let currentSrqm1Sum = 0;
              let currentSrqt2Sum = 0;
              let currentSrqd3Sum = 0;
              let currentSrtg4Sum = 0;
              const limit = Math.min(n, i + maxWords);

              for (let j = i; j < limit; j++) {
                currentMagSum += magWordVals[j];
                currentMashSum += mashWordVals[j];
                currentSrqm1Sum += srqm1WordVals[j];
                currentSrqt2Sum += srqt2WordVals[j];
                currentSrqd3Sum += srqd3WordVals[j];
                currentSrtg4Sum += srtg4WordVals[j];
                const phraseLength = j - i + 1;

                if (phraseLength >= minWords && phraseLength <= maxWords) {
                  totalCombinationsScanned++;

                  const isMaghribiMatch = magTargetsSet.has(currentMagSum);
                  const isMashriqiMatch = mashTargetsSet.has(currentMashSum);
                  const isSrqm1Match = effectiveTargetSrqm1 > 0 && srqm1TargetsSet.has(currentSrqm1Sum);
                  const isSrqt2Match = effectiveTargetSrqt2 > 0 && srqt2TargetsSet.has(currentSrqt2Sum);
                  const isSrqd3Match = effectiveTargetSrqd3 > 0 && srqd3TargetsSet.has(currentSrqd3Sum);
                  const isSrtg4Match = effectiveTargetSrtg4 > 0 && srtg4TargetsSet.has(currentSrtg4Sum);

                  if (isMaghribiMatch || isMashriqiMatch || isSrqm1Match || isSrqt2Match || isSrqd3Match || isSrtg4Match) {
                    const phraseWords = rawTokens.slice(i, j + 1);
                    const phraseText = phraseWords.join(' ');
                    const cleanPhrase = cleanTokens.slice(i, j + 1).join(' ');

                    // Check Noorani filter
                    if (onlyNoorani) {
                      const allChars = cleanPhrase.replace(/\s+/g, '').split('');
                      const isAllNoorani = allChars.every(
                        (c) => NOORANI_LETTERS_SET.has(c) || NOORANI_LETTERS_SET.has(normalizeAbjadChar(c))
                      );
                      if (!isAllNoorani) continue;
                    }

                    // Determine system origin and labeling with strict accuracy across all 6 systems:
                    const isTargetDiffering = (targetMaghribi !== targetMashriqi) || 
                      (effectiveTargetSrqm1 > 0 && (targetMaghribi !== effectiveTargetSrqm1 || targetMashriqi !== effectiveTargetSrqm1)) ||
                      (effectiveTargetSrqt2 > 0 && (targetMaghribi !== effectiveTargetSrqt2 || targetMashriqi !== effectiveTargetSrqt2)) ||
                      (effectiveTargetSrqd3 > 0 && (targetMaghribi !== effectiveTargetSrqd3 || targetMashriqi !== effectiveTargetSrqd3)) ||
                      (effectiveTargetSrtg4 > 0 && (targetMaghribi !== effectiveTargetSrtg4 || targetMashriqi !== effectiveTargetSrtg4));
                    let systemOrigin: InverseQuranicMatch['systemOrigin'] = 'common';
                    let systemLabel = 'مشترك';

                    if (isTargetDiffering) {
                      if (isSrqd3Match && !isSrqm1Match && !isMashriqiMatch && !isMaghribiMatch) {
                        systemOrigin = 'srqd3';
                        systemLabel = 'أرض 3';
                      } else if (isSrqm1Match && !isSrqd3Match && !isMashriqiMatch && !isMaghribiMatch) {
                        systemOrigin = 'srqm1';
                        systemLabel = 'أرض 4';
                      } else if (isMashriqiMatch && !isMaghribiMatch && !isSrqm1Match && !isSrqd3Match) {
                        systemOrigin = 'mashriqi';
                        systemLabel = 'شرقي';
                      } else if (isMaghribiMatch && !isMashriqiMatch && !isSrqm1Match && !isSrqd3Match) {
                        systemOrigin = 'maghribi';
                        systemLabel = 'غربي';
                      } else if (isSrqd3Match) {
                        systemOrigin = 'srqd3';
                        systemLabel = 'أرض 3';
                      } else if (isSrqm1Match) {
                        systemOrigin = 'srqm1';
                        systemLabel = 'أرض 4';
                      } else if (isMashriqiMatch) {
                        systemOrigin = 'mashriqi';
                        systemLabel = 'شرقي';
                      } else {
                        systemOrigin = 'maghribi';
                        systemLabel = 'غربي';
                      }
                    } else {
                      systemOrigin = 'common';
                      systemLabel = 'مشترك';
                    }

                    const dedupKey = `${sNum}:${ayah.a}:${cleanPhrase}:${systemOrigin}`;
                    if (!seenMatches.has(dedupKey)) {
                      seenMatches.add(dedupKey);

                      const isPureNoorani = cleanPhrase
                        .replace(/\s+/g, '')
                        .split('')
                        .every((c) => NOORANI_LETTERS_SET.has(c) || NOORANI_LETTERS_SET.has(normalizeAbjadChar(c)));

                      const breakdown = phraseWords.map((pw, pidx) => {
                        const cleanW = cleanTokens[i + pidx];
                        const magVal = magWordVals[i + pidx];
                        const mashVal = mashWordVals[i + pidx];
                        const srqm1Val = srqm1WordVals[i + pidx];
                        const srqt2Val = srqt2WordVals[i + pidx];
                        const srqd3Val = srqd3WordVals[i + pidx];
                        const srtg4Val = srtg4WordVals[i + pidx];
                        const letters = cleanW.split('').map((c) => ({
                          char: c,
                          magVal: MAGHRIBI_VALUES[c] ?? MAGHRIBI_VALUES[normalizeAbjadChar(c)] ?? 0,
                          mashVal: MASHRIQI_VALUES[c] ?? MASHRIQI_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqm1Val: SRQM_1_VALUES[c] ?? SRQM_1_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqt2Val: SRQT_2_VALUES[c] ?? SRQT_2_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqd3Val: SRQD_3_VALUES[c] ?? SRQD_3_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srtg4Val: SRTG_4_VALUES[c] ?? SRTG_4_VALUES[normalizeAbjadChar(c)] ?? 0,
                        }));
                        return {
                          word: pw,
                          value: isSrtg4Match ? srtg4Val : isSrqd3Match ? srqd3Val : isSrqt2Match ? srqt2Val : isSrqm1Match ? srqm1Val : isMaghribiMatch ? magVal : mashVal,
                          magVal,
                          mashVal,
                          srqm1Val,
                          srqt2Val,
                          srqd3Val,
                          srtg4Val,
                          letters,
                        };
                      });

                      let matchType: InverseQuranicMatch['matchType'] = 'verse_chain';
                      let matchTypeLabel = `سلسلة قرآنية (${phraseLength} كلمات)`;

                      const isFatihahAyah =
                        (ayah.a === 1 &&
                          [2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 50, 68].includes(sNum)) ||
                        (sNum === 42 && ayah.a === 2);

                      if (
                        isFatihahAyah &&
                        (phraseLength === n ||
                          ['حم', 'عسق', 'الم', 'الر', 'طسم', 'طس', 'طه', 'يس', 'ص', 'ق', 'ن', 'كهيعص', 'المص', 'المر'].includes(cleanPhrase))
                      ) {
                        matchType = 'fawatih';
                        matchTypeLabel =
                          sNum === 42 && ayah.a === 2
                            ? 'فاتحة سورة الشورى (الآية 2: عسق)'
                            : sNum === 42 && ayah.a === 1
                            ? 'فاتحة سورة الشورى (الآية 1: حم)'
                            : `فاتحة سورة قرآنية (${cleanPhrase})`;
                      } else if (phraseLength === 1) {
                        matchType = 'single_word';
                        matchTypeLabel = 'مفردة قرآنية';
                      } else if (phraseLength === n) {
                        matchType = 'full_ayah';
                        matchTypeLabel = 'آية كريمة كاملة';
                      }

                      if (phraseText.includes('لا إله إلا') || phraseText.includes('الله أحد')) {
                        matchType = 'creed_tauhid';
                        matchTypeLabel = 'آية وعبارة توحيد';
                      }

                      const quranUrl = getQuranTopSearchUrl(phraseText);

                      const matchObj: InverseQuranicMatch = {
                        id: `match_${sNum}_${ayah.a}_${i}_${j}_${systemOrigin}_${Date.now()}`,
                        phrase: phraseText,
                        cleanPhrase,
                        value: isSrtg4Match ? currentSrtg4Sum : isSrqd3Match ? currentSrqd3Sum : isSrqt2Match ? currentSrqt2Sum : isSrqm1Match ? currentSrqm1Sum : isMaghribiMatch ? currentMagSum : currentMashSum,
                        maghribiValue: currentMagSum,
                        mashriqiValue: currentMashSum,
                        srqm1Value: currentSrqm1Sum,
                        srqt2Value: currentSrqt2Sum,
                        srqd3Value: currentSrqd3Sum,
                        srtg4Value: currentSrtg4Sum,
                        systemOrigin,
                        systemLabel,
                        isIntrinsicCommon: currentMagSum === currentMashSum && currentMagSum === currentSrqm1Sum && currentMagSum === currentSrqt2Sum && currentMagSum === currentSrqd3Sum && currentMagSum === currentSrtg4Sum,
                        wordCount: phraseLength,
                        letterCount: cleanPhrase.replace(/\s+/g, '').length,
                        surahName,
                        surahNumber: sNum,
                        ayahNumber: ayah.a,
                        fullAyahText: ayah.t,
                        matchType,
                        matchTypeLabel,
                        isPureNoorani,
                        breakdown,
                        quranUrl,
                      };

                      matches.push(matchObj);
                      if (onMatch) {
                        onMatch(matchObj);
                      }
                    }
                  }
                }

                  if (
                    currentMagSum > maxTarget &&
                    currentMashSum > maxTarget &&
                    (effectiveTargetSrqm1 === 0 || currentSrqm1Sum > maxTarget) &&
                    (effectiveTargetSrqt2 === 0 || currentSrqt2Sum > maxTarget) &&
                    (effectiveTargetSrqd3 === 0 || currentSrqd3Sum > maxTarget) &&
                    (effectiveTargetSrtg4 === 0 || currentSrtg4Sum > maxTarget)
                  ) {
                    break; // Pruning: sums only increase
                  }
                }
              }

              // Full-Ayah check if verse exceeds maxWords (e.g. longer verses like Ayat Al-Kursi)
              if (n > maxWords && (scope === 'all' || scope === 'verses_and_chains')) {
                let fullMagSum = 0;
                let fullMashSum = 0;
                let fullSrqm1Sum = 0;
                let fullSrqt2Sum = 0;
                let fullSrqd3Sum = 0;
                let fullSrtg4Sum = 0;
                for (let k = 0; k < n; k++) {
                  fullMagSum += magWordVals[k];
                  fullMashSum += mashWordVals[k];
                  fullSrqm1Sum += srqm1WordVals[k];
                  fullSrqt2Sum += srqt2WordVals[k];
                  fullSrqd3Sum += srqd3WordVals[k];
                  fullSrtg4Sum += srtg4WordVals[k];
                }

                const isMagMatch = magTargetsSet.has(fullMagSum);
                const isMashMatch = mashTargetsSet.has(fullMashSum);
                const isSrqm1MatchFull = effectiveTargetSrqm1 > 0 && srqm1TargetsSet.has(fullSrqm1Sum);
                const isSrqt2MatchFull = effectiveTargetSrqt2 > 0 && srqt2TargetsSet.has(fullSrqt2Sum);
                const isSrqd3MatchFull = effectiveTargetSrqd3 > 0 && srqd3TargetsSet.has(fullSrqd3Sum);
                const isSrtg4MatchFull = effectiveTargetSrtg4 > 0 && srtg4TargetsSet.has(fullSrtg4Sum);

                if (isMagMatch || isMashMatch || isSrqm1MatchFull || isSrqt2MatchFull || isSrqd3MatchFull || isSrtg4MatchFull) {
                  totalCombinationsScanned++;
                  const cleanPhrase = cleanTokens.join(' ');
                  let allowNoorani = true;
                  if (onlyNoorani) {
                    const allChars = cleanPhrase.replace(/\s+/g, '').split('');
                    allowNoorani = allChars.every(
                      (c) => NOORANI_LETTERS_SET.has(c) || NOORANI_LETTERS_SET.has(normalizeAbjadChar(c))
                    );
                  }

                  if (allowNoorani) {
                    const isTargetDiffering = (targetMaghribi !== targetMashriqi) || 
                      (effectiveTargetSrqm1 > 0 && (targetMaghribi !== effectiveTargetSrqm1 || targetMashriqi !== effectiveTargetSrqm1)) ||
                      (effectiveTargetSrqt2 > 0 && (targetMaghribi !== effectiveTargetSrqt2 || targetMashriqi !== effectiveTargetSrqt2)) ||
                      (effectiveTargetSrqd3 > 0 && (targetMaghribi !== effectiveTargetSrqd3 || targetMashriqi !== effectiveTargetSrqd3)) ||
                      (effectiveTargetSrtg4 > 0 && (targetMaghribi !== effectiveTargetSrtg4 || targetMashriqi !== effectiveTargetSrtg4));
                    let systemOrigin: InverseQuranicMatch['systemOrigin'] = 'common';
                    let systemLabel = 'مشترك';
                    const isIntrinsicCommon = fullMagSum === fullMashSum && fullMagSum === fullSrqm1Sum && fullMagSum === fullSrqt2Sum && fullMagSum === fullSrqd3Sum && fullMagSum === fullSrtg4Sum;

                    if (isTargetDiffering) {
                      if (isSrqd3MatchFull && !isSrqm1MatchFull && !isMashMatch && !isMagMatch) {
                        systemOrigin = 'srqd3';
                        systemLabel = 'أرض 3';
                      } else if (isSrqm1MatchFull && !isSrqd3MatchFull && !isMashMatch && !isMagMatch) {
                        systemOrigin = 'srqm1';
                        systemLabel = 'أرض 4';
                      } else if (isMashMatch && !isMagMatch && !isSrqm1MatchFull && !isSrqd3MatchFull) {
                        systemOrigin = 'mashriqi';
                        systemLabel = 'شرقي';
                      } else if (isMagMatch && !isMashMatch && !isSrqm1MatchFull && !isSrqd3MatchFull) {
                        systemOrigin = 'maghribi';
                        systemLabel = 'غربي';
                      } else if (isSrqd3MatchFull) {
                        systemOrigin = 'srqd3';
                        systemLabel = 'أرض 3';
                      } else if (isSrqm1MatchFull) {
                        systemOrigin = 'srqm1';
                        systemLabel = 'أرض 4';
                      } else if (isMashMatch) {
                        systemOrigin = 'mashriqi';
                        systemLabel = 'شرقي';
                      } else {
                        systemOrigin = 'maghribi';
                        systemLabel = 'غربي';
                      }
                    } else {
                      systemOrigin = 'common';
                      systemLabel = 'مشترك';
                    }

                    const dedupKey = `${sNum}:${ayah.a}:${cleanPhrase}:${systemOrigin}`;
                    if (!seenMatches.has(dedupKey)) {
                      seenMatches.add(dedupKey);

                      const isPureNoorani = cleanPhrase
                        .replace(/\s+/g, '')
                        .split('')
                        .every((c) => NOORANI_LETTERS_SET.has(c) || NOORANI_LETTERS_SET.has(normalizeAbjadChar(c)));

                      const breakdown = rawTokens.map((pw, pidx) => ({
                        word: pw,
                        value: isSrtg4MatchFull ? srtg4WordVals[pidx] : isSrqd3MatchFull ? srqd3WordVals[pidx] : isSrqt2MatchFull ? srqt2WordVals[pidx] : isSrqm1MatchFull ? srqm1WordVals[pidx] : isMagMatch ? magWordVals[pidx] : mashWordVals[pidx],
                        magVal: magWordVals[pidx],
                        mashVal: mashWordVals[pidx],
                        srqm1Val: srqm1WordVals[pidx],
                        srqt2Val: srqt2WordVals[pidx],
                        srqd3Val: srqd3WordVals[pidx],
                        srtg4Val: srtg4WordVals[pidx],
                        letters: cleanTokens[pidx].split('').map((c) => ({
                          char: c,
                          magVal: MAGHRIBI_VALUES[c] ?? MAGHRIBI_VALUES[normalizeAbjadChar(c)] ?? 0,
                          mashVal: MASHRIQI_VALUES[c] ?? MASHRIQI_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqm1Val: SRQM_1_VALUES[c] ?? SRQM_1_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqt2Val: SRQT_2_VALUES[c] ?? SRQT_2_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srqd3Val: SRQD_3_VALUES[c] ?? SRQD_3_VALUES[normalizeAbjadChar(c)] ?? 0,
                          srtg4Val: SRTG_4_VALUES[c] ?? SRTG_4_VALUES[normalizeAbjadChar(c)] ?? 0,
                        })),
                      }));

                      const matchObj: InverseQuranicMatch = {
                        id: `match_${sNum}_${ayah.a}_full_${systemOrigin}_${Date.now()}`,
                        phrase: ayah.t,
                        cleanPhrase,
                        value: isSrtg4MatchFull ? fullSrtg4Sum : isSrqd3MatchFull ? fullSrqd3Sum : isSrqt2MatchFull ? fullSrqt2Sum : isSrqm1MatchFull ? fullSrqm1Sum : isMagMatch ? fullMagSum : fullMashSum,
                        maghribiValue: fullMagSum,
                        mashriqiValue: fullMashSum,
                        srqm1Value: fullSrqm1Sum,
                        srqt2Value: fullSrqt2Sum,
                        srqd3Value: fullSrqd3Sum,
                        srtg4Value: fullSrtg4Sum,
                        systemOrigin,
                        systemLabel,
                        isIntrinsicCommon,
                        wordCount: n,
                        letterCount: cleanPhrase.replace(/\s+/g, '').length,
                        surahName,
                      surahNumber: sNum,
                      ayahNumber: ayah.a,
                      fullAyahText: ayah.t,
                      matchType: 'full_ayah',
                      matchTypeLabel: 'آية كريمة كاملة',
                      isPureNoorani,
                      breakdown,
                      quranUrl: getQuranTopSearchUrl(ayah.t),
                    };

                    matches.push(matchObj);
                    if (onMatch) onMatch(matchObj);
                  }
                }
              }
            }
          }
        }

        currentSurah = endSurah + 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? Math.round(totalCombinationsScanned / elapsed) : 0;
        const percent = Math.min(100, Math.round((currentSurah / totalSurahs) * 100));
        const currentSurahName = SURAH_NAMES[Math.min(endSurah, totalSurahs)] || `سورة ${endSurah}`;

        if (onProgress) {
          onProgress({
            percent,
            scannedCount: totalCombinationsScanned,
            totalCount: totalSurahs,
            matchesCount: matches.length,
            itemsPerSecond: speed,
            currentSurahOrPhase: `سورة ${currentSurahName} (${Math.min(endSurah, totalSurahs)} من 114)`,
            isRunning: currentSurah <= totalSurahs && matches.length < maxResults,
            isCompleted: currentSurah > totalSurahs || matches.length >= maxResults,
            isCancelled: false,
          });
        }

        if (currentSurah <= totalSurahs && matches.length < maxResults) {
          // Cooperative timeout ensures browser event loop breathes and React renders without freezing
          setTimeout(step, 4);
        } else {
          if (onProgress) {
            onProgress({
              percent: 80,
              scannedCount: totalCombinationsScanned,
              totalCount: totalSurahs,
              matchesCount: matches.length,
              itemsPerSecond: speed,
              currentSurahOrPhase: `اكتمل مسح 114 سورة كريمة (${matches.length} مطابقة) - جاري الفرز والمعالجة...`,
              isRunning: true,
              isCompleted: false,
              isCancelled: false,
            });
          }
          // Cooperative timeout before triggering onComplete
          setTimeout(() => {
            if (onComplete) onComplete(matches, false);
            resolve(matches);
          }, 20);
        }
      };

      step();
    });
  }
}
