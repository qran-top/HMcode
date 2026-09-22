import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { quranicDictionary, QuranicWordMeta } from '../utils/quranicDictionary';
import {
  cleanArabicTextForGematria,
  normalizeAbjadChar,
  SynthesizedTextResult,
  GematriaCalculationOptions,
  DEFAULT_GEMATRIA_OPTIONS,
  calculateGematriaWithOptions,
} from '../utils/gematriaEngine';
import { NOORANI_LETTERS_SET } from '../cipherData';

export interface GematriaTable {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  values: Record<string, number>;
  letterOrder: string[]; // Order of the 28 letters for UI display
}

// 1. Mashriqi (النموذج المشرقي الشائع - أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ)
export const MASHRIQI_VALUES: Record<string, number> = {
  'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1,
  'ب': 2,
  'ج': 3,
  'د': 4,
  'ه': 5, 'هـ': 5, 'ة': 5,
  'و': 6, 'ؤ': 6,
  'ز': 7,
  'ح': 8,
  'ط': 9,
  'ي': 10, 'ى': 10, 'ئ': 10,
  'ك': 20,
  'ل': 30,
  'م': 40,
  'ن': 50,
  'س': 60,
  'ع': 70,
  'ف': 80,
  'ص': 90,
  'ق': 100,
  'ر': 200,
  'ش': 300,
  'ت': 400,
  'ث': 500,
  'خ': 600,
  'ذ': 700,
  'ض': 800,
  'ظ': 900,
  'غ': 1000,
};

export const MASHRIQI_ORDER = [
  'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط',
  'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص',
  'ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
];

// 2. Maghribi (النموذج المغربي التاريخي - أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش)
export const MAGHRIBI_VALUES: Record<string, number> = {
  'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1,
  'ب': 2,
  'ج': 3,
  'د': 4,
  'ه': 5, 'هـ': 5, 'ة': 5,
  'و': 6, 'ؤ': 6,
  'ز': 7,
  'ح': 8,
  'ط': 9,
  'ي': 10, 'ى': 10, 'ئ': 10,
  'ك': 20,
  'ل': 30,
  'م': 40,
  'ن': 50,
  // صعفض
  'ص': 60,
  'ع': 70,
  'ف': 80,
  'ض': 90,
  // قرست
  'ق': 100,
  'ر': 200,
  'س': 300,
  'ت': 400,
  // ثخذ
  'ث': 500,
  'خ': 600,
  'ذ': 700,
  // ظغش
  'ظ': 800,
  'غ': 900,
  'ش': 1000,
};

export const MAGHRIBI_ORDER = [
  'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط',
  'ي', 'ك', 'ل', 'م', 'ن', 'ص', 'ع', 'ف', 'ض',
  'ق', 'ر', 'س', 'ت', 'ث', 'خ', 'ذ', 'ظ', 'غ', 'ش'
];

export const DEFAULT_GEMATRIA_TABLES: GematriaTable[] = [
  {
    id: 'mashriqi',
    name: 'النموذج المشرقي (الأبجدي الشائع)',
    description: 'الترتيب المشرقي التقليدي: أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ',
    isPreset: true,
    values: MASHRIQI_VALUES,
    letterOrder: MASHRIQI_ORDER,
  },
  {
    id: 'maghribi',
    name: 'النموذج المغربي (أبجد صعفض)',
    description: 'الترتيب المغربي الأصيل: أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش',
    isPreset: true,
    values: MAGHRIBI_VALUES,
    letterOrder: MAGHRIBI_ORDER,
  },
];

export const ARABIC_28_CANONICAL = [
  { char: 'ا', name: 'ألف' },
  { char: 'ب', name: 'باء' },
  { char: 'ج', name: 'جيم' },
  { char: 'د', name: 'دال' },
  { char: 'ه', name: 'هاء' },
  { char: 'و', name: 'واو' },
  { char: 'ز', name: 'زاي' },
  { char: 'ح', name: 'حاء' },
  { char: 'ط', name: 'طاء' },
  { char: 'ي', name: 'ياء' },
  { char: 'ك', name: 'كاف' },
  { char: 'ل', name: 'لام' },
  { char: 'م', name: 'ميم' },
  { char: 'ن', name: 'نون' },
  { char: 'س', name: 'سين' },
  { char: 'ع', name: 'عين' },
  { char: 'ف', name: 'فاء' },
  { char: 'ص', name: 'صاد' },
  { char: 'ق', name: 'قاف' },
  { char: 'ر', name: 'راء' },
  { char: 'ش', name: 'شين' },
  { char: 'ت', name: 'تاء' },
  { char: 'ث', name: 'ثاء' },
  { char: 'خ', name: 'خاء' },
  { char: 'ذ', name: 'ذال' },
  { char: 'ض', name: 'ضاد' },
  { char: 'ظ', name: 'ظاء' },
  { char: 'غ', name: 'غين' },
];

/**
 * Robustly resolves the numeric value of an Arabic letter in a given table
 */
export function getLetterValueInTable(table: GematriaTable, char: string): number {
  if (!char || char === ' ') return 0;
  if (table.values[char] !== undefined && table.values[char] !== null) {
    return Number(table.values[char]);
  }
  const norm = normalizeAbjadChar(char);
  if (table.values[norm] !== undefined && table.values[norm] !== null) {
    return Number(table.values[norm]);
  }
  // Preset or canonical fallback
  if (MASHRIQI_VALUES[char] !== undefined) {
    return MASHRIQI_VALUES[char];
  }
  if (MASHRIQI_VALUES[norm] !== undefined) {
    return MASHRIQI_VALUES[norm];
  }
  return 0;
}

export interface GematriaContextType {
  tables: GematriaTable[];
  activeTableId: string;
  activeTable: GematriaTable;
  calculationOptions: GematriaCalculationOptions;
  updateCalculationOptions: (updates: Partial<GematriaCalculationOptions>) => void;
  dictCount: number;
  dictLoaded: boolean;
  setActiveTableId: (id: string) => void;
  addCustomTable: (name: string, values: Record<string, number>, description?: string) => string;
  updateTable: (id: string, updates: Partial<GematriaTable>) => void;
  deleteTable: (id: string) => boolean;
  resetToDefaults: () => void;
  calculateWordGematria: (word: string, tableId?: string, overrideOptions?: Partial<GematriaCalculationOptions>) => number;
  getLetterBreakdown: (
    word: string,
    tableId?: string,
    overrideOptions?: Partial<GematriaCalculationOptions>
  ) => { char: string; value: number; isNoorani: boolean; note?: string }[];
  findQuranicMatches: (
    targetValue: number,
    options?: { filterType?: 'all' | 'noorani' | 'non_noorani'; maxResults?: number; tableId?: string }
  ) => SynthesizedTextResult[];
}

const STORAGE_KEY_TABLES = 'gematria_custom_tables_v1';
const STORAGE_KEY_ACTIVE = 'gematria_active_table_id_v1';
const STORAGE_KEY_OPTIONS = 'gematria_calc_options_v1';

const GematriaContext = createContext<GematriaContextType | undefined>(undefined);

export function GematriaProvider({ children }: { children: React.ReactNode }) {
  const [calculationOptions, setCalculationOptionsState] = useState<GematriaCalculationOptions>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (stored) {
        return { ...DEFAULT_GEMATRIA_OPTIONS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading stored calculation options:', e);
    }
    return DEFAULT_GEMATRIA_OPTIONS;
  });

  const updateCalculationOptions = useCallback((updates: Partial<GematriaCalculationOptions>) => {
    setCalculationOptionsState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(next));
      } catch (e) {
        console.warn('Error saving calculation options:', e);
      }
      return next;
    });
  }, []);

  const [tables, setTables] = useState<GematriaTable[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TABLES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge presets to ensure they always exist
          const presetMap = new Map(DEFAULT_GEMATRIA_TABLES.map((t) => [t.id, t]));
          const combined: GematriaTable[] = [];
          for (const item of parsed) {
            if (presetMap.has(item.id)) {
              // Ensure presets have latest description/order if not heavily customized
              combined.push({ ...presetMap.get(item.id)!, ...item, isPreset: true });
              presetMap.delete(item.id);
            } else {
              combined.push(item);
            }
          }
          // Add any missing preset
          presetMap.forEach((p) => combined.push(p));
          return combined;
        }
      }
    } catch (e) {
      console.warn('Error reading stored gematria tables:', e);
    }
    return DEFAULT_GEMATRIA_TABLES;
  });

  const [activeTableId, setActiveTableIdState] = useState<string>(() => {
    try {
      const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (storedActive) return storedActive;
    } catch (e) {
      console.warn('Error reading stored active table ID:', e);
    }
    return 'mashriqi';
  });

  // Track Quranic dictionary loading reactively
  const [dictCount, setDictCount] = useState<number>(() => quranicDictionary.getWordCount());
  const [dictLoaded, setDictLoaded] = useState<boolean>(() => quranicDictionary.isLoaded());

  useEffect(() => {
    // Initiate background loading if not already triggered
    quranicDictionary.init();

    const unsubscribe = quranicDictionary.subscribe((loaded, count) => {
      setDictLoaded(loaded);
      setDictCount(count);
    });
    return unsubscribe;
  }, []);

  // Persist tables
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(tables));
    } catch (e) {
      console.warn('Error saving gematria tables:', e);
    }
  }, [tables]);

  // Persist active ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeTableId);
    } catch (e) {
      console.warn('Error saving active table ID:', e);
    }
  }, [activeTableId]);

  const activeTable = useMemo(() => {
    return tables.find((t) => t.id === activeTableId) || tables[0] || DEFAULT_GEMATRIA_TABLES[0];
  }, [tables, activeTableId]);

  const setActiveTableId = useCallback((id: string) => {
    setActiveTableIdState(id);
  }, []);

  const addCustomTable = useCallback((name: string, values: Record<string, number>, description: string = '') => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTable: GematriaTable = {
      id,
      name: name.trim() || 'جدول مخصص جديد',
      description: description.trim() || 'جدول حساب جُمَّل مخصص بواسطة المستخدم',
      isPreset: false,
      values: { ...values },
      letterOrder: [...MASHRIQI_ORDER],
    };
    setTables((prev) => [...prev, newTable]);
    setActiveTableIdState(id);
    return id;
  }, []);

  const updateTable = useCallback((id: string, updates: Partial<GematriaTable>) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          ...updates,
          values: updates.values ? { ...updates.values } : t.values,
        };
      })
    );
  }, []);

  const deleteTable = useCallback(
    (id: string) => {
      // Prevent deleting if it's the only table
      if (tables.length <= 1) return false;

      setTables((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        return filtered;
      });

      if (activeTableId === id) {
        const remaining = tables.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          setActiveTableIdState(remaining[0].id);
        }
      }
      return true;
    },
    [tables, activeTableId]
  );

  const resetToDefaults = useCallback(() => {
    setTables(DEFAULT_GEMATRIA_TABLES);
    setActiveTableIdState('mashriqi');
    try {
      localStorage.removeItem(STORAGE_KEY_TABLES);
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
  }, []);

  // Calculate Gematria value of a word based on a table and active calculation options
  const calculateWordGematria = useCallback(
    (word: string, tableId?: string, overrideOptions?: Partial<GematriaCalculationOptions>): number => {
      if (!word) return 0;
      const targetTbl = (tableId ? tables.find((t) => t.id === tableId) : activeTable) || activeTable;
      const opts = { ...calculationOptions, ...overrideOptions };
      return calculateGematriaWithOptions(word, opts, targetTbl.values);
    },
    [tables, activeTable, calculationOptions]
  );

  // Detailed breakdown of letters for a word
  const getLetterBreakdown = useCallback(
    (word: string, tableId?: string, overrideOptions?: Partial<GematriaCalculationOptions>) => {
      if (!word) return [];
      const targetTbl = (tableId ? tables.find((t) => t.id === tableId) : activeTable) || activeTable;
      const opts = { ...calculationOptions, ...overrideOptions };

      let processed = word.trim();
      if (opts.definiteArticleMode === 'strip_al') {
        processed = processed.replace(/^(وال|فال|كال|بال|لل|ال)/, '').trim();
      }

      const details: { char: string; value: number; isNoorani: boolean; note?: string }[] = [];

      // Check Dagger Alif
      if (opts.daggerAlif === 'count_as_1') {
        const rawMatches = processed.match(/\u0670/g);
        if (rawMatches) {
          for (let i = 0; i < rawMatches.length; i++) {
            details.push({
              char: 'ٰ',
              value: targetTbl.values['ا'] || 1,
              isNoorani: true,
              note: 'ألف خنجرية محتسبة (1)',
            });
          }
        }
      }

      // Parse characters
      const rawArray = Array.from(processed);
      for (let i = 0; i < rawArray.length; i++) {
        const ch = rawArray[i];
        if (ch === '\u0651') {
          if (details.length > 0 && opts.shaddahMode === 'double_2x') {
            const prev = details[details.length - 1];
            prev.value *= 2;
            prev.note = (prev.note ? prev.note + ' + ' : '') + 'مضعف بالشدة (2x)';
          }
          continue;
        }
        if (/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/.test(ch)) {
          continue;
        }
        if (/[\u0621-\u064A\u0671]/.test(ch)) {
          let charVal = 0;
          let note: string | undefined;

          if (ch === 'ة' || ch === 'ۃ') {
            charVal = opts.taMarbuta === 'ta_400' ? (targetTbl.values['ت'] || 400) : (targetTbl.values['ه'] || targetTbl.values['ة'] || 5);
            note = opts.taMarbuta === 'ta_400' ? 'تاء مربوطة (400)' : 'تاء مربوطة كهاء (5)';
          } else if (ch === 'ى') {
            charVal = opts.alifMaqsura === 'alif_1' ? (targetTbl.values['ا'] || 1) : (targetTbl.values['ي'] || targetTbl.values['ى'] || 10);
            note = opts.alifMaqsura === 'alif_1' ? 'ألف مقصورة كألف (1)' : 'ألف مقصورة كياء (10)';
          } else if (ch === 'ء') {
            charVal = opts.hamzaMode === 'ignore_isolated_0' ? 0 : (targetTbl.values['ء'] || targetTbl.values['ا'] || 1);
            if (opts.hamzaMode === 'ignore_isolated_0') note = 'همزة مهملة (0)';
          } else if (['أ', 'إ', 'آ', 'ٱ'].includes(ch)) {
            charVal = targetTbl.values['ا'] || targetTbl.values[ch] || 1;
          } else if (ch === 'ؤ') {
            charVal = opts.hamzaMode === 'all_as_alif_1' ? (targetTbl.values['ا'] || 1) : (targetTbl.values['و'] || targetTbl.values['ؤ'] || 6);
          } else if (ch === 'ئ') {
            charVal = opts.hamzaMode === 'all_as_alif_1' ? (targetTbl.values['ا'] || 1) : (targetTbl.values['ي'] || targetTbl.values['ئ'] || 10);
          } else {
            charVal = getLetterValueInTable(targetTbl, ch);
          }

          const normalized = normalizeAbjadChar(ch);
          const isNoorani = NOORANI_LETTERS_SET.has(ch) || NOORANI_LETTERS_SET.has(normalized);
          details.push({ char: ch, value: charVal, isNoorani, note });
        }
      }

      return details;
    },
    [tables, activeTable, calculationOptions]
  );

  // Inverted Quranic index cache keyed by table ID + dictCount + table values + calculationOptions
  const indexCacheRef = React.useRef<Map<string, Map<number, { meta: QuranicWordMeta; clean: string; value: number; isNoorani: boolean }[]>>>(new Map());

  const getQuranIndexForTable = useCallback(
    (table: GematriaTable) => {
      const cacheKey = `${table.id}_${dictCount}_${JSON.stringify(table.values)}_${JSON.stringify(calculationOptions)}`;
      const existing = indexCacheRef.current.get(cacheKey);
      if (existing) return existing;

      const qDict = quranicDictionary.getAllWords();
      const map = new Map<number, { meta: QuranicWordMeta; clean: string; value: number; isNoorani: boolean }[]>();
      const seen = new Set<string>();

      for (const meta of qDict) {
        const rawWord = meta.originalQuranicWord || meta.word;
        const clean = cleanArabicTextForGematria(meta.word);
        if (!clean) continue;

        const val = calculateGematriaWithOptions(rawWord, calculationOptions, table.values);
        if (val <= 0) continue;

        const dedupKey = `${val}_${rawWord}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        let isNoorani = true;
        for (let i = 0; i < clean.length; i++) {
          const ch = clean[i];
          if (ch === ' ') continue;
          const norm = normalizeAbjadChar(ch);
          if (!NOORANI_LETTERS_SET.has(ch) && !NOORANI_LETTERS_SET.has(norm)) {
            isNoorani = false;
          }
        }

        const entry = { meta, clean, value: val, isNoorani };
        const list = map.get(val);
        if (list) {
          list.push(entry);
        } else {
          map.set(val, [entry]);
        }
      }

      indexCacheRef.current.set(cacheKey, map);
      return map;
    },
    [dictCount, calculationOptions]
  );

  // Find Quranic matches for target number
  const findQuranicMatches = useCallback(
    (
      targetValue: number,
      options: { filterType?: 'all' | 'noorani' | 'non_noorani'; maxResults?: number; tableId?: string } = {}
    ): SynthesizedTextResult[] => {
      const { filterType = 'all', maxResults = 150, tableId } = options;
      if (targetValue <= 0) return [];

      const targetTbl = (tableId ? tables.find((t) => t.id === tableId) : activeTable) || activeTable;
      const index = getQuranIndexForTable(targetTbl);
      const list = index.get(targetValue) || [];

      const matches: SynthesizedTextResult[] = [];
      const seenTexts = new Set<string>();

      for (const item of list) {
        if (filterType === 'noorani' && !item.isNoorani) continue;
        if (filterType === 'non_noorani' && item.isNoorani) continue;

        const displayWord = item.meta.originalQuranicWord || item.meta.word;
        if (seenTexts.has(displayWord)) continue;
        seenTexts.add(displayWord);

        matches.push({
          text: displayWord,
          value: item.value,
          letterCount: item.clean.replace(/\s+/g, '').length,
          letters: item.clean.replace(/\s+/g, '').split(''),
          isQuranic: true,
          isLexical: true,
          quranicMeta: item.meta,
          isNooraniOnly: item.isNoorani,
        });

        if (matches.length >= maxResults) break;
      }

      // Sort matches by occurrences (prominence in Quran) then shortest letter count
      matches.sort((a, b) => {
        const occA = a.quranicMeta?.occurrences || 1;
        const occB = b.quranicMeta?.occurrences || 1;
        if (occA !== occB) return occB - occA;
        return a.letterCount - b.letterCount;
      });

      return matches;
    },
    [tables, activeTable, getQuranIndexForTable]
  );

  return (
    <GematriaContext.Provider
      value={{
        tables,
        activeTableId,
        activeTable,
        calculationOptions,
        updateCalculationOptions,
        dictCount,
        dictLoaded,
        setActiveTableId,
        addCustomTable,
        updateTable,
        deleteTable,
        resetToDefaults,
        calculateWordGematria,
        getLetterBreakdown,
        findQuranicMatches,
      }}
    >
      {children}
    </GematriaContext.Provider>
  );
}

export function useGematria() {
  const context = useContext(GematriaContext);
  if (!context) {
    throw new Error('useGematria must be used within a GematriaProvider');
  }
  return context;
}
