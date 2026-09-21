import {
  LayerInfo,
  PRESET_TABLES,
  NOORANI_PRESETS,
  ARABIC_PRESETS,
  createNineCipherSlotsFromList,
  QuranicSegmentationResult,
  analyzeWord,
  segmentIntoQuranicWords,
  getAllCombinations,
  decryptCipherChar,
  getDecryptionCombinations,
  cleanText,
  normalizeArabicChar
} from '../cipherData';
import { SavedCustomTable, SavedArabicPreset, SavedNooraniPreset } from '../context/CipherLayersContext';
import { quranicDictionary, QuranicWordMeta } from './quranicDictionary';
import { arabicDictionary } from './arabicDictionary';

export interface NooraniItem {
  id: string;
  name: string;
  index: number;
  layers: { layer: number; cipherLetters: string[] }[];
}

export interface ArabicItem {
  id: string;
  name: string;
  index: number;
  layers: { layer: number; letters: string[] }[];
}

/**
 * Extracts all Heaven Orders (جداول السماء / الأحرف النورانية) from presets & saved lists
 */
export function getAllNooraniItems(
  savedNooraniPresets: SavedNooraniPreset[] = [],
  savedTables: SavedCustomTable[] = []
): NooraniItem[] {
  const list: Omit<NooraniItem, 'index'>[] = [];

  // 1. Standard Noorani Presets
  for (const preset of Object.values(NOORANI_PRESETS)) {
    list.push({
      id: preset.id,
      name: preset.name,
      layers: preset.nooraniLayers.map((nl) => ({
        layer: nl.layer,
        cipherLetters: [...nl.cipherLetters],
      })),
    });
  }

  // 2. Saved Noorani Presets
  for (const saved of savedNooraniPresets) {
    if (saved.name && !list.some((item) => item.name === saved.name)) {
      list.push({
        id: `saved_noorani_${saved.id}`,
        name: saved.name,
        layers: saved.nooraniLayers.map((nl) => ({
          layer: nl.layer,
          cipherLetters: [...nl.cipherLetters],
        })),
      });
    }
  }

  // 3. Custom Noorani Orders from Saved Custom Tables
  for (const st of savedTables) {
    if (st.nooraniOrderName && !list.some((item) => item.name === st.nooraniOrderName)) {
      const extractedLayers = st.layers.map((l) => ({
        layer: l.layer,
        cipherLetters: (l.cipherLetters || []).filter((c) => c && c.trim() !== ''),
      }));

      if (extractedLayers.some((l) => l.cipherLetters.length > 0)) {
        list.push({
          id: `custom_table_noorani_${st.id}`,
          name: st.nooraniOrderName,
          layers: extractedLayers,
        });
      }
    }
  }

  return list.map((item, idx) => ({
    ...item,
    index: idx + 1,
  }));
}

/**
 * Extracts all Earth Orders (جداول الأرض / الترتيب الأبجدي) from presets & saved lists
 */
export function getAllArabicItems(
  savedArabicPresets: SavedArabicPreset[] = [],
  savedTables: SavedCustomTable[] = []
): ArabicItem[] {
  const list: Omit<ArabicItem, 'index'>[] = [];

  // 1. Standard Arabic Presets
  for (const preset of Object.values(ARABIC_PRESETS)) {
    list.push({
      id: preset.id,
      name: preset.name,
      layers: preset.arabicLayers.map((al) => ({
        layer: al.layer,
        letters: [...al.letters],
      })),
    });
  }

  // 2. Saved Arabic Presets
  for (const saved of savedArabicPresets) {
    if (saved.name && !list.some((item) => item.name === saved.name)) {
      list.push({
        id: `saved_arabic_${saved.id}`,
        name: saved.name,
        layers: saved.arabicLayers.map((al) => ({
          layer: al.layer,
          letters: [...al.letters],
        })),
      });
    }
  }

  // 3. Custom Arabic Orders from Saved Custom Tables
  for (const st of savedTables) {
    if (st.arabicOrderName && !list.some((item) => item.name === st.arabicOrderName)) {
      const extractedLayers = st.layers.map((l) => ({
        layer: l.layer,
        letters: [...(l.arabicLetters || [])],
      }));

      if (extractedLayers.some((l) => l.letters.some((char) => char && char.trim() !== ''))) {
        list.push({
          id: `custom_table_arabic_${st.id}`,
          name: st.arabicOrderName,
          layers: extractedLayers,
        });
      }
    }
  }

  return list.map((item, idx) => ({
    ...item,
    index: idx + 1,
  }));
}

/**
 * Applies the letter 'و' (Waw) strictly to celestial letters (cipherLetters / الأحرف السماوية)
 * in any row/layer containing any of (ن، ق، ص).
 * Terrestrial letters (arabicLetters / الأحرف الأرضية) are NEVER modified.
 */
export function applyWawToCelestialLayers(layers: LayerInfo[]): LayerInfo[] {
  const targetLetters = ['ن', 'ق', 'ص'];
  return layers.map((layer) => {
    const ciphers = Array.isArray(layer.cipherLetters) ? layer.cipherLetters.filter(Boolean) : [];
    // Check if any celestial letter in this row contains ن or ق or ص
    const hasTargetLetter = ciphers.some((ch) =>
      targetLetters.some((t) => typeof ch === 'string' && ch.includes(t))
    );
    if (hasTargetLetter && !ciphers.includes('و')) {
      return {
        ...layer,
        cipherLetters: [...ciphers, 'و'],
        arabicLetters: [...(layer.arabicLetters || [])], // strictly preserved!
      };
    }
    return {
      ...layer,
      cipherLetters: [...ciphers],
      arabicLetters: [...(layer.arabicLetters || [])],
    };
  });
}

/**
 * Builds custom 7-layer cross system from a specific (Noorani Order x Arabic Order) pair.
 * Optionally applies the letter 'و' (Waw) strictly to celestial letters in rows containing (ن، ق، ص).
 */
export function buildCrossLayersFromPair(
  noorani: NooraniItem,
  arabic: ArabicItem,
  revNoorani: boolean = false,
  revArabic: boolean = false,
  includeWawInCelestial: boolean = true
): LayerInfo[] {
  const nooraniMap = new Map(noorani.layers.map((nl) => [nl.layer, nl.cipherLetters]));
  const arabicMap = new Map(arabic.layers.map((al) => [al.layer, al.letters]));

  const layerNumbers = [7, 6, 5, 4, 3, 2, 1];

  let cipherLayersList = layerNumbers.map((l) => nooraniMap.get(l) || []);
  if (revNoorani) {
    cipherLayersList = [...cipherLayersList].reverse();
  }

  let arabicLayersList = layerNumbers.map((l) => arabicMap.get(l) || ['', '', '', '']);
  if (revArabic) {
    arabicLayersList = [...arabicLayersList].reverse();
  }

  const layers: LayerInfo[] = [];
  for (let i = 0; i < layerNumbers.length; i++) {
    const lNum = layerNumbers[i];
    const ciphers = cipherLayersList[i];
    const arabics = arabicLayersList[i];

    layers.push({
      layer: lNum,
      cipherLetters: createNineCipherSlotsFromList(ciphers),
      arabicLetters: [...arabics],
      description: `السماء ${lNum}: [${noorani.name}${revNoorani ? ' معكوس' : ''}] × [${arabic.name}${revArabic ? ' معكوس' : ''}]`,
    });
  }

  if (includeWawInCelestial) {
    return applyWawToCelestialLayers(layers);
  }

  return layers;
}

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

  // 1. Standalone Preset Tables (ALL 18 combinations of السماوية × الأرضية)
  const presets = Object.values(PRESET_TABLES);
  for (const preset of presets) {
    const layers = preset.createLayers();
    if (isPopulatedSystem(layers)) {
      const parts = preset.name.split(' × ');
      const nooraniPart = parts[0]?.replace('سماء: ', '').trim() || 'ترتيب نوراني';
      const arabicPart = parts[1]?.replace('أرض: ', '').trim() || 'ترتيب أبجدي';

      systems.push({
        id: `preset_${preset.id}`,
        systemNumber: sysCounter++,
        name: preset.name,
        arabicName: arabicPart,
        nooraniName: nooraniPart,
        category: 'standard',
        layers,
      });
    }
  }

  // 2. User Saved Custom Tables
  for (const st of savedTables) {
    if (!systems.some((s) => s.name === st.name) && isPopulatedSystem(st.layers)) {
      systems.push({
        id: `saved_${st.id}`,
        systemNumber: sysCounter++,
        name: st.name,
        arabicName: st.arabicOrderName || 'الترتيب الأبجدي المخصص',
        nooraniName: st.nooraniOrderName || 'ترتيب الأحرف النورانية المخصص',
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
      } else {
        const dictMatched = arabicDictionary.getMatchedWord(word);
        if (dictMatched) {
          encDictMatches.push({ word: dictMatched, isReversed: false });
        }
      }
    }

    // Reversed
    const rev = word.split('').reverse().join('');
    if (rev !== word && !encSeen.has(rev)) {
      encSeen.add(rev);
      const qMetaRev = quranicDictionary.getWordDetails(rev);
      if (qMetaRev && qMetaRev.isExact) {
        encQuranicMatches.push({ word: rev, meta: qMetaRev, isReversed: true });
      } else {
        const dictMatchedRev = arabicDictionary.getMatchedWord(rev);
        if (dictMatchedRev) {
          encDictMatches.push({ word: dictMatchedRev, isReversed: true });
        }
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
      } else {
        const dictMatched = arabicDictionary.getMatchedWord(word);
        if (dictMatched) {
          decDictMatches.push({ word: dictMatched, isReversed: false });
        }
      }
    }

    // Reversed
    const rev = word.split('').reverse().join('');
    if (rev !== word && !decSeen.has(rev)) {
      decSeen.add(rev);
      const qMetaRev = quranicDictionary.getWordDetails(rev);
      if (qMetaRev && qMetaRev.isExact) {
        decQuranicMatches.push({ word: rev, meta: qMetaRev, isReversed: true });
      } else {
        const dictMatchedRev = arabicDictionary.getMatchedWord(rev);
        if (dictMatchedRev) {
          decDictMatches.push({ word: dictMatchedRev, isReversed: true });
        }
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

export interface CrossDecipherMatch {
  id: string;
  nooraniId?: string;
  arabicId?: string;
  isNooraniReversed?: boolean;
  isArabicReversed?: boolean;
  primarySystemName: string;
  secondarySystemName?: string;
  nooraniSourceLabel?: string;
  arabicSourceLabel?: string;
  type: 'single_reversed' | 'cross_hybrid' | 'cross_reversed';
  label: string;
  layers: LayerInfo[];
  quranicMatches: {
    word: string;
    meta: QuranicWordMeta;
    isReversed: boolean;
    source: 'plain' | 'enc' | 'dec';
    isShaddah: boolean;
  }[];
  dictMatches: {
    word: string;
    isReversed: boolean;
    source: 'plain' | 'enc' | 'dec';
    isShaddah: boolean;
  }[];
  canonicalCipher: string;
  coherenceScore: number;
}

/**
 * Synthesizes hybrid layers from System A (arabic setup) and System B (cipher setup)
 */
export function createHybridLayers(
  systemA: SystemDefinition,
  systemB: SystemDefinition,
  options: { reverseLayers?: boolean; swapArabicCipher?: boolean } = {}
): LayerInfo[] {
  const maxLayers = Math.min(systemA.layers.length, systemB.layers.length);
  const hybrid: LayerInfo[] = [];

  for (let i = 0; i < maxLayers; i++) {
    const lA = systemA.layers[i];
    const lB = systemB.layers[i];

    const arabic = options.swapArabicCipher ? lA.cipherLetters : lA.arabicLetters;
    const cipher = options.swapArabicCipher ? lB.arabicLetters : lB.cipherLetters;

    hybrid.push({
      layer: i + 1,
      arabicLetters: [...(arabic || [])],
      cipherLetters: [...(cipher || [])],
      description: `تقاطع ${systemA.name} × ${systemB.name}`,
    });
  }

  if (options.reverseLayers) {
    hybrid.reverse();
    hybrid.forEach((l, idx) => {
      l.layer = idx + 1;
    });
  }

  return hybrid;
}

/**
 * Creates reversed layer order for a single system
 */
export function createReversedSystemLayers(system: SystemDefinition): LayerInfo[] {
  const reversed = system.layers.map((l) => ({ ...l })).reverse();
  reversed.forEach((l, idx) => {
    l.layer = idx + 1;
  });
  return reversed;
}

/**
 * Evaluates a set of layers (single reversed or cross hybrid) against a target input text
 */
export function analyzeLayersForCrossDecipher(
  layers: LayerInfo[],
  label: string,
  primaryName: string,
  secondaryName: string | undefined,
  nooraniSourceLabel: string | undefined,
  arabicSourceLabel: string | undefined,
  type: 'single_reversed' | 'cross_hybrid' | 'cross_reversed',
  rawInput: string,
  id: string,
  nooraniId?: string,
  arabicId?: string,
  isNooraniReversed?: boolean,
  isArabicReversed?: boolean
): CrossDecipherMatch | null {
  const cleaned = cleanText(rawInput).trim();
  if (!cleaned) return null;

  // 1. Encrypt
  const encDetails = analyzeWord(cleaned, layers);
  const canonicalCipher = encDetails
    .filter((d) => !d.isSpecialOrSpace)
    .map((d) => d.prob1 || '')
    .join('');

  const encCombinations = getAllCombinations(encDetails, 36, true);

  // 2. Decrypt
  const chars = Array.from(cleaned);
  const decItems = chars.map((char) => {
    if (char === ' ' || char === '\n' || char === '\t') {
      return { char, isSpace: true, candidates: [' '] };
    }
    const res = decryptCipherChar(char, layers);
    return {
      char,
      isSpace: false,
      candidates: res.possibleLetters.length > 0 ? res.possibleLetters : [char],
    };
  });
  const decCombinations = getDecryptionCombinations(decItems, 36, true);

  const quranicMatches: {
    word: string;
    meta: QuranicWordMeta;
    isReversed: boolean;
    source: 'plain' | 'enc' | 'dec';
    isShaddah: boolean;
  }[] = [];
  const dictMatches: {
    word: string;
    isReversed: boolean;
    source: 'plain' | 'enc' | 'dec';
    isShaddah: boolean;
  }[] = [];
  const seenMatches = new Set<string>();

  const checkWord = (word: string, source: 'plain' | 'enc' | 'dec') => {
    if (!word) return;
    const isPlain = word === cleaned || source === 'plain';
    const effectiveSource: 'plain' | 'enc' | 'dec' = isPlain ? 'plain' : source;
    const matchKey = `${word}::${effectiveSource}`;
    if (seenMatches.has(matchKey)) return;
    seenMatches.add(matchKey);

    // Normal
    const qMeta = quranicDictionary.getWordDetails(word);
    const isShaddah = Boolean(
      qMeta?.isShaddahVariant ||
      word.includes('\u0651') ||
      (qMeta?.originalQuranicWord && qMeta.originalQuranicWord.includes('\u0651'))
    );

    if (qMeta && qMeta.isExact) {
      quranicMatches.push({ word, meta: qMeta, isReversed: false, source: effectiveSource, isShaddah });
    } else {
      const dictWord = arabicDictionary.getMatchedWord(word);
      if (dictWord) {
        dictMatches.push({ word: dictWord, isReversed: false, source: effectiveSource, isShaddah });
      }
    }

    // Reversed
    const rev = word.split('').reverse().join('');
    if (rev !== word) {
      const revKey = `${rev}::${effectiveSource}`;
      if (!seenMatches.has(revKey)) {
        seenMatches.add(revKey);
        const qMetaRev = quranicDictionary.getWordDetails(rev);
        const isShaddahRev = Boolean(
          qMetaRev?.isShaddahVariant ||
          rev.includes('\u0651') ||
          (qMetaRev?.originalQuranicWord && qMetaRev.originalQuranicWord.includes('\u0651'))
        );
        if (qMetaRev && qMetaRev.isExact) {
          quranicMatches.push({ word: rev, meta: qMetaRev, isReversed: true, source: effectiveSource, isShaddah: isShaddahRev });
        } else {
          const dictWordRev = arabicDictionary.getMatchedWord(rev);
          if (dictWordRev) {
            dictMatches.push({ word: dictWordRev, isReversed: true, source: effectiveSource, isShaddah: isShaddahRev });
          }
        }
      }
    }
  };

  // Check the plain input word itself as well so the user can see if the input itself is a match
  checkWord(cleaned, 'plain');
  for (const w of encCombinations) checkWord(w, 'enc');
  for (const w of decCombinations) checkWord(w, 'dec');

  if (quranicMatches.length === 0 && dictMatches.length === 0) {
    return null;
  }

  // Calculate coherence score
  let score = 0;
  for (const q of quranicMatches) {
    score += q.word.length >= 3 ? 30 : 12;
    if (!q.isReversed) score += 5;
  }
  for (const d of dictMatches) {
    score += d.word.length >= 3 ? 15 : 6;
    if (!d.isReversed) score += 3;
  }

  return {
    id,
    nooraniId,
    arabicId,
    isNooraniReversed,
    isArabicReversed,
    primarySystemName: primaryName,
    secondarySystemName: secondaryName,
    nooraniSourceLabel,
    arabicSourceLabel,
    type,
    label,
    layers,
    quranicMatches,
    dictMatches,
    canonicalCipher,
    coherenceScore: score,
  };
}

