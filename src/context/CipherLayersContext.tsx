import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayerInfo,
  DEFAULT_CIPHER_LAYERS,
  ALL_ARABIC_LETTERS_28,
  PRESET_TABLES,
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
  createdAt: number;
  layers: LayerInfo[];
}

export interface SavedArabicPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  arabicLayers: { layer: number; letters: [string, string, string, string] }[];
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
  saveCurrentTable: (name: string, description?: string) => SavedCustomTable;
  loadSavedTable: (id: string) => boolean;
  deleteSavedTable: (id: string) => void;
  updateSavedTableName: (id: string, name: string) => void;
  exportCurrentTableAsFile: (customName?: string) => void;
  exportSingleSavedTableAsFile: (tableId: string) => void;
  exportAllSavedTablesAsFile: () => void;
  importTablesFromJson: (jsonStr: string) => ImportResult;
  // Arabic distributions
  savedArabicPresets: SavedArabicPreset[];
  activeArabicPresetName: string | null;
  saveCurrentArabicPreset: (name: string, description?: string) => SavedArabicPreset;
  applyArabicDistribution: (presetOrId: ArabicDistributionPreset | SavedArabicPreset | string) => void;
  deleteSavedArabicPreset: (id: string) => void;
  // Noorani distributions
  savedNooraniPresets: SavedNooraniPreset[];
  activeNooraniPresetName: string | null;
  saveCurrentNooraniPreset: (name: string, description?: string) => SavedNooraniPreset;
  applyNooraniDistribution: (presetOrId: NooraniDistributionPreset | SavedNooraniPreset | string) => void;
  deleteSavedNooraniPreset: (id: string) => void;
  // Row duplicates removal
  removeRowDuplicates: () => { arabicRemoved: number; cipherRemoved: number; totalRemoved: number };
  // Column duplicates summary
  columnDuplicatesSummary: ColumnDuplicatesSummary;
  // Mutations
  swapSlots: (layerA: number, indexA: number, layerB: number, indexB: number) => void;
  setLetterAtSlot: (layerNum: number, slotIndex: number, char: string) => void;
  clearLetterAtSlot: (layerNum: number, slotIndex: number) => void;
  clearAllSlots: () => void;
  setCipherLettersForLayer: (layerNum: number, cipherKeysOr1: string[] | string, cipher2?: string) => void;
  setCipherLetterAtSlot: (layerNum: number, cipherSlotIndex: number, char: string) => void;
  resetToDefault: () => void;
  applyPreset: (presetId: keyof typeof PRESET_TABLES) => void;
  importLayersJson: (jsonStr: string) => boolean;
  exportLayersJson: () => string;
  // Execution helpers wired to active layers
  analyzeText: (text: string) => EncryptedLetterDetail[];
  decryptChar: (char: string) => DecryptedLetterDetail;
}

const CipherLayersContext = createContext<CipherLayersContextType | null>(null);

export function normalizeLayers(candidate: LayerInfo[]): LayerInfo[] {
  return candidate.map((l) => {
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
    const targetLen = Math.max(9, flatChars.length);
    return {
      layer: l.layer,
      cipherLetters: Array.from({ length: targetLen }, (_, i) => (flatChars[i] != null ? flatChars[i] : '')),
      arabicLetters: Array.from({ length: 4 }, (_, i) =>
        Array.isArray(l.arabicLetters) && l.arabicLetters[i] != null ? String(l.arabicLetters[i]) : ''
      ) as [string, string, string, string],
      description: l.description || `الطبقة ${l.layer}`,
    };
  });
}

function loadInitialLayers(): LayerInfo[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return normalizeLayers(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load saved cipher layers from localStorage:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
}

function loadInitialSavedTables(): SavedCustomTable[] {
  try {
    const saved = localStorage.getItem(SAVED_TABLES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => ({
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

function validateLayersStructure(candidate: unknown): candidate is LayerInfo[] {
  if (!Array.isArray(candidate) || candidate.length !== 7) return false;
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
  const [activeTableName, setActiveTableName] = useState<string | null>(null);
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

  // Clear all 28 slots
  const clearAllSlots = useCallback(() => {
    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        l.arabicLetters = ['', '', '', ''];
      });
      return next;
    });
    setSelectedSlot(null);
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
    setActiveTableName(null);
    setSelectedSlot(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
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
      setSelectedSlot(null);
    }
  }, []);

  // Save current table into user's personal saved library
  const saveCurrentTable = useCallback(
    (name: string, description?: string): SavedCustomTable => {
      const cleanName = name.trim() || `جدول طبقات ${new Date().toLocaleDateString('ar-EG')}`;
      const newTable: SavedCustomTable = {
        id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        description: description?.trim() || '',
        createdAt: Date.now(),
        layers: JSON.parse(JSON.stringify(layers)),
      };

      setSavedTables((prev) => [newTable, ...prev]);
      setActiveTableName(cleanName);
      return newTable;
    },
    [layers]
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
    setSavedTables((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Rename a saved table
  const updateSavedTableName = useCallback((id: string, name: string) => {
    setSavedTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t))
    );
  }, []);

  // Remove duplicates within the same row (Arabic or Cipher letters)
  const removeRowDuplicates = useCallback(() => {
    let arabicRemoved = 0;
    let cipherRemoved = 0;

    setLayers((prevLayers) => {
      const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
      next.forEach((l) => {
        // 1. Arabic letters in this layer:
        const seenArabic = new Set<string>();
        const newArabic: [string, string, string, string] = ['', '', '', ''];
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
        if (ARABIC_PRESETS[presetOrId]) {
          const p = ARABIC_PRESETS[presetOrId];
          presetName = p.name;
          targetLettersMap = {};
          p.arabicLayers.forEach((al) => {
            targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
          });
        } else {
          const sp = savedArabicPresets.find((s) => s.id === presetOrId);
          if (sp) {
            presetName = sp.name;
            targetLettersMap = {};
            sp.arabicLayers.forEach((al) => {
              targetLettersMap![al.layer] = [...al.letters] as [string, string, string, string];
            });
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
    [savedArabicPresets]
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
          letters: [
            l.arabicLetters[0] || '',
            l.arabicLetters[1] || '',
            l.arabicLetters[2] || '',
            l.arabicLetters[3] || '',
          ] as [string, string, string, string],
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

  // Noorani distributions handlers
  const applyNooraniDistribution = useCallback(
    (presetOrId: NooraniDistributionPreset | SavedNooraniPreset | string) => {
      let targetCipherMap: Record<number, { ciphers: string[]; description?: string }> | null = null;
      let presetName = '';

      if (typeof presetOrId === 'string') {
        if (NOORANI_PRESETS[presetOrId]) {
          const p = NOORANI_PRESETS[presetOrId];
          presetName = p.name;
          targetCipherMap = {};
          p.nooraniLayers.forEach((nl) => {
            targetCipherMap![nl.layer] = {
              ciphers: createNineCipherSlotsFromList(nl.cipherLetters),
              description: nl.description,
            };
          });
        } else {
          const sn = savedNooraniPresets.find((s) => s.id === presetOrId);
          if (sn) {
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
    [savedNooraniPresets]
  );

  const saveCurrentNooraniPreset = useCallback(
    (name: string, description?: string): SavedNooraniPreset => {
      const cleanName = name.trim() || `توزيعة أحرف نورانية ${new Date().toLocaleDateString('ar-EG')}`;
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

  // Export current full map (cipher letters + arabic letters) in a single unified JSON file
  const exportCurrentTableAsFile = useCallback(
    (customName?: string) => {
      const targetName = customName || activeTableName || 'خريطة_شفرة_الفرقان_الكاملة';

      const fullMapLayers = layers.map((l) => {
        const activeCipherKeys = (l.cipherLetters || []).filter((c) => (c || '').trim());
        const activeArabic = (l.arabicLetters || []).filter((a) => (a || '').trim());
        const pairings = activeArabic.map((char) => ({
          arabicLetter: char,
          layer: l.layer,
          cipherKeys: activeCipherKeys,
        }));

        return {
          layer: l.layer,
          description: l.description || `الطبقة ${l.layer}`,
          cipherLetters: l.cipherLetters,
          arabicLetters: l.arabicLetters,
          activeCipherKeys,
          pairings,
        };
      });

      const fileData = {
        app: 'quran_seven_layers_cipher',
        version: 2,
        exportedAt: new Date().toISOString(),
        tableName: targetName,
        description: 'خريطة شفرة كاملة تجمع أحرف التشفير النورانية والأحرف العربية موزعة على الطبقات السبع',
        fullMap: {
          totalLayers: 7,
          title: targetName,
          exportedAt: new Date().toISOString(),
          layers: fullMapLayers,
        },
        layers,
      };

      const safeFileName = targetName.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerJsonDownload(`${safeFileName}.json`, fileData);
    },
    [activeTableName, layers]
  );

  // Export a single saved table from library
  const exportSingleSavedTableAsFile = useCallback(
    (tableId: string) => {
      const target = savedTables.find((t) => t.id === tableId);
      if (!target) return;
      const fileData = {
        app: 'quran_seven_layers_cipher',
        version: 1,
        exportedAt: new Date().toISOString(),
        tableName: target.name,
        description: target.description,
        layers: target.layers,
      };
      const safeFileName = target.name.replace(/[\/\\?%*:|"<>]/g, '_');
      triggerJsonDownload(`${safeFileName}.json`, fileData);
    },
    [savedTables]
  );

  // Export all saved tables as a full backup JSON file
  const exportAllSavedTablesAsFile = useCallback(() => {
    const fileData = {
      app: 'quran_seven_layers_cipher',
      version: 1,
      type: 'backup_all_tables',
      exportedAt: new Date().toISOString(),
      totalTables: savedTables.length,
      currentActiveLayers: layers,
      tables: savedTables,
    };
    triggerJsonDownload(
      `نسخة_احتياطية_لجداول_الطبقات_${new Date().toISOString().slice(0, 10)}.json`,
      fileData
    );
  }, [savedTables, layers]);

  // Import JSON file with smart parsing (supports single table, list of tables, backup files, or fullMap)
  const importTablesFromJson = useCallback((jsonStr: string): ImportResult => {
    try {
      const parsed = JSON.parse(jsonStr);

      // Case 0: Full Map format with `fullMap.layers`
      if (parsed && typeof parsed === 'object' && parsed.fullMap && validateLayersStructure(parsed.fullMap.layers)) {
        const tableName = parsed.fullMap.title || parsed.tableName || `خريطة كاملة مستوردة ${new Date().toLocaleDateString('ar-EG')}`;
        const importedLayers: LayerInfo[] = normalizeLayers(parsed.fullMap.layers);

        setLayers(importedLayers);
        setActiveTableName(tableName);
        setSelectedSlot(null);

        const newSaved: SavedCustomTable = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tableName,
          description: parsed.description || 'خريطة كاملة مستوردة تتضمن أحرف التشفير والأحرف العربية',
          createdAt: Date.now(),
          layers: importedLayers,
        };
        setSavedTables((prev) => [newSaved, ...prev]);

        return {
          success: true,
          message: `تم استيراد الخريطة الكاملة [${tableName}] وتطبيق كافة أحرف التشفير والأحرف العربية بنجاح وحفظها في مكتبتك.`,
          importedCount: 1,
          appliedDirectly: true,
        };
      }

      // Case 1: Backup format with `tables: SavedCustomTable[]`
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tables)) {
        const validTables: SavedCustomTable[] = [];
        parsed.tables.forEach((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            const maybeTable = item as Partial<SavedCustomTable>;
            if (validateLayersStructure(maybeTable.layers)) {
              validTables.push({
                id: maybeTable.id || `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: maybeTable.name?.trim() || `جدول مستورد ${validTables.length + 1}`,
                description: maybeTable.description || '',
                createdAt: maybeTable.createdAt || Date.now(),
                layers: maybeTable.layers,
              });
            }
          }
        });

        if (validTables.length > 0) {
          setSavedTables((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newOnes = validTables.map((vt) =>
              existingIds.has(vt.id)
                ? { ...vt, id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` }
                : vt
            );
            return [...newOnes, ...prev];
          });

          const first = validTables[0];
          setLayers(JSON.parse(JSON.stringify(first.layers)));
          setActiveTableName(first.name);
          setSelectedSlot(null);

          return {
            success: true,
            message: `تم استيراد ${validTables.length} جدول/جداول وحفظها في مكتبتك، وتطبيق [${first.name}] مباشرة.`,
            importedCount: validTables.length,
            appliedDirectly: true,
          };
        }
      }

      // Case 2: Object with `layers: LayerInfo[]` (Single exported table)
      if (parsed && typeof parsed === 'object' && validateLayersStructure(parsed.layers)) {
        const tableName = parsed.tableName?.trim() || parsed.name?.trim() || `جدول مستورد ${new Date().toLocaleDateString('ar-EG')}`;
        const importedLayers: LayerInfo[] = JSON.parse(JSON.stringify(parsed.layers));

        setLayers(importedLayers);
        setActiveTableName(tableName);
        setSelectedSlot(null);

        const newSaved: SavedCustomTable = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tableName,
          description: parsed.description || 'تم استيراده من ملف JSON',
          createdAt: Date.now(),
          layers: importedLayers,
        };
        setSavedTables((prev) => [newSaved, ...prev]);

        return {
          success: true,
          message: `تم استيراد الجدول [${tableName}] وتطبيقه بنجاح وحفظه في مكتبتك.`,
          importedCount: 1,
          appliedDirectly: true,
        };
      }

      // Case 3: Raw array of 7 layers `[ { layer: 1, ... }, ... ]`
      if (validateLayersStructure(parsed)) {
        const tableName = `جدول مستورد ${new Date().toLocaleDateString('ar-EG')}`;
        const importedLayers: LayerInfo[] = JSON.parse(JSON.stringify(parsed));

        setLayers(importedLayers);
        setActiveTableName(tableName);
        setSelectedSlot(null);

        const newSaved: SavedCustomTable = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tableName,
          createdAt: Date.now(),
          layers: importedLayers,
        };
        setSavedTables((prev) => [newSaved, ...prev]);

        return {
          success: true,
          message: `تم استيراد مصفوفة الطبقات السبع بنجاح وحفظها كـ [${tableName}].`,
          importedCount: 1,
          appliedDirectly: true,
        };
      }

      return {
        success: false,
        message: 'الملف لا يحتوي على بنية طبقات سبع صالحة. يرجى التأكد من اختيار ملف جدول صالح.',
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
      loadSavedTable,
      deleteSavedTable,
      updateSavedTableName,
      exportCurrentTableAsFile,
      exportSingleSavedTableAsFile,
      exportAllSavedTablesAsFile,
      importTablesFromJson,
      savedArabicPresets,
      activeArabicPresetName,
      saveCurrentArabicPreset,
      applyArabicDistribution,
      deleteSavedArabicPreset,
      savedNooraniPresets,
      activeNooraniPresetName,
      saveCurrentNooraniPreset,
      applyNooraniDistribution,
      deleteSavedNooraniPreset,
      removeRowDuplicates,
      columnDuplicatesSummary,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      setCipherLettersForLayer,
      setCipherLetterAtSlot,
      resetToDefault,
      applyPreset,
      importLayersJson,
      exportLayersJson,
      analyzeText,
      decryptChar,
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
      loadSavedTable,
      deleteSavedTable,
      updateSavedTableName,
      exportCurrentTableAsFile,
      exportSingleSavedTableAsFile,
      exportAllSavedTablesAsFile,
      importTablesFromJson,
      savedArabicPresets,
      activeArabicPresetName,
      saveCurrentArabicPreset,
      applyArabicDistribution,
      deleteSavedArabicPreset,
      savedNooraniPresets,
      activeNooraniPresetName,
      saveCurrentNooraniPreset,
      applyNooraniDistribution,
      deleteSavedNooraniPreset,
      removeRowDuplicates,
      columnDuplicatesSummary,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      setCipherLettersForLayer,
      setCipherLetterAtSlot,
      resetToDefault,
      applyPreset,
      importLayersJson,
      exportLayersJson,
      analyzeText,
      decryptChar,
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
