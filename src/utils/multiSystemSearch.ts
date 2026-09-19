import {
  LayerInfo,
  ARABIC_PRESETS,
  NOORANI_PRESETS,
  INITIAL_OPTIONAL_BROWSER_TABLES,
  QuranicSegmentationResult,
  analyzeWord,
  segmentIntoQuranicWords,
  getAllCombinations,
  decryptCipherChar,
  getDecryptionCombinations,
  cleanText,
  normalizeArabicChar
} from '../cipherData';
import { SavedCustomTable } from '../context/CipherLayersContext';
import { quranicDictionary, QuranicWordMeta } from './quranicDictionary';
import { arabicDictionary } from './arabicDictionary';

export interface SystemDefinition {
  id: string;
  systemNumber: number;
  name: string;
  arabicName: string;
  nooraniName: string;
  category: 'standard' | 'matrix' | 'saved';
  layers: LayerInfo[];
}

export interface MatchedQuranWord {
  word: string;
  meta: QuranicWordMeta;
  source: 'encrypted' | 'decrypted';
  isReversed?: boolean;
}

export interface SystemScanMatch {
  systemNumber: number;
  systemId: string;
  systemName: string;
  arabicName: string;
  nooraniName: string;
  category: 'standard' | 'matrix' | 'saved';
  layers: LayerInfo[];
  
  // Dedicated Encryption Results
  encryption: {
    canonicalCipher: string;
    cipherSegmentation: QuranicSegmentationResult;
    quranicMatches: { word: string; meta: QuranicWordMeta; isReversed: boolean }[];
    dictMatches: { word: string; isReversed: boolean }[];
    combinationsSample: string[];
    hasQuranicOpenings: boolean;
  };

  // Dedicated Decryption Results
  decryption: {
    quranicMatches: { word: string; meta: QuranicWordMeta; isReversed: boolean }[];
    dictMatches: { word: string; isReversed: boolean }[];
    combinationsSample: string[];
  };

  // Aggregated fields for quick overview
  canonicalCipher: string;
  cipherSegmentation: QuranicSegmentationResult;
  quranicMatches: MatchedQuranWord[];
  dictMatches: { word: string; source: 'encrypted' | 'decrypted' }[];
  cipherCombinationsSample: string[];
  decryptedCandidatesSample: string[];
  
  totalMatchesCount: number;
  hasQuranicOpenings: boolean;
}

/**
 * Checks if a system has actual populated layers (filters out empty or zero-letter tables)
 */
export function isPopulatedSystem(layers: LayerInfo[]): boolean {
  if (!layers || layers.length === 0) return false;
  let arabicCount = 0;
  let cipherCount = 0;
  for (const layer of layers) {
    if (layer.arabicLetters) {
      for (const char of layer.arabicLetters) {
        if (char && char.trim() !== '') arabicCount++;
      }
    }
    if (layer.cipherLetters) {
      for (const char of layer.cipherLetters) {
        if (char && char.trim() !== '') cipherCount++;
      }
    }
  }
  return arabicCount >= 4 && cipherCount >= 4;
}

/**
 * Builds the comprehensive list of all searchable systems:
 * 1. Standard tables (INITIAL_OPTIONAL_BROWSER_TABLES)
 * 2. All valid permutations of (6 Arabic Presets × 7 Noorani Presets)
 * 3. User Saved Custom Tables
 * Filters out any empty or unpopulated systems automatically.
 */
export function getAllSearchableSystems(savedTables: SavedCustomTable[] = []): SystemDefinition[] {
  const systems: SystemDefinition[] = [];
  let sysCounter = 1;

  // 1. Standard Preset Tables
  for (const table of INITIAL_OPTIONAL_BROWSER_TABLES) {
    if (isPopulatedSystem(table.layers)) {
      systems.push({
        id: `std_${table.id}`,
        systemNumber: sysCounter++,
        name: table.name,
        arabicName: 'المعياري',
        nooraniName: table.name,
        category: 'standard',
        layers: JSON.parse(JSON.stringify(table.layers)),
      });
    }
  }

  // 2. 42 Matrix Systems (6 Arabic × 7 Noorani)
  const validArabicPresets = Object.values(ARABIC_PRESETS).filter(
    (a) => a.id !== 'clearArabic' && a.arabicLayers && a.arabicLayers.some((l) => l.letters.some((c) => c && c.trim()))
  );
  const validNooraniPresets = Object.values(NOORANI_PRESETS).filter(
    (n) => n.id !== 'clearNoorani' && n.nooraniLayers && n.nooraniLayers.some((l) => l.cipherLetters && l.cipherLetters.some((c) => c && c.trim()))
  );

  for (const arabicP of validArabicPresets) {
    for (const nooraniP of validNooraniPresets) {
      // Build layers by combining arabic distribution and noorani distribution
      const combinedLayers: LayerInfo[] = [7, 6, 5, 4, 3, 2, 1].map((layerNum) => {
        const aLayer = arabicP.arabicLayers.find((al) => al.layer === layerNum);
        const nLayer = nooraniP.nooraniLayers.find((nl) => nl.layer === layerNum);

        const arabicLetters = aLayer ? [...aLayer.letters] : ['', '', '', ''];
        const cipherLetters = nLayer
          ? Array.from({ length: 9 }, (_, i) => (nLayer.cipherLetters && nLayer.cipherLetters[i]) || '')
          : Array(9).fill('');

        return {
          layer: layerNum,
          cipherLetters,
          arabicLetters,
          description: `الطبقة ${layerNum}: ${nooraniP.name} × ${arabicP.name}`,
        };
      });

      if (isPopulatedSystem(combinedLayers)) {
        systems.push({
          id: `matrix_${arabicP.id}_${nooraniP.id}`,
          systemNumber: sysCounter++,
          name: `منظومة: ${arabicP.name.replace(/^\d+-\s*/, '')} × ${nooraniP.name.replace(/^\d+-\s*/, '')}`,
          arabicName: arabicP.name.replace(/^\d+-\s*/, ''),
          nooraniName: nooraniP.name.replace(/^\d+-\s*/, ''),
          category: 'matrix',
          layers: combinedLayers,
        });
      }
    }
  }

  // 3. User Saved Custom Tables
  for (const st of savedTables) {
    // Avoid duplicates if standard table already registered and ensure it's not empty
    if (!systems.some((s) => s.id === `std_${st.id}`) && isPopulatedSystem(st.layers)) {
      systems.push({
        id: `saved_${st.id}`,
        systemNumber: sysCounter++,
        name: `(مخصصة) ${st.name}`,
        arabicName: 'مخصص',
        nooraniName: 'مخصص',
        category: 'saved',
        layers: JSON.parse(JSON.stringify(st.layers)),
      });
    }
  }

  return systems;
}

/**
 * Fast synchronous analysis of a single system for a given input query.
 */
export function analyzeSystemForSearch(system: SystemDefinition, rawInput: string): SystemScanMatch {
  const cleaned = cleanText(rawInput).trim();
  
  if (!cleaned) {
    const emptySegmentation: QuranicSegmentationResult = {
      score: 0,
      multiWordCount: 0,
      quranicCoveredChars: 0,
      segments: [],
      formattedDisplay: '',
    };
    return {
      systemNumber: system.systemNumber,
      systemId: system.id,
      systemName: system.name,
      arabicName: system.arabicName,
      nooraniName: system.nooraniName,
      category: system.category,
      layers: system.layers,
      encryption: {
        canonicalCipher: '',
        cipherSegmentation: emptySegmentation,
        quranicMatches: [],
        dictMatches: [],
        combinationsSample: [],
        hasQuranicOpenings: false,
      },
      decryption: {
        quranicMatches: [],
        dictMatches: [],
        combinationsSample: [],
      },
      canonicalCipher: '',
      cipherSegmentation: emptySegmentation,
      quranicMatches: [],
      dictMatches: [],
      cipherCombinationsSample: [],
      decryptedCandidatesSample: [],
      totalMatchesCount: 0,
      hasQuranicOpenings: false,
    };
  }

  // 1. Encryption Analysis
  const encDetails = analyzeWord(cleaned, system.layers);
  const canonicalCipher = encDetails
    .filter((d) => !d.isSpecialOrSpace)
    .map((d) => d.prob1 || '')
    .join('');

  const cipherSegmentation = segmentIntoQuranicWords(canonicalCipher);
  const hasQuranicOpenings = cipherSegmentation.multiWordCount > 0;

  // Generate encryption combinations
  const encCombinations = getAllCombinations(encDetails, 48, true);
  const encQuranicMatches: { word: string; meta: QuranicWordMeta; isReversed: boolean }[] = [];
  const encDictMatches: { word: string; isReversed: boolean }[] = [];
  const encSeen = new Set<string>();

  for (const word of encCombinations) {
    if (!word) continue;

    // Normal
    if (!encSeen.has(word)) {
      encSeen.add(word);
      const qMeta = quranicDictionary.getWordDetails(word);
      if (qMeta && qMeta.isExact) {
        encQuranicMatches.push({ word, meta: qMeta, isReversed: false });
      } else if (arabicDictionary.isWord(word)) {
        encDictMatches.push({ word, isReversed: false });
      }
    }

    // Reversed
    const rev = word.split('').reverse().join('');
    if (rev !== word && !encSeen.has(rev)) {
      encSeen.add(rev);
      const qMetaRev = quranicDictionary.getWordDetails(rev);
      if (qMetaRev && qMetaRev.isExact) {
        encQuranicMatches.push({ word: rev, meta: qMetaRev, isReversed: true });
      } else if (arabicDictionary.isWord(rev)) {
        encDictMatches.push({ word: rev, isReversed: true });
      }
    }
  }

  // 2. Decryption Analysis
  const chars = Array.from(cleaned);
  const decItems = chars.map((char) => {
    if (char === ' ' || char === '\n' || char === '\t') {
      return { char, isSpace: true, candidates: [' '] };
    }
    const res = decryptCipherChar(char, system.layers);
    return {
      char,
      isSpace: false,
      candidates: res.possibleLetters.length > 0 ? res.possibleLetters : [char],
    };
  });

  const decCombinations = getDecryptionCombinations(decItems, 48, true);
  const decQuranicMatches: { word: string; meta: QuranicWordMeta; isReversed: boolean }[] = [];
  const decDictMatches: { word: string; isReversed: boolean }[] = [];
  const decSeen = new Set<string>();

  for (const word of decCombinations) {
    if (!word) continue;

    // Normal
    if (!decSeen.has(word)) {
      decSeen.add(word);
      const qMeta = quranicDictionary.getWordDetails(word);
      if (qMeta && qMeta.isExact) {
        decQuranicMatches.push({ word, meta: qMeta, isReversed: false });
      } else if (arabicDictionary.isWord(word)) {
        decDictMatches.push({ word, isReversed: false });
      }
    }

    // Reversed
    const rev = word.split('').reverse().join('');
    if (rev !== word && !decSeen.has(rev)) {
      decSeen.add(rev);
      const qMetaRev = quranicDictionary.getWordDetails(rev);
      if (qMetaRev && qMetaRev.isExact) {
        decQuranicMatches.push({ word: rev, meta: qMetaRev, isReversed: true });
      } else if (arabicDictionary.isWord(rev)) {
        decDictMatches.push({ word: rev, isReversed: true });
      }
    }
  }

  // Aggregated Quranic list
  const aggregatedQuranic: MatchedQuranWord[] = [
    ...encQuranicMatches.map((m) => ({ word: m.word, meta: m.meta, source: 'encrypted' as const, isReversed: m.isReversed })),
    ...decQuranicMatches.map((m) => ({ word: m.word, meta: m.meta, source: 'decrypted' as const, isReversed: m.isReversed })),
  ];

  // Aggregated Dictionary list
  const aggregatedDict: { word: string; source: 'encrypted' | 'decrypted' }[] = [
    ...encDictMatches.map((d) => ({ word: d.word, source: 'encrypted' as const })),
    ...decDictMatches.map((d) => ({ word: d.word, source: 'decrypted' as const })),
  ];

  const totalMatchesCount =
    encQuranicMatches.length +
    decQuranicMatches.length +
    encDictMatches.length +
    decDictMatches.length +
    (hasQuranicOpenings ? 1 : 0);

  return {
    systemNumber: system.systemNumber,
    systemId: system.id,
    systemName: system.name,
    arabicName: system.arabicName,
    nooraniName: system.nooraniName,
    category: system.category,
    layers: system.layers,
    encryption: {
      canonicalCipher,
      cipherSegmentation,
      quranicMatches: encQuranicMatches,
      dictMatches: encDictMatches,
      combinationsSample: encCombinations.slice(0, 10),
      hasQuranicOpenings,
    },
    decryption: {
      quranicMatches: decQuranicMatches,
      dictMatches: decDictMatches,
      combinationsSample: decCombinations.slice(0, 10),
    },
    canonicalCipher,
    cipherSegmentation,
    quranicMatches: aggregatedQuranic,
    dictMatches: aggregatedDict,
    cipherCombinationsSample: encCombinations.slice(0, 8),
    decryptedCandidatesSample: decCombinations.slice(0, 8),
    totalMatchesCount,
    hasQuranicOpenings,
  };
}
