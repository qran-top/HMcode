import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayerInfo,
  DEFAULT_CIPHER_LAYERS,
  ALL_ARABIC_LETTERS_28,
  PRESET_TABLES,
  BENCHMARK_PRESET,
  BENCHMARK_TABLE_NAME,
  INITIAL_OPTIONAL_BROWSER_TABLES,
  ARABIC_PRESETS,
  NOORANI_PRESETS,
  ArabicDistributionPreset,
  NooraniDistributionPreset,
  createNineCipherSlotsFromList,
  EncryptedLetterDetail,
  DecryptedLetterDetail,
  analyzeWord,
  decryptCipherChar,
  normalizeArabicChar,
} from '../cipherData';

const LOCAL_STORAGE_KEY = 'quran_cipher_custom_layers_v2';
const SAVED_TABLES_STORAGE_KEY = 'quran_cipher_saved_tables_v1';
const SAVED_ARABIC_PRESETS_KEY = 'quran_cipher_saved_arabic_presets_v1';
const SAVED_NOORANI_PRESETS_KEY = 'quran_cipher_saved_noorani_presets_v1';

export interface SelectedSlot {
  layerNum: number;
  slotIndex: number;
  char: string;
}

export interface SavedCustomTable {
  id: string;
  name: string;
  description?: string;
  nooraniOrderName?: string;
  arabicOrderName?: string;
  createdAt: number;
  layers: LayerInfo[];
}

export interface SavedArabicPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  arabicLayers: { layer: number; letters: string[] }[];
}

export interface SavedNooraniPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  nooraniLayers: { layer: number; cipherLetters: string[]; description?: string }[];
}

export interface ColumnDuplicateItem {
  char: string;
  layers: number[];
  count: number;
}

export interface ColumnDuplicatesSummary {
  hasDuplicates: boolean;
  arabicDuplicates: ColumnDuplicateItem[];
  cipherDuplicates: ColumnDuplicateItem[];
  totalDuplicatesCount: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  appliedDirectly: boolean;
  needsNaming?: boolean;
  pendingLayers?: LayerInfo[];
  suggestedNooraniName?: string;
  suggestedArabicName?: string;
}

export interface CipherDuplicateCipherLetter {
  char: string;
  layers: number[];
  count: number;
}

export interface CipherLayersContextType {
  layers: LayerInfo[];
  isCustomized: boolean;
  activeTableName: string | null;
  setActiveTableName: (name: string | null) => void;
  selectedSlot: SelectedSlot | null;
  setSelectedSlot: (slot: SelectedSlot | null) => void;
  usedLetters: Set<string>;
  missingLetters: string[];
  duplicateLetters: string[];
  letterCounts: Record<string, number>;
  validCipherLetters: Set<string>;
  cipherLetterCounts: Record<string, number>;
  duplicateCipherLetters: CipherDuplicateCipherLetter[];
  totalFilledSlots: number;
  // Saved tables library
  savedTables: SavedCustomTable[];
  saveCurrentTable: (
    nooraniOrderName: string,
    arabicOrderName: string,
    description?: string
  ) => SavedCustomTable;
  saveCustomLayersTable: (
    nooraniOrderName: string,
    arabicOrderName: string,
    customLayers: LayerInfo[],
    description?: string
  ) => SavedCustomTable;
  loadSavedTable: (id: string) => boolean;
  deleteSavedTable: (id: string) => void;
  deleteAllSavedTables: () => void;
  restoreOptionalPresets: () => void;
  updateSavedTableName: (id: string, name: string) => void;
  updateSavedTable: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      nooraniOrderName?: string;
      arabicOrderName?: string;
      updateWithCurrentLayers?: boolean;
    }
  ) => void;
  exportCurrentTableAsFile: (customNooraniName?: string, customArabicName?: string) => void;
  exportPairAsFile: (nooraniName: string, arabicName: string, customLayers: LayerInfo[], description?: string) => void;
  exportCurrentTableAsTextFile: (customName?: string) => void;
  exportSingleSavedTableAsFile: (tableId: string) => void;
  exportSingleSavedTableAsTextFile: (tableId: string) => void;
  exportAllSavedTablesAsFile: () => void;
  importTablesFromJson: (jsonOrTextStr: string) => ImportResult;
  serializeCurrentTableToText: () => string;
  applyTableFromText: (text: string) => ImportResult;
  // Arabic distributions
  savedArabicPresets: SavedArabicPreset[];
  activeArabicPresetName: string | null;
  saveCurrentArabicPreset: (name: string, description?: string) => SavedArabicPreset;
  applyArabicDistribution: (presetOrId: ArabicDistributionPreset | SavedArabicPreset | string) => void;
  deleteSavedArabicPreset: (id: string) => void;
  updateSavedArabicPresetName: (id: string, name: string) => void;
  // Noorani distributions
  savedNooraniPresets: SavedNooraniPreset[];
  activeNooraniPresetName: string | null;
  saveCurrentNooraniPreset: (name: string, description?: string) => SavedNooraniPreset;
  applyNooraniDistribution: (presetOrId: NooraniDistributionPreset | SavedNooraniPreset | string) => void;
  deleteSavedNooraniPreset: (id: string) => void;
  updateSavedNooraniPresetName: (id: string, name: string) => void;
  // Row duplicates removal
  removeRowDuplicates: () => { arabicRemoved: number; cipherRemoved: number; totalRemoved: number };
  // Column duplicates summary
  columnDuplicatesSummary: ColumnDuplicatesSummary;
  // Layer & Grid Expandability
  addLayer: (layerNum?: number, description?: string, position?: 'top' | 'bottom') => void;
  deleteLayer: (layerNum: number) => boolean;
  moveLayer: (layerNum: number, direction: 'up' | 'down') => void;
  addArabicSlotToLayer: (layerNum: number, initialChar?: string) => void;
  removeArabicSlotFromLayer: (layerNum: number, slotIndex: number) => void;
  addArabicColumnToAllLayers: () => void;
  removeArabicColumnFromAllLayers: () => void;
  addCipherSlotToLayer: (layerNum: number, initialChar?: string) => void;
  removeCipherSlotFromLayer: (layerNum: number, slotIndex: number) => void;
  updateLayerNumber: (oldNum: number, newNum: number) => void;
  updateLayerDescription: (layerNum: number, description: string) => void;
  reverseAllLayersArabicLetters: () => void;
  reverseAllLayersCipherLetters: () => void;
  // Mutations
  swapSlots: (layerA: number, indexA: number, layerB: number, indexB: number) => void;
  setLetterAtSlot: (layerNum: number, slotIndex: number, char: string) => void;
  clearLetterAtSlot: (layerNum: number, slotIndex: number) => void;
  clearAllSlots: () => void;
  clearSkyLetters: () => void;
  clearEarthLetters: () => void;
  setCipherLettersForLayer: (layerNum: number, cipherKeysOr1: string[] | string, cipher2?: string) => void;
  setCipherLetterAtSlot: (layerNum: number, cipherSlotIndex: number, char: string) => void;
  resetToDefault: () => void;
  applyPreset: (presetId: keyof typeof PRESET_TABLES) => void;
  updateAllLayers: (newLayers: LayerInfo[], tableName?: string) => void;
  bulkFillArabicLetters: (
    rawLetters: string[],
    orderMode?: 'table_order' | 'layer_asc' | 'layer_desc',
    clearRemaining?: boolean,
    resizeConfig?: { rows: number; cols: number }
  ) => { filledCount: number; totalSlots: number; message: string };
  bulkFillCipherLetters: (
    rawLetters: string[],
    orderMode?: 'table_order' | 'layer_asc' | 'layer_desc',
    clearRemaining?: boolean,
    resizeConfig?: { rows: number; cols: number }
  ) => { filledCount: number; totalSlots: number; message: string };
  importLayersJson: (jsonStr: string) => boolean;
  exportLayersJson: () => string;
  // Execution helpers wired to active layers
  analyzeText: (text: string) => EncryptedLetterDetail[];
  decryptChar: (char: string) => DecryptedLetterDetail;
}

const CipherLayersContext = createContext<CipherLayersContextType | null>(null);

export function normalizeLayers(candidate: LayerInfo[]): LayerInfo[] {
  return candidate.map((l, index) => {
    const rawCiphers = Array.isArray(l.cipherLetters) ? l.cipherLetters : [];
    const flatChars: string[] = [];
    rawCiphers.forEach((c) => {
      const trimmed = String(c || '').trim();
      if (trimmed) {
        const singleLetters = trimmed.replace(/[^ء-ي]/g, '').split('');
        if (singleLetters.length > 0) {
          flatChars.push(...singleLetters);
        } else {
          flatChars.push(trimmed);
        }
      }
    });
    const rawArabic = Array.isArray(l.arabicLetters) ? l.arabicLetters : [];
    const targetArabicLen = Math.max(4, rawArabic.length);
    return {
      layer: typeof l.layer === 'number' ? l.layer : index + 1,
      cipherLetters: flatChars.length > 0 ? flatChars : [''],
      arabicLetters: Array.from({ length: targetArabicLen }, (_, i) =>
        rawArabic[i] != null ? String(rawArabic[i]) : ''
      ),
      description: l.description || `الطبقة ${l.layer || index + 1}`,
    };
  });
}

function loadInitialLayers(): LayerInfo[] {
  try {
    const v5BenchmarkKey = localStorage.getItem('quran_cipher_preset_v5_eastern_ascending_baseline_set');
    if (!v5BenchmarkKey) {
      // Seed to Eastern Ascending standard default
      localStorage.setItem('quran_cipher_preset_v5_eastern_ascending_baseline_set', 'true');
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CIPHER_LAYERS));
      return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeLayers(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load saved cipher layers from localStorage:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
}

function normalizeForDuplicateCheck(str: string): string {
  return (str || '')
    .replace(/[\u064B-\u0652\u0670]/g, '') // remove arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\d+/g, '') // remove numbers
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '') // remove non-alphanumeric/non-arabic chars
    .toLowerCase();
}

function loadInitialSavedTables(): SavedCustomTable[] {
  try {
    const saved = localStorage.getItem(SAVED_TABLES_STORAGE_KEY);

    const builtInNormalizedSet = new Set(
      Object.values(PRESET_TABLES).map((p) => normalizeForDuplicateCheck(p.name))
    );

    // Helper to filter out legacy preset tables & built-in presets
    const isDeletedOrBuiltInPreset = (name: string) => {
      const norm = normalizeForDuplicateCheck(name);
      if (!norm) return true;
      if (builtInNormalizedSet.has(norm)) return true;

      for (const bNorm of builtInNormalizedSet) {
        if (bNorm.length >= 3 && (norm.includes(bNorm) || bNorm.includes(norm))) {
          return true;
        }
      }

      return (
        norm.includes('ذكرعسق') ||
        norm.includes('المشرح') ||
        norm.includes('ذكرللعالمين') ||
        norm.includes('طسمترتيب') ||
        norm.includes('تعجب') ||
        norm.includes('الترتيبالهجائي') ||
        norm.includes('الفتح') ||
        norm.includes('توزيع')
      );
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((t: SavedCustomTable) => {
          if (isDeletedOrBuiltInPreset(t.name)) return false;
          // Must have explicit dual names (nooraniOrderName & arabicOrderName)
          if (!t.nooraniOrderName?.trim() || !t.arabicOrderName?.trim()) return false;
          return true;
        });
        // Save cleaned back to localStorage to purge single-named legacy items permanently
        localStorage.setItem(SAVED_TABLES_STORAGE_KEY, JSON.stringify(cleaned));
        return cleaned.map((t) => ({
          ...t,
          layers: normalizeLayers(t.layers || []),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load saved tables library from localStorage:', e);
  }
  return [];
}

function loadInitialArabicPresets(): SavedArabicPreset[] {
  try {
    const saved = localStorage.getItem(SAVED_ARABIC_PRESETS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved arabic presets from localStorage:', e);
  }
  return [];
}

function loadInitialNooraniPresets(): SavedNooraniPreset[] {
  try {
    const saved = localStorage.getItem(SAVED_NOORANI_PRESETS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved noorani presets from localStorage:', e);
  }
  return [];
}

function triggerJsonDownload(filename: string, data: unknown) {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download error:', err);
  }
}

function triggerTextDownload(filename: string, text: string) {
  try {
    // UTF-8 BOM (\uFEFF) ensures Windows Notepad & mobile editors open Arabic cleanly without scrambling
    const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Text download error:', err);
  }
}

/**
 * Pure Arabic line-by-line format:
 * Each field is on its own separate line to completely eliminate BiDi / RTL mixed-language editing issues.
 */
export function serializeLayersToText(tableName: string, layers: LayerInfo[]): string {
  const sorted = layers.slice().sort((a, b) => b.layer - a.layer);
  const lines: string[] = [];
  lines.push(`المنظومة: ${tableName}`);
  lines.push('');
  for (const l of sorted) {
    const cipherStr = (l.cipherLetters || []).map((c) => (c || '').trim()).filter(Boolean).join(' ');
    const arabicStr = (l.arabicLetters || []).map((a) => (a || '').trim()).filter(Boolean).join(' ');
    lines.push(`[الطبقة ${l.layer}]`);
    lines.push(`الشيفرة: ${cipherStr}`);
    lines.push(`العربي: ${arabicStr}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * Resilient parser for the pure Arabic line-by-line format
 */
export function parseLayersFromText(text: string): { name: string; layers: LayerInfo[] } | null {
  if (!text || typeof text !== 'string') return null;
  const rawLines = text.split(/\r?\n/);

  let tableName = 'منظومة مستوردة';
  const layerMap = new Map<number, { cipher: string[]; arabic: string[] }>();
  let currentLayerNum: number | null = null;
  let expectingType: 'cipher' | 'arabic' | null = null;
  let hasValidLayers = false;

  for (let rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check table name
    const nameMatch = line.match(/^(?:المنظومة|منظومة|الاسم|اسم|name)\s*[:=]\s*(.*)$/i);
    if (nameMatch && nameMatch[1].trim()) {
      tableName = nameMatch[1].trim();
      continue;
    }

    // Check layer header: [الطبقة 7] or الطبقة 7 or layer 7 or [7] or just 7
    const layerMatch = line.match(/^(?:\[\s*)?(?:الطبقة|طبقة|layer)?\s*([1-7])(?:\s*\])?$/i);
    if (layerMatch) {
      currentLayerNum = parseInt(layerMatch[1], 10);
      hasValidLayers = true;
      expectingType = 'cipher';
      if (!layerMap.has(currentLayerNum)) {
        layerMap.set(currentLayerNum, { cipher: [], arabic: [] });
      }
      continue;
    }

    // Check explicit cipher line: الشيفرة: ...
    const cipherMatch = line.match(/^(?:الشيفرة|الشفره|شيفرة|شفرة|تشفير|cipher|نورانية)\s*[:=]\s*(.*)$/i);
    if (cipherMatch) {
      hasValidLayers = true;
      const content = cipherMatch[1].trim();
      const tokens = content ? (content.includes(' ') || content.includes(',') ? content.split(/[\s,]+/) : content.split('')) : [];
      const validTokens = tokens.filter(Boolean);
      if (currentLayerNum === null) currentLayerNum = 7;
      if (!layerMap.has(currentLayerNum)) layerMap.set(currentLayerNum, { cipher: [], arabic: [] });
      layerMap.get(currentLayerNum)!.cipher = validTokens;
      expectingType = 'arabic';
      continue;
    }

    // Check explicit arabic line: العربي: ...
    const arabicMatch = line.match(/^(?:العربي|عربي|الأحرف|الاحرف|حروف|arabic|letters)\s*[:=]\s*(.*)$/i);
    if (arabicMatch) {
      hasValidLayers = true;
      const content = arabicMatch[1].trim();
      const tokens = content ? (content.includes(' ') || content.includes(',') ? content.split(/[\s,]+/) : content.split('')) : [];
      const validTokens = tokens.filter(Boolean);
      if (currentLayerNum === null) currentLayerNum = 7;
      if (!layerMap.has(currentLayerNum)) layerMap.set(currentLayerNum, { cipher: [], arabic: [] });
      layerMap.get(currentLayerNum)!.arabic = validTokens;
      expectingType = null;
      continue;
    }

    // Implicit content line if directly below layer header
    if (currentLayerNum !== null && expectingType) {
      const tokens = line.includes(' ') || line.includes(',') ? line.split(/[\s,]+/) : line.split('');
      const validTokens = tokens.filter(Boolean);
      if (expectingType === 'cipher') {
        layerMap.get(currentLayerNum)!.cipher = validTokens;
        expectingType = 'arabic';
      } else if (expectingType === 'arabic') {
        layerMap.get(currentLayerNum)!.arabic = validTokens;
        expectingType = null;
      }
    }
  }

  if (!hasValidLayers && layerMap.size === 0) return null;

  // Build standard 7 layers
  const allLayerNums = [7, 6, 5, 4, 3, 2, 1];
  const resultLayers: LayerInfo[] = [];

  for (const num of allLayerNums) {
    const data = layerMap.get(num) || { cipher: [], arabic: [] };
    const cipherSlots = Array.from(
      { length: Math.max(9, data.cipher.length) },
      (_, i) => (data.cipher[i] || '').trim()
    );
    const arabicSlots = Array.from(
      { length: Math.max(4, data.arabic.length) },
      (_, i) => (data.arabic[i] || '').trim()
    );
    resultLayers.push({
      layer: num,
      cipherLetters: cipherSlots,
      arabicLetters: arabicSlots,
      description: `الطبقة ${num}`,
    });
  }

  return {
    name: tableName,
    layers: normalizeLayers(resultLayers),
  };
}

function validateLayersStructure(candidate: unknown): candidate is LayerInfo[] {
  if (!Array.isArray(candidate) || candidate.length === 0) return false;
  return candidate.every(
    (l) =>
      typeof l === 'object' &&
      l !== null &&
      typeof l.layer === 'number' &&
      Array.isArray(l.cipherLetters) &&
      Array.isArray(l.arabicLetters)
  );
}

export const CipherLayersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layers, setLayers] = useState<LayerInfo[]>(loadInitialLayers);
  const [savedTables, setSavedTables] = useState<SavedCustomTable[]>(loadInitialSavedTables);
  const [savedArabicPresets, setSavedArabicPresets] = useState<SavedArabicPreset[]>(loadInitialArabicPresets);
  const [savedNooraniPresets, setSavedNooraniPresets] = useState<SavedNooraniPreset[]>(loadInitialNooraniPresets);
  const [activeTableName, setActiveTableName] = useState<string | null>(BENCHMARK_TABLE_NAME);
  const [activeArabicPresetName, setActiveArabicPresetName] = useState<string | null>(null);
  const [activeNooraniPresetName, setActiveNooraniPresetName] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  // Persist current layers to localStorage whenever layers change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layers));
    } catch (e) {
      console.error('Failed to persist cipher layers to localStorage:', e);
    }
  }, [layers]);

  // Persist saved tables library whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_TABLES_STORAGE_KEY, JSON.stringify(savedTables));
    } catch (e) {
      console.error('Failed to persist saved tables library to localStorage:', e);
    }
  }, [savedTables]);

  // Persist saved Arabic presets library
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_ARABIC_PRESETS_KEY, JSON.stringify(savedArabicPresets));
    } catch (e) {
      console.error('Failed to persist saved arabic presets to localStorage:', e);
    }
  }, [savedArabicPresets]);

  // Persist saved Noorani presets library
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_NOORANI_PRESETS_KEY, JSON.stringify(savedNooraniPresets));
    } catch (e) {
      console.error('Failed to persist saved noorani presets to localStorage:', e);
    }
  }, [savedNooraniPresets]);

  // Check if customized compared to default
  const isCustomized = useMemo(() => {
    return JSON.stringify(layers) !== JSON.stringify(DEFAULT_CIPHER_LAYERS);
  }, [layers]);

  // Analyze letter distribution
  const {
    usedLetters,
    missingLetters,
    duplicateLetters,
    letterCounts,
    totalFilledSlots,
    validCipherLetters,
    cipherLetterCounts,
    duplicateCipherLetters,
  } = useMemo(() => {
    const counts: Record<string, number> = {};
    const used = new Set<string>();
    const validCiphers = new Set<string>();
    const cCounts: Record<string, number> = {};
    const cipherToLayers: Record<string, number[]> = {};
    let filled = 0;

    layers.forEach((l) => {
      // Cipher keys - support all 9 slots & duplicates
      (l.cipherLetters || []).forEach((raw) => {
        const c = (raw || '').trim();
        if (c) {
          validCiphers.add(c);
          cCounts[c] = (cCounts[c] || 0) + 1;
          cipherToLayers[c] = cipherToLayers[c] || [];
          if (!cipherToLayers[c].includes(l.layer)) {
            cipherToLayers[c].push(l.layer);
          }
        }
      });

      // Arabic letters
      l.arabicLetters.forEach((char) => {
        if (char && char.trim()) {
          const norm = normalizeArabicChar(char);
          counts[norm] = (counts[norm] || 0) + 1;
          used.add(norm);
          filled++;
        }
      });
    });

    const duplicates: string[] = [];
    Object.entries(counts).forEach(([char, count]) => {
      if (count > 1) {
        duplicates.push(char);
      }
    });

    const dupCiphers: CipherDuplicateCipherLetter[] = Object.entries(cCounts)
      .filter(([_, count]) => count > 1)
      .map(([char, count]) => ({
        char,
        layers: cipherToLayers[char] || [],
        count,
      }));

    const missing = ALL_ARABIC_LETTERS_28.filter((c) => !used.has(normalizeArabicChar(c)));

    return {
      usedLetters: used,
      missingLetters: missing,
      duplicateLetters: duplicates,
      letterCounts: counts,
      totalFilledSlots: filled,
      validCipherLetters: validCiphers,
      cipherLetterCounts: cCounts,
      duplicateCipherLetters: dupCiphers,
    };
  }, [layers]);

  // Swap two slots anywhere across layers
  const swapSlots = useCallback(
    (layerA: number, indexA: number, layerB: number, indexB: number) => {
      setLayers((prevLayers) => {
        const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
        const lA = next.find((l) => l.layer === layerA);
        const lB = next.find((l) => l.layer === layerB);
        if (!lA || !lB) return prevLayers;

        const charA = lA.arabicLetters[indexA] || '';
        const charB = lB.arabicLetters[indexB] || '';

        lA.arabicLetters[indexA] = charB;
        lB.arabicLetters[indexB] = charA;

        return next;
      });
      setSelectedSlot(null);
    },
    []
  );

  // Set letter at a specific slot
  const setLetterAtSlot = useCallback((layerNum: number, slotIndex: number, char: string) => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const targetLayer = next.find((l) => l.layer === layerNum);
      if (!targetLayer) return prevLayers;

      // If this char already exists in another slot and user placed it here, remove it from the old slot to avoid duplicate
      if (char.trim()) {
        const norm = normalizeArabicChar(char);
        next.forEach((l) => {
          l.arabicLetters.forEach((c, idx) => {
            if (normalizeArabicChar(c) === norm && (l.layer !== layerNum || idx !== slotIndex)) {
              l.arabicLetters[idx] = '';
            }
          });
        });
      }

      targetLayer.arabicLetters[slotIndex] = char.trim();
      return next;
    });
    setSelectedSlot(null);
  }, []);

  // Clear a specific slot
  const clearLetterAtSlot = useCallback((layerNum: number, slotIndex: number) => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const targetLayer = next.find((l) => l.layer === layerNum);
      if (targetLayer) {
        targetLayer.arabicLetters[slotIndex] = '';
      }
      return next;
    });
    setSelectedSlot(null);
  }, []);

  // Clear all Arabic (Earth) slots
  const clearEarthLetters = useCallback(() => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        const len = (l.arabicLetters || []).length || 4;
        l.arabicLetters = Array(len).fill('');
      });
      return next;
    });
    setSelectedSlot(null);
  }, []);

  // Clear all Cipher (Sky) slots
  const clearSkyLetters = useCallback(() => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        const len = (l.cipherLetters || []).length || 2;
        l.cipherLetters = Array(len).fill('');
      });
      return next;
    });
    setSelectedSlot(null);
  }, []);

  // Clear all slots (legacy compatibility)
  const clearAllSlots = useCallback(() => {
    clearEarthLetters();
  }, [clearEarthLetters]);

  // Add a new layer (can be added at top or bottom)
  const addLayer = useCallback((layerNum?: number, description?: string, position: 'top' | 'bottom' = 'bottom') => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const existingNums = next.map((l) => l.layer);
      let newNum = layerNum;
      if (newNum === undefined || existingNums.includes(newNum)) {
        newNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
      }
      const maxArabicLen = Math.max(4, ...next.map((l) => (l.arabicLetters || []).length));
      const newLayer: LayerInfo = {
        layer: newNum,
        cipherLetters: Array(9).fill(''),
        arabicLetters: Array(maxArabicLen).fill(''),
        description: description?.trim() || `الطبقة ${newNum}`,
      };
      return position === 'top' ? [newLayer, ...next] : [...next, newLayer];
    });
  }, []);

  // Delete a layer (must keep at least one layer)
  const deleteLayer = useCallback((layerNum: number): boolean => {
    let deleted = false;
    setLayers((prevLayers) => {
      if (prevLayers.length <= 1) return prevLayers;
      deleted = true;
      return prevLayers.filter((l) => l.layer !== layerNum);
    });
    setSelectedSlot((curr) => (curr?.layerNum === layerNum ? null : curr));
    return deleted;
  }, []);

  // Move layer up or down in visual sequence
  const moveLayer = useCallback((layerNum: number, direction: 'up' | 'down') => {
    setLayers((prevLayers) => {
      const idx = prevLayers.findIndex((l) => l.layer === layerNum);
      if (idx === -1) return prevLayers;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prevLayers.length) return prevLayers;
      const next = [...prevLayers];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  }, []);

  // Add an Arabic letter slot to a specific layer
  const addArabicSlotToLayer = useCallback((layerNum: number, initialChar = '') => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === layerNum);
      if (target) {
        if (!Array.isArray(target.arabicLetters)) target.arabicLetters = [];
        target.arabicLetters.push(initialChar.trim());
      }
      return next;
    });
  }, []);

  // Remove an Arabic letter slot from a specific layer
  const removeArabicSlotFromLayer = useCallback((layerNum: number, slotIndex: number) => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === layerNum);
      if (target && Array.isArray(target.arabicLetters)) {
        if (target.arabicLetters.length > 1) {
          target.arabicLetters.splice(slotIndex, 1);
        } else {
          target.arabicLetters[0] = '';
        }
      }
      return next;
    });
    setSelectedSlot((curr) => (curr?.layerNum === layerNum && curr.slotIndex === slotIndex ? null : curr));
  }, []);

  // Add an Arabic letter column to all layers across the table
  const addArabicColumnToAllLayers = useCallback(() => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        if (!Array.isArray(l.arabicLetters)) l.arabicLetters = [];
        l.arabicLetters.push('');
      });
      return next;
    });
  }, []);

  // Remove the last Arabic column from all layers
  const removeArabicColumnFromAllLayers = useCallback(() => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const maxLen = Math.max(...next.map((l) => (l.arabicLetters || []).length));
      if (maxLen <= 1) return prevLayers;
      next.forEach((l) => {
        if (Array.isArray(l.arabicLetters) && l.arabicLetters.length > 0) {
          l.arabicLetters.pop();
        }
      });
      return next;
    });
  }, []);

  // Add a cipher letter slot to a layer
  const addCipherSlotToLayer = useCallback((layerNum: number, initialChar = '') => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === layerNum);
      if (target) {
        if (!Array.isArray(target.cipherLetters)) target.cipherLetters = [];
        target.cipherLetters.push(initialChar.trim());
      }
      return next;
    });
  }, []);

  // Remove a cipher letter slot from a layer
  const removeCipherSlotFromLayer = useCallback((layerNum: number, slotIndex: number) => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === layerNum);
      if (target && Array.isArray(target.cipherLetters)) {
        if (target.cipherLetters.length > 1) {
          target.cipherLetters.splice(slotIndex, 1);
        } else {
          target.cipherLetters[0] = '';
        }
      }
      return next;
    });
  }, []);

  // Update layer number
  const updateLayerNumber = useCallback((oldNum: number, newNum: number) => {
    if (oldNum === newNum || isNaN(newNum)) return;
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === oldNum);
      if (target) {
        target.layer = newNum;
      }
      return next;
    });
  }, []);

  // Update layer description
  const updateLayerDescription = useCallback((layerNum: number, description: string) => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      const target = next.find((l) => l.layer === layerNum);
      if (target) {
        target.description = description.trim();
      }
      return next;
    });
  }, []);

  // Reverse Arabic letters vertically across layers (Layer 1 swaps with Layer N, etc.)
  const reverseAllLayersArabicLetters = useCallback(() => {
    setLayers((prevLayers) => {
      const allArabic = prevLayers.map((l) => (Array.isArray(l.arabicLetters) ? [...l.arabicLetters] : []));
      const reversedVertical = [...allArabic].reverse();
      return prevLayers.map((l, idx) => ({
        ...l,
        arabicLetters: reversedVertical[idx] || [],
      }));
    });
  }, []);

  // Reverse cipher letters vertically across layers (Layer 1 swaps with Layer N, etc.)
  const reverseAllLayersCipherLetters = useCallback(() => {
    setLayers((prevLayers) => {
      const allCiphers = prevLayers.map((l) => (Array.isArray(l.cipherLetters) ? [...l.cipherLetters] : []));
      const reversedVertical = [...allCiphers].reverse();
      return prevLayers.map((l, idx) => ({
        ...l,
        cipherLetters: reversedVertical[idx] || [],
      }));
    });
  }, []);

  // Set cipher letters for a layer (supports array of slots or individual strings)
  const setCipherLettersForLayer = useCallback(
    (layerNum: number, cipherKeysOr1: string[] | string, cipher2?: string) => {
      setLayers((prevLayers) => {
        const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
        const target = next.find((l) => l.layer === layerNum);
        if (target) {
          if (Array.isArray(cipherKeysOr1)) {
            const flatChars: string[] = [];
            cipherKeysOr1.forEach((c) => {
              const trimmed = String(c || '').trim();
              if (trimmed) {
                const single = trimmed.replace(/[^ء-ي]/g, '').split('');
                if (single.length > 0) flatChars.push(...single);
                else flatChars.push(trimmed);
              }
            });
            const targetLen = Math.max(9, flatChars.length);
            target.cipherLetters = Array.from({ length: targetLen }, (_, i) => (flatChars[i] || '').trim());
          } else {
            const current = Array.isArray(target.cipherLetters) ? [...target.cipherLetters] : Array(9).fill('');
            current[0] = (cipherKeysOr1 || '').trim();
            if (cipher2 !== undefined) current[1] = cipher2.trim();
            const targetLen = Math.max(9, current.length);
            target.cipherLetters = Array.from({ length: targetLen }, (_, i) => (current[i] || '').trim());
          }
        }
        return next;
      });
    },
    []
  );

  // Set single cipher letter at specific slot (0..8)
  const setCipherLetterAtSlot = useCallback(
    (layerNum: number, cipherSlotIndex: number, char: string) => {
      setLayers((prevLayers) => {
        const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
        const target = next.find((l) => l.layer === layerNum);
        if (target) {
          if (!Array.isArray(target.cipherLetters)) {
            target.cipherLetters = Array(9).fill('');
          }
          while (target.cipherLetters.length < 9) {
            target.cipherLetters.push('');
          }
          target.cipherLetters[cipherSlotIndex] = (char || '').trim();
        }
        return next;
      });
    },
    []
  );

  // Reset to default
  const resetToDefault = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
    setLayers(defaults);
    setActiveTableName(BENCHMARK_TABLE_NAME);
    setSelectedSlot(null);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Apply Preset
  const applyPreset = useCallback((presetId: keyof typeof PRESET_TABLES) => {
    const preset = PRESET_TABLES[presetId];
    if (preset) {
      setLayers(preset.createLayers());
      setActiveTableName(preset.name);
      setActiveArabicPresetName(null);
      setActiveNooraniPresetName(null);
      setSelectedSlot(null);
    }
  }, []);

  const updateAllLayers = useCallback((newLayers: LayerInfo[], tableName?: string) => {
    setLayers(newLayers);
    if (tableName) {
      setActiveTableName(tableName);
    }
    setSelectedSlot(null);
  }, []);

  // Bulk fill Arabic letters into table slots in order
  const bulkFillArabicLetters = useCallback(
    (
      rawLetters: string[],
      orderMode: 'table_order' | 'layer_asc' | 'layer_desc' = 'table_order',
      clearRemaining = true,
      resizeConfig?: { rows: number; cols: number }
    ) => {
      let filledCount = 0;
      let totalSlots = 0;

      setLayers((prevLayers) => {
        let next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];

        if (resizeConfig) {
          // Adjust rows (number of layers)
          if (next.length > resizeConfig.rows) {
            next = next.slice(0, resizeConfig.rows);
          } else if (next.length < resizeConfig.rows) {
            const existingNums = next.map((l) => l.layer);
            const currentMax = existingNums.length > 0 ? Math.max(...existingNums) : 0;
            const toAdd = resizeConfig.rows - next.length;
            for (let i = 0; i < toAdd; i++) {
              const newNum = currentMax + i + 1;
              next.push({
                layer: newNum,
                description: `الطبقة ${newNum}`,
                arabicLetters: [],
                cipherLetters: [],
              });
            }
          }
          
          // Adjust columns for arabicLetters
          next.forEach(l => {
             l.arabicLetters = Array.from({ length: resizeConfig.cols }, (_, i) => (l.arabicLetters && l.arabicLetters[i]) || '');
             if (!l.cipherLetters) l.cipherLetters = [];
          });
        }

        const orderedIndices: number[] = next.map((_, i) => i);

        if (orderMode === 'layer_asc') {
          orderedIndices.sort((a, b) => next[a].layer - next[b].layer);
        } else if (orderMode === 'layer_desc') {
          orderedIndices.sort((a, b) => next[b].layer - next[a].layer);
        }

        totalSlots = orderedIndices.reduce((acc, idx) => acc + (next[idx].arabicLetters?.length || 0), 0);
        let letterIdx = 0;

        orderedIndices.forEach((layerIdx) => {
          const l = next[layerIdx];
          if (!Array.isArray(l.arabicLetters)) {
            l.arabicLetters = [];
          }
          for (let s = 0; s < l.arabicLetters.length; s++) {
            if (letterIdx < rawLetters.length) {
              l.arabicLetters[s] = rawLetters[letterIdx];
              letterIdx++;
            } else if (clearRemaining) {
              l.arabicLetters[s] = '';
            }
          }
        });

        filledCount = Math.min(letterIdx, rawLetters.length);
        return next;
      });

      setActiveArabicPresetName(null);
      setSelectedSlot(null);

      return {
        filledCount: Math.min(rawLetters.length, totalSlots || rawLetters.length),
        totalSlots,
        message: `تم توزيع الحروف بنجاح عبر طبقات الجدول.`,
      };
    },
    []
  );

  // Bulk fill Cipher letters into table slots in order
  const bulkFillCipherLetters = useCallback(
    (
      rawLetters: string[],
      orderMode: 'table_order' | 'layer_asc' | 'layer_desc' = 'table_order',
      clearRemaining = true,
      resizeConfig?: { rows: number; cols: number }
    ) => {
      let filledCount = 0;
      let totalSlots = 0;

      setLayers((prevLayers) => {
        let next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];

        if (resizeConfig) {
          // Adjust rows (number of layers)
          if (next.length > resizeConfig.rows) {
            next = next.slice(0, resizeConfig.rows);
          } else if (next.length < resizeConfig.rows) {
            const existingNums = next.map((l) => l.layer);
            const currentMax = existingNums.length > 0 ? Math.max(...existingNums) : 0;
            const toAdd = resizeConfig.rows - next.length;
            for (let i = 0; i < toAdd; i++) {
              const newNum = currentMax + i + 1;
              next.push({
                layer: newNum,
                description: `الطبقة ${newNum}`,
                arabicLetters: [],
                cipherLetters: [],
              });
            }
          }
          
          // Adjust columns for cipherLetters
          next.forEach(l => {
             l.cipherLetters = Array.from({ length: resizeConfig.cols }, (_, i) => (l.cipherLetters && l.cipherLetters[i]) || '');
             if (!l.arabicLetters) l.arabicLetters = [];
          });
        }

        const orderedIndices: number[] = next.map((_, i) => i);

        if (orderMode === 'layer_asc') {
          orderedIndices.sort((a, b) => next[a].layer - next[b].layer);
        } else if (orderMode === 'layer_desc') {
          orderedIndices.sort((a, b) => next[b].layer - next[a].layer);
        }

        totalSlots = orderedIndices.reduce((acc, idx) => acc + (next[idx].cipherLetters?.length || 0), 0);
        let letterIdx = 0;

        orderedIndices.forEach((layerIdx) => {
          const l = next[layerIdx];
          if (!Array.isArray(l.cipherLetters)) {
            l.cipherLetters = [];
          }
          for (let s = 0; s < l.cipherLetters.length; s++) {
            if (letterIdx < rawLetters.length) {
              l.cipherLetters[s] = rawLetters[letterIdx];
              letterIdx++;
            } else if (clearRemaining) {
              l.cipherLetters[s] = '';
            }
          }
        });

        filledCount = Math.min(letterIdx, rawLetters.length);
        return next;
      });

      setActiveNooraniPresetName(null);
      setSelectedSlot(null);

      return {
        filledCount: Math.min(rawLetters.length, totalSlots || rawLetters.length),
        totalSlots,
        message: `تم توزيع أحرف التشفير بنجاح عبر طبقات الجدول.`,
      };
    },
    []
  );

  // Save current table into user's personal saved library using two explicit order names
  const saveCurrentTable = useCallback(
    (
      nooraniOrderName: string,
      arabicOrderName: string,
      description?: string
    ): SavedCustomTable => {
      const cleanNoorani = nooraniOrderName.trim() || 'سماء مخصصة';
      const cleanArabic = arabicOrderName.trim() || 'أرض مخصصة';
      const cleanName = `سماء: ${cleanNoorani} × أرض: ${cleanArabic}`;
      const newTable: SavedCustomTable = {
        id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        description: description?.trim() || '',
        nooraniOrderName: cleanNoorani,
        arabicOrderName: cleanArabic,
        createdAt: Date.now(),
        layers: JSON.parse(JSON.stringify(layers)),
      };

      setSavedTables((prev) => [newTable, ...prev]);
      setActiveTableName(cleanName);
      return newTable;
    },
    [layers]
  );

  // Save custom layers into library
  const saveCustomLayersTable = useCallback(
    (
      nooraniOrderName: string,
      arabicOrderName: string,
      customLayers: LayerInfo[],
      description?: string
    ): SavedCustomTable => {
      const cleanNoorani = nooraniOrderName.trim() || 'سماء مخصصة';
      const cleanArabic = arabicOrderName.trim() || 'أرض مخصصة';
      const cleanName = `سماء: ${cleanNoorani} × أرض: ${cleanArabic}`;
      const newTable: SavedCustomTable = {
        id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        description: description?.trim() || '',
        nooraniOrderName: cleanNoorani,
        arabicOrderName: cleanArabic,
        createdAt: Date.now(),
        layers: JSON.parse(JSON.stringify(customLayers)),
      };

      setSavedTables((prev) => [newTable, ...prev]);
      setLayers(JSON.parse(JSON.stringify(customLayers)));
      setActiveTableName(cleanName);
      setSelectedSlot(null);
      return newTable;
    },
    []
  );

  // Load a saved table from library
  const loadSavedTable = useCallback(
    (id: string): boolean => {
      const target = savedTables.find((t) => t.id === id);
      if (target && validateLayersStructure(target.layers)) {
        setLayers(JSON.parse(JSON.stringify(target.layers)));
        setActiveTableName(target.name);
        setSelectedSlot(null);
        return true;
      }
      return false;
    },
    [savedTables]
  );

  // Delete a saved table from library
  const deleteSavedTable = useCallback((id: string) => {
    setSavedTables((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(SAVED_TABLES_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  // Delete all saved tables from browser library
  const deleteAllSavedTables = useCallback(() => {
    setSavedTables([]);
    try {
      localStorage.removeItem(SAVED_TABLES_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Restore initial optional presets into browser library
  const restoreOptionalPresets = useCallback(() => {
    const restored: SavedCustomTable[] = INITIAL_OPTIONAL_BROWSER_TABLES.map((t) => ({
      id: `tbl_${Date.now()}_${t.id}`,
      name: t.name,
      description: t.description,
      createdAt: Date.now(),
      layers: normalizeLayers(t.layers),
    }));

    setSavedTables((prev) => {
      const existingNames = new Set(prev.map((t) => t.name));
      const toAdd = restored.filter((r) => !existingNames.has(r.name));
      return [...prev, ...toAdd];
    });
  }, []);

  // Rename a saved table
  const updateSavedTableName = useCallback((id: string, name: string) => {
    setSavedTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t))
    );
  }, []);

  // Update saved table (nooraniOrderName, arabicOrderName, description, or update content with current layers)
  const updateSavedTable = useCallback(
    (
      id: string,
      updates: {
        nooraniOrderName?: string;
        arabicOrderName?: string;
        description?: string;
        updateWithCurrentLayers?: boolean;
      }
    ) => {
      setSavedTables((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const newNoorani = updates.nooraniOrderName !== undefined ? updates.nooraniOrderName.trim() : (t.nooraniOrderName || '');
          const newArabic = updates.arabicOrderName !== undefined ? updates.arabicOrderName.trim() : (t.arabicOrderName || '');
          const newName = `سماء: ${newNoorani} × أرض: ${newArabic}`;
          return {
            ...t,
            name: newName,
            nooraniOrderName: newNoorani,
            arabicOrderName: newArabic,
            description: updates.description !== undefined ? updates.description.trim() : t.description,
            layers: updates.updateWithCurrentLayers ? JSON.parse(JSON.stringify(layers)) : t.layers,
          };
        })
      );
    },
    [layers]
  );

  // Remove duplicates within the same row (Arabic or Cipher letters)
  const removeRowDuplicates = useCallback(() => {
    let arabicRemoved = 0;
    let cipherRemoved = 0;

    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        // 1. Arabic letters in this layer:
        const seenArabic = new Set<string>();
        const arabicLen = Math.max(4, (l.arabicLetters || []).length);
        const newArabic: string[] = Array(arabicLen).fill('');
        (l.arabicLetters || []).forEach((ch, idx) => {
          const raw = (ch || '').trim();
          if (!raw) return;
          const norm = normalizeArabicChar(raw);
          if (seenArabic.has(norm)) {
            arabicRemoved++;
          } else {
            seenArabic.add(norm);
            newArabic[idx] = raw;
          }
        });
        l.arabicLetters = newArabic;

        // 2. Cipher letters in this layer:
        const seenCipher = new Set<string>();
        const cipherLen = Math.max(9, (l.cipherLetters || []).length);
        const newCipher = Array(cipherLen).fill('');
        (l.cipherLetters || []).forEach((raw, idx) => {
          const c = (raw || '').trim();
          if (!c) return;
          if (seenCipher.has(c)) {
            cipherRemoved++;
          } else {
            seenCipher.add(c);
            newCipher[idx] = c;
          }
        });
        l.cipherLetters = newCipher;
      });
      return next;
    });

    return { arabicRemoved, cipherRemoved, totalRemoved: arabicRemoved + cipherRemoved };
  }, []);

  // Column duplicates summary (cross-layer duplicate check for Arabic and Cipher letters)
  const columnDuplicatesSummary: ColumnDuplicatesSummary = useMemo(() => {
    const arabicLayerMap: Record<string, number[]> = {};
    const cipherLayerMap: Record<string, number[]> = {};

    layers.forEach((l) => {
      const layerArabic = new Set<string>();
      (l.arabicLetters || []).forEach((char) => {
        const norm = normalizeArabicChar(char || '');
        if (norm) layerArabic.add(norm);
      });
      layerArabic.forEach((norm) => {
        arabicLayerMap[norm] = arabicLayerMap[norm] || [];
        arabicLayerMap[norm].push(l.layer);
      });

      const layerCipher = new Set<string>();
      (l.cipherLetters || []).forEach((raw) => {
        const c = (raw || '').trim();
        if (c) layerCipher.add(c);
      });
      layerCipher.forEach((c) => {
        cipherLayerMap[c] = cipherLayerMap[c] || [];
        cipherLayerMap[c].push(l.layer);
      });
    });

    const arabicDups: ColumnDuplicateItem[] = Object.entries(arabicLayerMap)
      .filter(([_, list]) => list.length > 1)
      .map(([char, list]) => ({
        char,
        layers: list.sort((a, b) => b - a),
        count: list.length,
      }));

    const cipherDups: ColumnDuplicateItem[] = Object.entries(cipherLayerMap)
      .filter(([_, list]) => list.length > 1)
      .map(([char, list]) => ({
        char,
        layers: list.sort((a, b) => b - a),
        count: list.length,
      }));

    return {
      hasDuplicates: arabicDups.length > 0 || cipherDups.length > 0,
      arabicDuplicates: arabicDups,
      cipherDuplicates: cipherDups,
      totalDuplicatesCount: arabicDups.length + cipherDups.length,
    };
  }, [layers]);

  // Arabic distributions handlers
  const applyArabicDistribution = useCallback(
    (presetOrId: ArabicDistributionPreset | SavedArabicPreset | string) => {
      let targetLettersMap: Record<number, [string, string, string, string]> | null = null;
      let presetName = '';

      if (typeof presetOrId === 'string') {
        const cleanInput = presetOrId.trim();
        const numIndex = parseInt(cleanInput, 10);

        if (ARABIC_PRESETS[cleanInput]) {
          const p = ARABIC_PRESETS[cleanInput];
          presetName = p.name;
          targetLettersMap = {};
          p.arabicLayers.forEach((al) => {
            targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
          });
        } else if (!isNaN(numIndex) && String(numIndex) === cleanInput) {
          // Numeric index matching (1-based index among presets)
          const allStandardPresets = Object.values(ARABIC_PRESETS);
          if (numIndex >= 1 && numIndex <= allStandardPresets.length) {
            const p = allStandardPresets[numIndex - 1];
            presetName = p.name;
            targetLettersMap = {};
            p.arabicLayers.forEach((al) => {
              targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
            });
          } else {
            // Check saved presets
            const savedIdx = numIndex - allStandardPresets.length - 1;
            if (savedIdx >= 0 && savedIdx < savedArabicPresets.length) {
              const sp = savedArabicPresets[savedIdx];
              presetName = sp.name;
              targetLettersMap = {};
              sp.arabicLayers.forEach((al) => {
                targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
              });
            }
          }
        } else {
          const sp = savedArabicPresets.find(
            (s) => s.id === cleanInput || `saved_arabic_${s.id}` === cleanInput || s.name === cleanInput
          );
          if (sp) {
            presetName = sp.name;
            targetLettersMap = {};
            sp.arabicLayers.forEach((al) => {
              targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
            });
          } else {
            // Check in savedTables
            const customMatch = savedTables.find((st) => `custom_table_arabic_${st.id}` === cleanInput || st.arabicOrderName === cleanInput);
            if (customMatch && customMatch.arabicOrderName) {
              presetName = customMatch.arabicOrderName;
              targetLettersMap = {};
              customMatch.layers.forEach((l) => {
                targetLettersMap![l.layer] = [...(l.arabicLetters || ['', '', '', ''])] as [string, string, string, string];
              });
            } else {
              // Check if raw Arabic letters sequence was passed (e.g. 28 letters or hyphenated)
              const rawChars = cleanInput.replace(/[^ء-ي]/g, '').split('');
              if (rawChars.length >= 14) {
                targetLettersMap = {};
                for (let layerNum = 7; layerNum >= 1; layerNum--) {
                  const start = (7 - layerNum) * 4;
                  const slice = rawChars.slice(start, start + 4);
                  while (slice.length < 4) slice.push('');
                  targetLettersMap[layerNum] = slice as [string, string, string, string];
                }
                presetName = `أرض مخصصة (${rawChars.slice(0, 2).join('')}..${rawChars.slice(-2).join('')})`;
              }
            }
          }
        }
      } else if ('arabicLayers' in presetOrId) {
        presetName = presetOrId.name;
        targetLettersMap = {};
        presetOrId.arabicLayers.forEach((al) => {
          targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
        });
      }

      if (targetLettersMap) {
        setLayers((prevLayers) => {
          const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
          next.forEach((l) => {
            if (targetLettersMap![l.layer]) {
              l.arabicLetters = [...targetLettersMap![l.layer]];
            }
          });
          return next;
        });
        setActiveArabicPresetName(presetName);
        setSelectedSlot(null);
      }
    },
    [savedArabicPresets, savedTables]
  );

  const saveCurrentArabicPreset = useCallback(
    (name: string, description?: string): SavedArabicPreset => {
      const cleanName = name.trim() || `توزيعة أحرف عربية ${new Date().toLocaleDateString('ar-EG')}`;
      const newPreset: SavedArabicPreset = {
        id: `ar_pre_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        description: description?.trim() || '',
        createdAt: Date.now(),
        arabicLayers: layers.map((l) => ({
          layer: l.layer,
          letters: (l.arabicLetters || []).map((ch) => ch || ''),
        })),
      };
      setSavedArabicPresets((prev) => [newPreset, ...prev]);
      setActiveArabicPresetName(cleanName);
      return newPreset;
    },
    [layers]
  );

  const deleteSavedArabicPreset = useCallback((id: string) => {
  
    setSavedArabicPresets((prev) => prev.filter((p) => p.id !== id));
  
  }, []);
  const updateSavedArabicPresetName = useCallback((id: string, name: string) => {
    setSavedArabicPresets((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  // Noorani distributions handlers
  const applyNooraniDistribution = useCallback(
    (presetOrId: NooraniDistributionPreset | SavedNooraniPreset | string) => {
      let targetCipherMap: Record<number, { ciphers: string[]; description?: string }> | null = null;
      let presetName = '';

      if (typeof presetOrId === 'string') {
        const cleanInput = presetOrId.trim();
        const numIndex = parseInt(cleanInput, 10);

        if (NOORANI_PRESETS[cleanInput]) {
          const p = NOORANI_PRESETS[cleanInput];
          presetName = p.name;
          targetCipherMap = {};
          p.nooraniLayers.forEach((nl) => {
            targetCipherMap![nl.layer] = {
              ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
              description: nl.description,
            };
          });
        } else if (!isNaN(numIndex) && String(numIndex) === cleanInput) {
          // Numeric index matching (1-based index among presets)
          const allStandardPresets = Object.values(NOORANI_PRESETS);
          if (numIndex >= 1 && numIndex <= allStandardPresets.length) {
            const p = allStandardPresets[numIndex - 1];
            presetName = p.name;
            targetCipherMap = {};
            p.nooraniLayers.forEach((nl) => {
              targetCipherMap![nl.layer] = {
                ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
                description: nl.description,
              };
            });
          } else {
            // Check saved presets
            const savedIdx = numIndex - allStandardPresets.length - 1;
            if (savedIdx >= 0 && savedIdx < savedNooraniPresets.length) {
              const sn = savedNooraniPresets[savedIdx];
              presetName = sn.name;
              targetCipherMap = {};
              sn.nooraniLayers.forEach((nl) => {
                targetCipherMap![nl.layer] = {
                  ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
                  description: nl.description,
                };
              });
            }
          }
        } else {
          const sn = savedNooraniPresets.find(
            (s) => s.id === cleanInput || `saved_noorani_${s.id}` === cleanInput || s.name === cleanInput
          );
          if (sn) {
            presetName = sn.name;
            targetCipherMap = {};
            sn.nooraniLayers.forEach((nl) => {
              targetCipherMap![nl.layer] = {
                ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
                description: nl.description,
              };
            });
          } else {
            // Check in savedTables
            const customMatch = savedTables.find((st) => `custom_table_noorani_${st.id}` === cleanInput || st.nooraniOrderName === cleanInput);
            if (customMatch && customMatch.nooraniOrderName) {
              presetName = customMatch.nooraniOrderName;
              targetCipherMap = {};
              customMatch.layers.forEach((l) => {
                targetCipherMap![l.layer] = {
                  ciphers: createNineCipherSlotsFromList(l.cipherLetters || []),
                  description: l.description,
                };
              });
            } else {
              // Check if hyphenated or raw Arabic sequence was passed
              if (cleanInput.includes('-') || cleanInput.replace(/[^ء-ي]/g, '').length >= 7) {
                let parts: string[][] = [];
                if (cleanInput.includes('-')) {
                  parts = cleanInput.split('-').map((p) => p.replace(/[^ء-ي]/g, '').split(''));
                } else {
                  const rawChars = cleanInput.replace(/[^ء-ي]/g, '').split('');
                  const perLayer = rawChars.length >= 28 ? 4 : 2;
                  for (let i = 0; i < 7; i++) {
                    parts.push(rawChars.slice(i * perLayer, (i + 1) * perLayer));
                  }
                }
                targetCipherMap = {};
                for (let layerNum = 7; layerNum >= 1; layerNum--) {
                  const layerIdx = 7 - layerNum;
                  const ciphers = parts[layerIdx] || [];
                  targetCipherMap[layerNum] = {
                    ciphers: createNineCipherSlotsFromList(ciphers),
                    description: `سماء ${layerNum}: ${ciphers.join(' ')}`,
                  };
                }
                presetName = `سماء مخصصة`;
              }
            }
          }
        }
      } else if ('nooraniLayers' in presetOrId) {
        presetName = presetOrId.name;
        targetCipherMap = {};
        presetOrId.nooraniLayers.forEach((nl) => {
          targetCipherMap![nl.layer] = {
            ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
            description: nl.description,
          };
        });
      }

      if (targetCipherMap) {
        setLayers((prevLayers) => {
          const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
          next.forEach((l) => {
            if (targetCipherMap![l.layer]) {
              l.cipherLetters = [...targetCipherMap![l.layer].ciphers];
              if (targetCipherMap![l.layer].description) {
                l.description = targetCipherMap![l.layer].description!;
              }
            }
          });
          return next;
        });
        setActiveNooraniPresetName(presetName);
        setSelectedSlot(null);
      }
    },
    [savedNooraniPresets, savedTables]
  );

  const saveCurrentNooraniPreset = useCallback(
    (name: string, description?: string): SavedNooraniPreset => {
      const cleanName = name.trim() || `توزيعة أحرف الشيفرة ${new Date().toLocaleDateString('ar-EG')}`;
      const newPreset: SavedNooraniPreset = {
        id: `noor_pre_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        description: description?.trim() || '',
        createdAt: Date.now(),
        nooraniLayers: layers.map((l) => ({
          layer: l.layer,
          cipherLetters: [...l.cipherLetters],
          description: l.description,
        })),
      };
      setSavedNooraniPresets((prev) => [newPreset, ...prev]);
      setActiveNooraniPresetName(cleanName);
      return newPreset;
    },
    [layers]
  );

  const deleteSavedNooraniPreset = useCallback((id: string) => {
  
    setSavedNooraniPresets((prev) => prev.filter((p) => p.id !== id));
  
  }, []);
  const updateSavedNooraniPresetName = useCallback((id: string, name: string) => {
    setSavedNooraniPresets((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  // Export current table with minimal parameters for easy manual editing
  const exportCurrentTableAsFile = useCallback(
    (customNooraniName?: string, customArabicName?: string) => {
      const parts = (activeTableName || '').split(' × ');
      const fallbackNoorani = parts[0]?.replace('سماء: ', '').trim() || 'سماء مخصصة';
      const fallbackArabic = parts[1]?.replace('أرض: ', '').trim() || 'أرض مخصصة';

      const nooraniName = customNooraniName || fallbackNoorani;
      const arabicName = customArabicName || fallbackArabic;
      const fullName = `سماء: ${nooraniName} × أرض: ${arabicName}`;

      const fileData = {
        version: "2.0",
        nooraniOrderName: nooraniName,
        arabicOrderName: arabicName,
        name: fullName,
        layers: layers
          .slice()
          .sort((a, b) => b.layer - a.layer)
          .map((l) => ({
            layer: l.layer,
            cipher: (l.cipherLetters || []).map((c) => (c || '').trim()).filter(Boolean).join(' '),
            arabic: (l.arabicLetters || []).map((a) => (a || '').trim()).filter(Boolean).join(' '),
          })),
      };

      const safeFileName = `منظومة_سماء_${nooraniName}_أرض_${arabicName}`.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerJsonDownload(`${safeFileName}.json`, fileData);
    },
    [activeTableName, layers]
  );

  // Export specific Heaven + Earth pair as JSON file
  const exportPairAsFile = useCallback(
    (nooraniName: string, arabicName: string, customLayers: LayerInfo[], description?: string) => {
      const cleanNoorani = nooraniName.trim() || 'سماء مخصصة';
      const cleanArabic = arabicName.trim() || 'أرض مخصصة';
      const fullName = `سماء: ${cleanNoorani} × أرض: ${cleanArabic}`;

      const fileData = {
        version: "2.0",
        nooraniOrderName: cleanNoorani,
        arabicOrderName: cleanArabic,
        name: fullName,
        description: description || '',
        layers: customLayers
          .slice()
          .sort((a, b) => b.layer - a.layer)
          .map((l) => ({
            layer: l.layer,
            cipher: (l.cipherLetters || []).map((c) => (c || '').trim()).filter(Boolean).join(' '),
            arabic: (l.arabicLetters || []).map((a) => (a || '').trim()).filter(Boolean).join(' '),
          })),
      };

      const safeFileName = `منظومة_سماء_${cleanNoorani}_أرض_${cleanArabic}`.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerJsonDownload(`${safeFileName}.json`, fileData);
    },
    []
  );

  // Export a single saved table from library in minimal format
  const exportSingleSavedTableAsFile = useCallback(
    (tableId: string) => {
      const target = savedTables.find((t) => t.id === tableId);
      if (!target) return;
      const fileData = {
        name: target.name,
        layers: (target.layers || [])
          .slice()
          .sort((a, b) => b.layer - a.layer)
          .map((l) => ({
            layer: l.layer,
            cipher: (l.cipherLetters || []).map((c) => (c || '').trim()).filter(Boolean).join(' '),
            arabic: (l.arabicLetters || []).map((a) => (a || '').trim()).filter(Boolean).join(' '),
          })),
      };
      const safeFileName = target.name.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerJsonDownload(`${safeFileName}.json`, fileData);
    },
    [savedTables]
  );

  // Export all saved tables as a minimal backup
  const exportAllSavedTablesAsFile = useCallback(() => {
    const fileData = {
      backupDate: new Date().toISOString().slice(0, 10),
      tables: savedTables.map((t) => ({
        name: t.name,
        layers: (t.layers || [])
          .slice()
          .sort((a, b) => b.layer - a.layer)
          .map((l) => ({
            layer: l.layer,
            cipher: (l.cipherLetters || []).map((c) => (c || '').trim()).filter(Boolean).join(' '),
            arabic: (l.arabicLetters || []).map((a) => (a || '').trim()).filter(Boolean).join(' '),
          })),
      })),
    };
    triggerJsonDownload(
      `نسخة_احتياطية_للمنظومات_${new Date().toISOString().slice(0, 10)}.json`,
      fileData
    );
  }, [savedTables]);

  // Export current table as pure Arabic text file (each line on its own)
  const exportCurrentTableAsTextFile = useCallback(
    (customName?: string) => {
      const targetName = customName || activeTableName || BENCHMARK_TABLE_NAME;
      const textContent = serializeLayersToText(targetName, layers);
      const safeFileName = targetName.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerTextDownload(`${safeFileName}.txt`, textContent);
    },
    [activeTableName, layers]
  );

  // Export a single saved table from library as pure Arabic text file
  const exportSingleSavedTableAsTextFile = useCallback(
    (tableId: string) => {
      const target = savedTables.find((t) => t.id === tableId);
      if (!target) return;
      const textContent = serializeLayersToText(target.name, target.layers);
      const safeFileName = target.name.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerTextDownload(`${safeFileName}.txt`, textContent);
    },
    [savedTables]
  );

  // Serialize current table to pure Arabic text for inline editor
  const serializeCurrentTableToText = useCallback(() => {
    return serializeLayersToText(activeTableName || BENCHMARK_TABLE_NAME, layers);
  }, [activeTableName, layers]);

  // Apply table directly from pure Arabic text (used by inline text editor)
  const applyTableFromText = useCallback((text: string): ImportResult => {
    const parsed = parseLayersFromText(text);
    if (!parsed || parsed.layers.length === 0) {
      return {
        success: false,
        message: 'تعذر استخراج المنظومة من النص. تأكد من كتابة أرقام الطبقات والشيفرة والأحرف.',
        importedCount: 0,
        appliedDirectly: false,
      };
    }

    setLayers(parsed.layers);
    setActiveTableName(parsed.name);
    setSelectedSlot(null);

    const newSaved: SavedCustomTable = {
      id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: parsed.name,
      description: 'تم تحريرها عبر المحرر النصي المباشر',
      createdAt: Date.now(),
      layers: parsed.layers,
    };
    setSavedTables((prev) => [newSaved, ...prev.filter((t) => t.name !== parsed.name)]);

    return {
      success: true,
      message: `تم تطبيق المنظومة [${parsed.name}] بنجاح وحفظها في مكتبة المتصفح.`,
      importedCount: 1,
      appliedDirectly: true,
    };
  }, []);

  // Import file with resilient parser (supports pure Arabic .txt line-by-line, minimal JSON, legacy formats, backups)
  const importTablesFromJson = useCallback((jsonOrTextStr: string): ImportResult => {
    // 1. Try parsing as pure Arabic line-by-line text first
    const textParsed = parseLayersFromText(jsonOrTextStr);
    if (textParsed && textParsed.layers.length > 0) {
      setLayers(textParsed.layers);
      setActiveTableName(textParsed.name);
      setSelectedSlot(null);

      const newSaved: SavedCustomTable = {
        id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: textParsed.name,
        description: 'منظومة مستوردة من ملف نصي',
        createdAt: Date.now(),
        layers: textParsed.layers,
      };
      setSavedTables((prev) => [newSaved, ...prev.filter((t) => t.name !== textParsed.name)]);

      return {
        success: true,
        message: `تم استيراد المنظومة النصية [${textParsed.name}] بنجاح وحفظها في مكتبتك.`,
        importedCount: 1,
        appliedDirectly: true,
      };
    }

    // 2. Fall back to JSON parsing
    try {
      const parsed = JSON.parse(jsonOrTextStr);

      const parseLayerItem = (item: any, defaultLayer: number): LayerInfo => {
        const layerNum = typeof item?.layer === 'number' ? item.layer : defaultLayer;

        // Parse cipher: space/comma separated or array or single string
        let rawCipher: string[] = [];
        if (typeof item?.cipher === 'string') {
          const trimmed = item.cipher.trim();
          if (trimmed.includes(' ') || trimmed.includes(',')) {
            rawCipher = trimmed.split(/[\s,]+/).filter(Boolean);
          } else {
            rawCipher = trimmed.split('').filter((c: string) => !/\s/.test(c));
          }
        } else if (Array.isArray(item?.cipher)) {
          rawCipher = item.cipher.map(String).filter((s: string) => s.trim());
        } else if (Array.isArray(item?.cipherLetters)) {
          rawCipher = item.cipherLetters.map(String).filter((s: string) => s.trim());
        }

        // Parse arabic: space/comma separated or array or single string
        let rawArabic: string[] = [];
        if (typeof item?.arabic === 'string') {
          const trimmed = item.arabic.trim();
          if (trimmed.includes(' ') || trimmed.includes(',')) {
            rawArabic = trimmed.split(/[\s,]+/).filter(Boolean);
          } else {
            rawArabic = trimmed.split('').filter((c: string) => !/\s/.test(c));
          }
        } else if (Array.isArray(item?.arabic)) {
          rawArabic = item.arabic.map(String).filter((s: string) => s.trim());
        } else if (Array.isArray(item?.arabicLetters)) {
          rawArabic = item.arabicLetters.map(String).filter((s: string) => s.trim());
        }

        const cipherSlots = Array.from(
          { length: Math.max(9, rawCipher.length) },
          (_, i) => (rawCipher[i] || '').trim()
        );
        const arabicSlots = Array.from(
          { length: Math.max(4, rawArabic.length) },
          (_, i) => (rawArabic[i] || '').trim()
        );

        return {
          layer: layerNum,
          cipherLetters: cipherSlots,
          arabicLetters: arabicSlots,
          description: item?.description || `الطبقة ${layerNum}`,
        };
      };

      // Case 1: Single table minimal format { name, layers } or { fullMap } or array of layers
      const rawLayers = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.layers)
        ? parsed.layers
        : Array.isArray(parsed?.fullMap?.layers)
        ? parsed.fullMap.layers
        : null;

      if (rawLayers && rawLayers.length > 0) {
        const parsedLayers = normalizeLayers(
          rawLayers.map((l: any, idx: number) => parseLayerItem(l, 7 - idx))
        );

        const extractedNoorani = (parsed?.nooraniOrderName || parsed?.nooraniName || '').trim();
        const extractedArabic = (parsed?.arabicOrderName || parsed?.arabicName || '').trim();

        if (!extractedNoorani || !extractedArabic) {
          return {
            success: true,
            needsNaming: true,
            pendingLayers: parsedLayers,
            suggestedNooraniName: extractedNoorani,
            suggestedArabicName: extractedArabic,
            message: 'تتطلب المنظومة المستوردة إدخال اسم جدول السماء واسم جدول الأرض.',
            importedCount: 1,
            appliedDirectly: false,
          };
        }

        saveCustomLayersTable(extractedNoorani, extractedArabic, parsedLayers, parsed?.description);

        return {
          success: true,
          message: `تم استيراد المنظومة المتقاطعة [سماء: ${extractedNoorani} × أرض: ${extractedArabic}] وتطبيقها بنجاح وحفظها في مكتبتك.`,
          importedCount: 1,
          appliedDirectly: true,
        };
      }

      // Case 2: Multi-table backup format { tables: [...] }
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tables) && parsed.tables.length > 0) {
        const validTables: SavedCustomTable[] = [];
        parsed.tables.forEach((item: any, idx: number) => {
          const itemLayers = Array.isArray(item?.layers) ? item.layers : null;
          if (itemLayers) {
            const parsedL = normalizeLayers(
              itemLayers.map((l: any, lIdx: number) => parseLayerItem(l, 7 - lIdx))
            );
            validTables.push({
              id: item.id || `tbl_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              name: item.name?.trim() || `منظومة مستوردة ${idx + 1}`,
              description: item.description || '',
              createdAt: item.createdAt || Date.now(),
              layers: parsedL,
            });
          }
        });

        if (validTables.length > 0) {
          setSavedTables((prev) => {
            const existingNames = new Set(prev.map((t) => t.name));
            const newOnes = validTables.filter((vt) => !existingNames.has(vt.name));
            return [...newOnes, ...prev];
          });
          const first = validTables[0];
          setLayers(first.layers);
          setActiveTableName(first.name);
          setSelectedSlot(null);

          return {
            success: true,
            message: `تم استيراد ${validTables.length} منظومة وحفظها في مكتبتك، وتطبيق [${first.name}] مباشرة.`,
            importedCount: validTables.length,
            appliedDirectly: true,
          };
        }
      }

      return {
        success: false,
        message: 'الملف لا يحتوي على بنية طبقات صالحة. يرجى التأكد من اختيار ملف منظومة صالح.',
        importedCount: 0,
        appliedDirectly: false,
      };
    } catch (err) {
      console.error('Failed to import JSON file:', err);
      return {
        success: false,
        message: 'حدث خطأ أثناء قراءة ملف الـ JSON. قد يكون الملف تالفاً أو غير منسق بشكل سليم.',
        importedCount: 0,
        appliedDirectly: false,
      };
    }
  }, []);

  // Raw Import JSON (compatibility helper)
  const importLayersJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (validateLayersStructure(parsed)) {
        setLayers(parsed);
        setSelectedSlot(null);
        return true;
      }
    } catch (e) {
      console.error('Failed to import JSON layers:', e);
    }
    return false;
  }, []);

  // Export JSON
  const exportLayersJson = useCallback((): string => {
    return JSON.stringify(layers, null, 2);
  }, [layers]);

  // Bound analysis and decrypt helpers
  const analyzeText = useCallback(
    (text: string) => {
      return analyzeWord(text, layers);
    },
    [layers]
  );

  const decryptChar = useCallback(
    (char: string) => {
      return decryptCipherChar(char, layers);
    },
    [layers]
  );

  const value = useMemo(
    () => ({
      layers,
      isCustomized,
      activeTableName,
      setActiveTableName,
      selectedSlot,
      setSelectedSlot,
      usedLetters,
      missingLetters,
      duplicateLetters,
      letterCounts,
      validCipherLetters,
      cipherLetterCounts,
      duplicateCipherLetters,
      totalFilledSlots,
      savedTables,
      saveCurrentTable,
      saveCustomLayersTable,
      loadSavedTable,
      deleteSavedTable,
      deleteAllSavedTables,
      restoreOptionalPresets,
      updateSavedTableName,
      updateSavedTable,
      exportCurrentTableAsFile,
      exportPairAsFile,
      exportCurrentTableAsTextFile,
      exportSingleSavedTableAsFile,
      exportSingleSavedTableAsTextFile,
      exportAllSavedTablesAsFile,
      importTablesFromJson,
      serializeCurrentTableToText,
      applyTableFromText,
      savedArabicPresets,
      activeArabicPresetName,
      saveCurrentArabicPreset,
      applyArabicDistribution,
      deleteSavedArabicPreset,
      updateSavedArabicPresetName,
      savedNooraniPresets,
      activeNooraniPresetName,
      saveCurrentNooraniPreset,
      applyNooraniDistribution,
      deleteSavedNooraniPreset,
      updateSavedNooraniPresetName,
      removeRowDuplicates,
      columnDuplicatesSummary,
      addLayer,
      deleteLayer,
      moveLayer,
      addArabicSlotToLayer,
      removeArabicSlotFromLayer,
      addArabicColumnToAllLayers,
      removeArabicColumnFromAllLayers,
      addCipherSlotToLayer,
      removeCipherSlotFromLayer,
      updateLayerNumber,
      updateLayerDescription,
      reverseAllLayersArabicLetters,
      reverseAllLayersCipherLetters,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      clearSkyLetters,
      clearEarthLetters,
      setCipherLettersForLayer,
      setCipherLetterAtSlot,
      resetToDefault,
      applyPreset,
      bulkFillArabicLetters,
      bulkFillCipherLetters,
      importLayersJson,
      exportLayersJson,
      analyzeText,
      decryptChar,
      updateAllLayers,
    }),
    [
      layers,
      isCustomized,
      activeTableName,
      selectedSlot,
      usedLetters,
      missingLetters,
      duplicateLetters,
      letterCounts,
      validCipherLetters,
      cipherLetterCounts,
      duplicateCipherLetters,
      totalFilledSlots,
      savedTables,
      saveCurrentTable,
      saveCustomLayersTable,
      loadSavedTable,
      deleteSavedTable,
      deleteAllSavedTables,
      restoreOptionalPresets,
      updateSavedTableName,
      updateSavedTable,
      exportCurrentTableAsFile,
      exportPairAsFile,
      exportCurrentTableAsTextFile,
      exportSingleSavedTableAsFile,
      exportSingleSavedTableAsTextFile,
      exportAllSavedTablesAsFile,
      importTablesFromJson,
      serializeCurrentTableToText,
      applyTableFromText,
      savedArabicPresets,
      activeArabicPresetName,
      saveCurrentArabicPreset,
      applyArabicDistribution,
      deleteSavedArabicPreset,
      updateSavedArabicPresetName,
      savedNooraniPresets,
      activeNooraniPresetName,
      saveCurrentNooraniPreset,
      applyNooraniDistribution,
      deleteSavedNooraniPreset,
      updateSavedNooraniPresetName,
      removeRowDuplicates,
      columnDuplicatesSummary,
      addLayer,
      deleteLayer,
      moveLayer,
      addArabicSlotToLayer,
      removeArabicSlotFromLayer,
      addArabicColumnToAllLayers,
      removeArabicColumnFromAllLayers,
      addCipherSlotToLayer,
      removeCipherSlotFromLayer,
      updateLayerNumber,
      updateLayerDescription,
      reverseAllLayersArabicLetters,
      reverseAllLayersCipherLetters,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      clearSkyLetters,
      clearEarthLetters,
      setCipherLettersForLayer,
      setCipherLetterAtSlot,
      resetToDefault,
      applyPreset,
      bulkFillArabicLetters,
      bulkFillCipherLetters,
      importLayersJson,
      exportLayersJson,
      analyzeText,
      decryptChar,
      updateAllLayers,
    ]
  );

  return <CipherLayersContext.Provider value={value}>{children}</CipherLayersContext.Provider>;
};

export function useCipherLayers(): CipherLayersContextType {
  const context = useContext(CipherLayersContext);
  if (!context) {
    throw new Error('useCipherLayers must be used within a CipherLayersProvider');
  }
  return context;
}
