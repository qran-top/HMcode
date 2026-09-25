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
import { MAGHRIBI_VALUES, MASHRIQI_VALUES } from '../context/GematriaContext';

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
  systemOrigin: 'common' | 'maghribi' | 'mashriqi'; // 'common' = matching in both or matching target in both!
  systemLabel: string; // 'مشترك' | 'غربي' | 'شرقي'
  isIntrinsicCommon: boolean; // maghribiValue === mashriqiValue
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
    letters: { char: string; magVal: number; mashVal: number }[];
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
  mode?: 'dual' | 'maghribi' | 'mashriqi' | string;
  targetMaghribi: number;
  targetMashriqi: number;
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
    options: Omit<ScannerOptions, 'targetMaghribi' | 'targetMashriqi'>
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

    const magTargetsSet = new Set<number>([targetMaghribi, ...alternateTargets]);
    const mashTargetsSet = new Set<number>([targetMashriqi, ...alternateTargets]);
    const maxTarget = Math.max(targetMaghribi, targetMashriqi, ...alternateTargets);

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

        // Process a chunk of Surahs per animation frame / tick
        const surahsPerBatch = 6;
        const endSurah = Math.min(currentSurah + surahsPerBatch - 1, totalSurahs);

        for (let sNum = currentSurah; sNum <= endSurah; sNum++) {
          const ayahsInSurah = cachedSurahBuckets?.get(sNum) || [];
          const surahName = SURAH_NAMES[sNum] || (ayahsInSurah[0] ? ayahsInSurah[0].s : `سورة ${sNum}`);

          for (const ayah of ayahsInSurah) {
            const rawTokens = ayah.t.split(/\s+/).filter(Boolean);
            if (rawTokens.length === 0) continue;

            // Calculate clean words and word values in BOTH Maghribi and Mashriqi
            // CRITICAL FIX: Pass rawTokens (not cleanTokens) so dagger alifs (\u0670), shaddahs, and Uthmani orthography are preserved!
            const cleanTokens = rawTokens.map((w) => cleanArabicTextForGematria(w));
            const magWordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, MAGHRIBI_VALUES)
            );
            const mashWordVals = rawTokens.map((w) =>
              calculateGematriaWithOptions(w, calcOptions, MASHRIQI_VALUES)
            );

            const n = rawTokens.length;

            // Sliding Window over all n-grams
            for (let i = 0; i < n; i++) {
              let currentMagSum = 0;
              let currentMashSum = 0;
              const limit = Math.min(n, i + maxWords);

              for (let j = i; j < limit; j++) {
                currentMagSum += magWordVals[j];
                currentMashSum += mashWordVals[j];
                const phraseLength = j - i + 1;

                if (phraseLength >= minWords && phraseLength <= maxWords) {
                  totalCombinationsScanned++;

                  const isMaghribiMatch = magTargetsSet.has(currentMagSum);
                  const isMashriqiMatch = mashTargetsSet.has(currentMashSum);
                  const isIntrinsicCommon = currentMagSum === currentMashSum;

                  if (isMaghribiMatch || isMashriqiMatch) {
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

                    // Determine system origin and labeling
                    let systemOrigin: InverseQuranicMatch['systemOrigin'] = 'maghribi';
                    let systemLabel = 'غربي';

                    if (isMaghribiMatch && isMashriqiMatch) {
                      systemOrigin = 'common';
                      systemLabel = 'مشترك';
                    } else if (isMaghribiMatch) {
                      systemOrigin = isIntrinsicCommon ? 'common' : 'maghribi';
                      systemLabel = isIntrinsicCommon ? 'مشترك' : 'غربي';
                    } else {
                      systemOrigin = isIntrinsicCommon ? 'common' : 'mashriqi';
                      systemLabel = isIntrinsicCommon ? 'مشترك' : 'شرقي';
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
                        const letters = cleanW.split('').map((c) => ({
                          char: c,
                          magVal: MAGHRIBI_VALUES[c] ?? MAGHRIBI_VALUES[normalizeAbjadChar(c)] ?? 0,
                          mashVal: MASHRIQI_VALUES[c] ?? MASHRIQI_VALUES[normalizeAbjadChar(c)] ?? 0,
                        }));
                        return {
                          word: pw,
                          value: isMaghribiMatch ? magVal : mashVal,
                          magVal,
                          mashVal,
                          letters,
                        };
                      });

                      let matchType: InverseQuranicMatch['matchType'] = 'verse_chain';
                      let matchTypeLabel = `سلسلة قرآنية (${phraseLength} كلمات)`;

                      if (phraseLength === 1) {
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
                        value: isMaghribiMatch ? currentMagSum : currentMashSum,
                        maghribiValue: currentMagSum,
                        mashriqiValue: currentMashSum,
                        systemOrigin,
                        systemLabel,
                        isIntrinsicCommon,
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

                  if (currentMagSum > maxTarget && currentMashSum > maxTarget) {
                    break; // Pruning: sums only increase
                  }
                }
              }

              // Full-Ayah check if verse exceeds maxWords (e.g. longer verses like Ayat Al-Kursi)
              if (n > maxWords && (scope === 'all' || scope === 'verses_and_chains')) {
              let fullMagSum = 0;
              let fullMashSum = 0;
              for (let k = 0; k < n; k++) {
                fullMagSum += magWordVals[k];
                fullMashSum += mashWordVals[k];
              }

              const isMagMatch = magTargetsSet.has(fullMagSum);
              const isMashMatch = mashTargetsSet.has(fullMashSum);

              if (isMagMatch || isMashMatch) {
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
                  let systemOrigin: InverseQuranicMatch['systemOrigin'] = 'maghribi';
                  let systemLabel = 'غربي';
                  const isIntrinsicCommon = fullMagSum === fullMashSum;

                  if (isMagMatch && isMashMatch) {
                    systemOrigin = 'common';
                    systemLabel = 'مشترك';
                  } else if (isMagMatch) {
                    systemOrigin = isIntrinsicCommon ? 'common' : 'maghribi';
                    systemLabel = isIntrinsicCommon ? 'مشترك' : 'غربي';
                  } else {
                    systemOrigin = isIntrinsicCommon ? 'common' : 'mashriqi';
                    systemLabel = isIntrinsicCommon ? 'مشترك' : 'شرقي';
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
                      value: isMagMatch ? magWordVals[pidx] : mashWordVals[pidx],
                      magVal: magWordVals[pidx],
                      mashVal: mashWordVals[pidx],
                      letters: cleanTokens[pidx].split('').map((c) => ({
                        char: c,
                        magVal: MAGHRIBI_VALUES[c] ?? MAGHRIBI_VALUES[normalizeAbjadChar(c)] ?? 0,
                        mashVal: MASHRIQI_VALUES[c] ?? MASHRIQI_VALUES[normalizeAbjadChar(c)] ?? 0,
                      })),
                    }));

                    const matchObj: InverseQuranicMatch = {
                      id: `match_${sNum}_${ayah.a}_full_${systemOrigin}_${Date.now()}`,
                      phrase: ayah.t,
                      cleanPhrase,
                      value: isMagMatch ? fullMagSum : fullMashSum,
                      maghribiValue: fullMagSum,
                      mashriqiValue: fullMashSum,
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
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(step);
          } else {
            setTimeout(step, 0);
          }
        } else {
          this.isScanning = false;
          if (onProgress) {
            onProgress({
              percent: 100,
              scannedCount: totalCombinationsScanned,
              totalCount: totalSurahs,
              matchesCount: matches.length,
              itemsPerSecond: speed,
              currentSurahOrPhase: 'اكتمل المسح الشامل (الشرقي والغربي)',
              isRunning: false,
              isCompleted: true,
              isCancelled: false,
            });
          }
          if (onComplete) onComplete(matches, false);
          resolve(matches);
        }
      };

      step();
    });
  }
}
