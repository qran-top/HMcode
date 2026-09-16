import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayerInfo,
  DEFAULT_CIPHER_LAYERS,
  ALL_ARABIC_LETTERS_28,
  PRESET_TABLES,
  EncryptedLetterDetail,
  DecryptedLetterDetail,
  analyzeWord,
  decryptCipherChar,
  normalizeArabicChar,
} from '../cipherData';

const LOCAL_STORAGE_KEY = 'quran_cipher_custom_layers_v2';

export interface SelectedSlot {
  layerNum: number;
  slotIndex: number;
  char: string;
}

export interface CipherLayersContextType {
  layers: LayerInfo[];
  isCustomized: boolean;
  selectedSlot: SelectedSlot | null;
  setSelectedSlot: (slot: SelectedSlot | null) => void;
  usedLetters: Set<string>;
  missingLetters: string[];
  duplicateLetters: string[];
  letterCounts: Record<string, number>;
  validCipherLetters: Set<string>;
  totalFilledSlots: number;
  // Mutations
  swapSlots: (layerA: number, indexA: number, layerB: number, indexB: number) => void;
  setLetterAtSlot: (layerNum: number, slotIndex: number, char: string) => void;
  clearLetterAtSlot: (layerNum: number, slotIndex: number) => void;
  clearAllSlots: () => void;
  setCipherLettersForLayer: (layerNum: number, cipher1: string, cipher2: string) => void;
  resetToDefault: () => void;
  applyPreset: (presetId: keyof typeof PRESET_TABLES) => void;
  importLayersJson: (jsonStr: string) => boolean;
  exportLayersJson: () => string;
  // Execution helpers wired to active layers
  analyzeText: (text: string) => EncryptedLetterDetail[];
  decryptChar: (char: string) => DecryptedLetterDetail;
}

const CipherLayersContext = createContext<CipherLayersContextType | null>(null);

function loadInitialLayers(): LayerInfo[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved cipher layers from localStorage:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
}

export const CipherLayersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layers, setLayers] = useState<LayerInfo[]>(loadInitialLayers);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  // Persist to localStorage whenever layers change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layers));
    } catch (e) {
      console.error('Failed to persist cipher layers to localStorage:', e);
    }
  }, [layers]);

  // Check if customized compared to default
  const isCustomized = useMemo(() => {
    return JSON.stringify(layers) !== JSON.stringify(DEFAULT_CIPHER_LAYERS);
  }, [layers]);

  // Analyze letter distribution
  const { usedLetters, missingLetters, duplicateLetters, letterCounts, totalFilledSlots, validCipherLetters } = useMemo(() => {
    const counts: Record<string, number> = {};
    const used = new Set<string>();
    const validCiphers = new Set<string>();
    let filled = 0;

    layers.forEach((l) => {
      // Cipher keys
      if (l.cipherLetters[0]) validCiphers.add(l.cipherLetters[0]);
      if (l.cipherLetters[1]) validCiphers.add(l.cipherLetters[1]);

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

    const missing = ALL_ARABIC_LETTERS_28.filter((c) => !used.has(normalizeArabicChar(c)));

    return {
      usedLetters: used,
      missingLetters: missing,
      duplicateLetters: duplicates,
      letterCounts: counts,
      totalFilledSlots: filled,
      validCipherLetters: validCiphers,
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

  // Set cipher letters for a layer
  const setCipherLettersForLayer = useCallback(
    (layerNum: number, cipher1: string, cipher2: string) => {
      setLayers((prevLayers) => {
        const next = JSON.parse(JSON.stringify(prevLayers)) as LayerInfo[];
        const target = next.find((l) => l.layer === layerNum);
        if (target) {
          target.cipherLetters = [cipher1.trim(), cipher2.trim()];
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
      setSelectedSlot(null);
    }
  }, []);

  // Import JSON
  const importLayersJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length === 7) {
        // Validate basic structure
        const isValid = parsed.every(
          (l) =>
            typeof l.layer === 'number' &&
            Array.isArray(l.cipherLetters) &&
            Array.isArray(l.arabicLetters)
        );
        if (isValid) {
          setLayers(parsed);
          setSelectedSlot(null);
          return true;
        }
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
      selectedSlot,
      setSelectedSlot,
      usedLetters,
      missingLetters,
      duplicateLetters,
      letterCounts,
      validCipherLetters,
      totalFilledSlots,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      setCipherLettersForLayer,
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
      selectedSlot,
      usedLetters,
      missingLetters,
      duplicateLetters,
      letterCounts,
      validCipherLetters,
      totalFilledSlots,
      swapSlots,
      setLetterAtSlot,
      clearLetterAtSlot,
      clearAllSlots,
      setCipherLettersForLayer,
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
