import {
  NOORANI_LETTERS_SET,
  cleanText,
  LayerInfo,
} from '../cipherData';
import { quranicDictionary, QuranicWordMeta } from './quranicDictionary';
import { arabicDictionary } from './arabicDictionary';

export interface NooraniPurityInfo {
  totalLetters: number;
  nooraniCount: number;
  percentage: number;
  isPure: boolean; // 100%
  nonNooraniLetters: string[];
}

/**
 * 1. Calculates the Noorani Purity Index (14 letters ratio)
 */
export function getNooraniPurity(text: string): NooraniPurityInfo {
  const clean = cleanText(text).replace(/[^ء-ي]/g, '');
  if (!clean) {
    return {
      totalLetters: 0,
      nooraniCount: 0,
      percentage: 0,
      isPure: false,
      nonNooraniLetters: [],
    };
  }

  let nooraniCount = 0;
  const nonNooraniLetters: string[] = [];

  for (const char of clean) {
    if (NOORANI_LETTERS_SET.has(char)) {
      nooraniCount++;
    } else {
      nonNooraniLetters.push(char);
    }
  }

  const percentage = Math.round((nooraniCount / clean.length) * 100);
  return {
    totalLetters: clean.length,
    nooraniCount,
    percentage,
    isPure: percentage === 100,
    nonNooraniLetters,
  };
}

export interface MirrorAnalysisInfo {
  reversed: string;
  isPalindrome: boolean; // Word reads same forwards and backwards
  isTwinMatch: boolean;  // Forward is valid and reverse is ALSO valid Quranic/Dict word
  forwardMeta: QuranicWordMeta | null;
  forwardIsDict: boolean;
  reverseMeta: QuranicWordMeta | null;
  reverseIsDict: boolean;
}

/**
 * 5. Analyzes Mirror & Palindrome Symmetry
 */
export function analyzeMirrorSymmetry(word: string): MirrorAnalysisInfo {
  const clean = cleanText(word).replace(/[^ء-ي]/g, '');
  const reversed = clean.split('').reverse().join('');
  const isPalindrome = clean.length > 1 && clean === reversed;

  const forwardMeta = quranicDictionary.getWordDetails(clean);
  const forwardIsDict = Boolean(arabicDictionary.getMatchedWord(clean));

  const reverseMeta = clean !== reversed ? quranicDictionary.getWordDetails(reversed) : forwardMeta;
  const reverseIsDict = clean !== reversed ? Boolean(arabicDictionary.getMatchedWord(reversed)) : forwardIsDict;

  const isTwinMatch =
    clean.length > 1 &&
    (forwardMeta !== null || forwardIsDict) &&
    (reverseMeta !== null || reverseIsDict);

  return {
    reversed,
    isPalindrome,
    isTwinMatch,
    forwardMeta,
    forwardIsDict,
    reverseMeta,
    reverseIsDict,
  };
}

export interface BidirectionalLoopInfo {
  isClosedLoop: boolean;
  explanation: string;
}

/**
 * 2. Checks if a candidate transformation forms a closed reciprocal round-trip loop
 */
export function checkBidirectionalLoop(
  originalWord: string,
  candidateWord: string,
  layers: LayerInfo[],
  mode: 'encryption' | 'decryption' = 'encryption'
): BidirectionalLoopInfo {
  const cleanOrig = cleanText(originalWord).replace(/[^ء-ي]/g, '');
  const cleanCand = cleanText(candidateWord).replace(/[^ء-ي]/g, '');

  if (!cleanOrig || !cleanCand || cleanOrig.length !== cleanCand.length) {
    return { isClosedLoop: false, explanation: '' };
  }

  // Build character-to-character layer reverse mapping
  let formsLoop = true;

  if (mode === 'encryption') {
    // In encryption, original char is mapped to a cipher char in a layer.
    // Check if decoding each cipher char can lead back to the original char.
    for (let i = 0; i < cleanOrig.length; i++) {
      const oChar = cleanOrig[i];
      const cChar = cleanCand[i];

      // Find layers where cChar is in cipherLetters
      const matchingLayers = layers.filter((l) =>
        l.cipherLetters.some((c) => c === cChar)
      );

      // Check if oChar is present in arabicLetters of any of those matching layers
      const canDecBack = matchingLayers.some((l) =>
        l.arabicLetters.includes(oChar)
      );

      if (!canDecBack) {
        formsLoop = false;
        break;
      }
    }
  } else {
    // In decryption, candidate is Arabic word decoded from cipher
    for (let i = 0; i < cleanOrig.length; i++) {
      const cChar = cleanOrig[i]; // input cipher
      const aChar = cleanCand[i]; // candidate decoded Arabic

      const matchingLayers = layers.filter((l) =>
        l.arabicLetters.includes(aChar)
      );

      const canEncBack = matchingLayers.some((l) =>
        l.cipherLetters.some((c) => c === cChar)
      );

      if (!canEncBack) {
        formsLoop = false;
        break;
      }
    }
  }

  return {
    isClosedLoop: formsLoop,
    explanation: formsLoop
      ? 'حلقة تبادلية مغلقة: فك أو تشفير الناتج يعيد الأصل بدقة عبر نفس المنظومة'
      : '',
  };
}

export interface SentenceCandidate {
  sentence: string;
  words: {
    original: string;
    chosen: string;
    isQuranic: boolean;
    isDict: boolean;
    surahName?: string;
    ayahNum?: number;
    purity: NooraniPurityInfo;
  }[];
  totalScore: number;
  quranicCount: number;
  dictCount: number;
  overallPurity: number;
}

/**
 * 4. Multi-Word Coherence Scanner: Finds meaningful coherent multi-word sentences
 */
export function scanMultiWordCoherence(
  phrase: string,
  wordCandidatesMap: Map<
    string,
    {
      combo: string;
      meta?: QuranicWordMeta | null;
      isDict?: boolean;
    }[]
  >
): SentenceCandidate[] {
  const words = phrase
    .split(/\s+/)
    .map((w) => cleanText(w).replace(/[^ء-ي]/g, ''))
    .filter(Boolean);

  if (words.length < 2) return [];

  // For each word, get top valid candidates (prioritize Quranic exact, then Dictionary, then top similarity)
  const candidateLists = words.map((w) => {
    const list = wordCandidatesMap.get(w) || [];
    // Filter and sort candidates
    const valid = list.filter((item) => item.meta != null || item.isDict);
    if (valid.length > 0) {
      return valid.slice(0, 8); // Top 8 per word to keep combinations fast
    }
    return list.slice(0, 4);
  });

  // If any word has 0 candidates, return empty
  if (candidateLists.some((list) => list.length === 0)) {
    return [];
  }

  const results: SentenceCandidate[] = [];

  // Cartesian product with limit
  function buildSentences(
    wordIdx: number,
    currentSelection: {
      original: string;
      chosen: string;
      isQuranic: boolean;
      isDict: boolean;
      surahName?: string;
      ayahNum?: number;
      purity: NooraniPurityInfo;
    }[]
  ) {
    if (results.length >= 30) return;

    if (wordIdx === words.length) {
      const sentence = currentSelection.map((s) => s.chosen).join(' ');
      const quranicCount = currentSelection.filter((s) => s.isQuranic).length;
      const dictCount = currentSelection.filter((s) => s.isDict).length;
      const avgPurity = Math.round(
        currentSelection.reduce((sum, s) => sum + s.purity.percentage, 0) /
          currentSelection.length
      );

      // Score: Quranic words = 30 pts each, Dict words = 15 pts, Purity = up to 20 pts
      const totalScore =
        quranicCount * 30 + dictCount * 15 + Math.round(avgPurity * 0.2);

      results.push({
        sentence,
        words: [...currentSelection],
        totalScore,
        quranicCount,
        dictCount,
        overallPurity: avgPurity,
      });
      return;
    }

    const currentWord = words[wordIdx];
    const options = candidateLists[wordIdx];

    for (const opt of options) {
      const purity = getNooraniPurity(opt.combo);
      currentSelection.push({
        original: currentWord,
        chosen: opt.combo,
        isQuranic: !!opt.meta,
        isDict: !!opt.isDict,
        surahName: opt.meta?.surahName,
        ayahNum: opt.meta?.ayahNum,
        purity,
      });

      buildSentences(wordIdx + 1, currentSelection);
      currentSelection.pop();
    }
  }

  buildSentences(0, []);

  // Sort sentences by totalScore descending
  results.sort((a, b) => b.totalScore - a.totalScore);
  return results.slice(0, 15);
}
