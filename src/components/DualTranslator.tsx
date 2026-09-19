import React, { useState, useEffect, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { PRESET_TABLES, cleanText, getLayerColor, getAllCombinations, segmentIntoQuranicWords } from '../cipherData';
import { CompactLayersIndicator } from './CompactLayersIndicator';
import { arabicDictionary } from '../utils/arabicDictionary';
import { 
  quranicDictionary, 
  QuranicWordMeta, 
  QuranicNearestMatch,
  getQuranTopWordUrl,
  getQuranTopSearchUrl
} from '../utils/quranicDictionary';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import { 
  ArrowLeftRight, 
  Sparkles, 
  KeyRound, 
  Copy, 
  Check, 
  Download, 
  Save, 
  ExternalLink, 
  BookOpen, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Eraser,
  Search,
  Filter,
  History,
  Trash2,
  RotateCcw,
  Globe
} from 'lucide-react';
import { MultiSystemScanner } from './MultiSystemScanner';

interface DualTranslatorProps {
  onNavigateToEncrypt?: (text: string) => void;
  onNavigateToDecrypt?: (text: string) => void;
}

const DEFAULT_RECENT_SEARCHES = ['طسم', 'كهيعص', 'بقرة', 'يس', 'سلام'];
const STORAGE_KEY_HISTORY = 'cipher_recent_searches';

export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt }: DualTranslatorProps) {
  const {
    layers,
    activeTableName,
    savedTables,
    applyPreset,
    loadSavedTable,
    saveCurrentTable,
    exportCurrentTableAsFile,
    exportCurrentTableAsTextFile,
    analyzeText,
    validCipherLetters
  } = useCipherLayers();

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'decrypt' | 'encrypt'>('both');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showMultiSystemScanner, setShowMultiSystemScanner] = useState(false);
  
  // Persistent Search History
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_RECENT_SEARCHES;
  });

  // Save profile modal state
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  // Full permutations collapse (Decryption)
  const [showAllPermutations, setShowAllPermutations] = useState(false);
  const [permutationSearch, setPermutationSearch] = useState('');

  // Full permutations collapse (Encryption)
  const [showAllEncPermutations, setShowAllEncPermutations] = useState(false);
  const [encPermutationSearch, setEncPermutationSearch] = useState('');

  // Handle copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addToHistory = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  const handleGenerate = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setSubmittedText(trimmed);
    addToHistory(trimmed);
  };

  const handleSelectHistory = (term: string) => {
    setInputText(term);
    setSubmittedText(term);
    addToHistory(term);
  };

  const handleSaveProfile = () => {
    if (!saveName.trim()) return;
    saveCurrentTable(saveName.trim(), 'منظومة محفوظة من المترجم الذكي');
    setIsSaving(false);
    setSaveName('');
  };

  // ------------------- ENCRYPTION ANALYSIS -------------------
  const encryptionDetails = useMemo(() => {
    return analyzeText(submittedText);
  }, [submittedText, analyzeText]);

  const hasMissingArabic = encryptionDetails.length > 0 && encryptionDetails.some(d => d.layer === null && !d.isSpecialOrSpace);

  // Default cipher output (taking first available cipher letter for each layer)
  const primaryCipherOutput = useMemo(() => {
    return encryptionDetails.map(d => {
      if (d.isSpecialOrSpace) return d.char;
      if (d.layer && d.layer.cipherLetters && d.layer.cipherLetters.length > 0) {
        const active = d.layer.cipherLetters.filter(Boolean);
        return active[0] || '?';
      }
      return '?';
    }).join('');
  }, [encryptionDetails]);

  // Encryption combinations (Tawafiq & Permutations of cipher options)
  const rawEncCombinations = useMemo(() => {
    if (encryptionDetails.length === 0 || hasMissingArabic) return [];
    return getAllCombinations(encryptionDetails, 1500, true);
  }, [encryptionDetails, hasMissingArabic]);

  // Processed encryption combinations (both normal and reversed)
  const processedEncCombinations = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const combo of rawEncCombinations) {
      if (!seen.has(combo)) {
        list.push({ word: combo, isReversed: false, original: combo });
        seen.add(combo);
      }
      const rev = combo.split('').reverse().join('');
      if (rev !== combo && !seen.has(rev)) {
        list.push({ word: rev, isReversed: true, original: combo });
        seen.add(rev);
      }
    }
    return list;
  }, [rawEncCombinations]);

  // Exact Quranic matches for encryption combinations
  const encQuranicMatches = useMemo(() => {
    const list: { word: string; meta: QuranicWordMeta; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedEncCombinations) {
      const meta = quranicDictionary.getWordDetails(item.word);
      if (meta && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ word: item.word, meta, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedEncCombinations]);

  // Nearest Quranic vocabulary matches for encryption combinations
  const encNearestQuranicMatches = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    const exactSet = new Set(encQuranicMatches.map(m => m.word));
    let evaluated = 0;
    for (const item of processedEncCombinations) {
      if (evaluated >= 40) break;
      if (!exactSet.has(item.word) && !seen.has(item.word)) {
        const nearest = quranicDictionary.findClosestQuranicWord(item.word);
        if (nearest && nearest.similarity < 100 && nearest.similarity >= 60) {
          seen.add(item.word);
          list.push({ combo: item.word, nearest, isReversed: item.isReversed, original: item.original });
        }
        evaluated++;
      }
    }
    return list.sort((a, b) => b.nearest.similarity - a.nearest.similarity).slice(0, 10);
  }, [processedEncCombinations, encQuranicMatches]);

  // Confirmed Arabic dictionary matches for encryption combinations
  const encArabicDictionaryMatches = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const quranicSet = new Set(encQuranicMatches.map(m => m.word));
    const seen = new Set<string>();
    for (const item of processedEncCombinations) {
      if (!quranicSet.has(item.word) && !seen.has(item.word) && arabicDictionary.isWord(item.word)) {
        seen.add(item.word);
        list.push({ word: item.word, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedEncCombinations, encQuranicMatches]);

  // Noorani openings / segmentation for the primary cipher output
  const encCipherSegmentation = useMemo(() => {
    if (!primaryCipherOutput || primaryCipherOutput.includes('?')) return null;
    return segmentIntoQuranicWords(primaryCipherOutput);
  }, [primaryCipherOutput]);

  // Filtered list of encryption permutations
  const filteredEncPermutations = useMemo(() => {
    if (!encPermutationSearch.trim()) return rawEncCombinations;
    const search = encPermutationSearch.trim();
    return rawEncCombinations.filter(w => w.includes(search));
  }, [rawEncCombinations, encPermutationSearch]);

  // ------------------- DECRYPTION ANALYSIS -------------------
  const cleanChars = Array.from(cleanText(submittedText));
  const decodedItems = useMemo(() => {
    return cleanChars.map((char) => {
      if (char === ' ' || char === '\n' || char === '\t') {
        return {
          char,
          isSpace: true,
          matchingLayers: [] as typeof layers,
          candidates: [] as string[],
        };
      }
      const matchingLayers = layers.filter(
        (l) => Array.isArray(l.cipherLetters) && l.cipherLetters.filter(Boolean).includes(char)
      );
      const candidates = Array.from(
        new Set(matchingLayers.flatMap((l) => l.arabicLetters).filter(Boolean))
      );
      return {
        char,
        isSpace: false,
        matchingLayers,
        candidates,
      };
    });
  }, [cleanChars, layers]);

  const meaningfulItems = decodedItems.filter(d => !d.isSpace && d.matchingLayers.length > 0);
  const totalCombinationsCount = meaningfulItems.length > 0
    ? meaningfulItems.reduce((acc, item) => acc * Math.max(1, item.candidates.length), 1)
    : 0;

  // Generate permutations (capped for instant zero-lag response)
  const rawCombinations = useMemo(() => {
    if (meaningfulItems.length === 0) return [];
    const results: string[] = [];
    const maxCombos = Math.min(totalCombinationsCount, 1500);

    function buildWord(index: number, current: string) {
      if (results.length >= maxCombos) return;
      if (index === meaningfulItems.length) {
        results.push(current);
        return;
      }
      const candidates = meaningfulItems[index].candidates;
      for (const char of candidates) {
        buildWord(index + 1, current + char);
        if (results.length >= maxCombos) return;
      }
    }

    buildWord(0, '');
    return results;
  }, [meaningfulItems, totalCombinationsCount]);

  // Find exact Quranic matches
  const quranicMatches = useMemo(() => {
    const list: { word: string; meta: QuranicWordMeta; isReversed: boolean }[] = [];
    const seen = new Set<string>();

    for (const word of rawCombinations) {
      // Normal direction
      const metaNormal = quranicDictionary.getWordDetails(word);
      if (metaNormal && !seen.has(word)) {
        seen.add(word);
        list.push({ word, meta: metaNormal, isReversed: false });
      }

      // Reversed direction (معكوس الكلمة)
      const reversed = word.split('').reverse().join('');
      if (reversed !== word) {
        const metaRev = quranicDictionary.getWordDetails(reversed);
        if (metaRev && !seen.has(reversed)) {
          seen.add(reversed);
          list.push({ word: reversed, meta: metaRev, isReversed: true });
        }
      }
    }
    return list;
  }, [rawCombinations]);

  // Find confirmed Arabic dictionary matches (excluding duplicates from quranic list)
  const arabicDictionaryMatches = useMemo(() => {
    const list: { word: string; isReversed: boolean }[] = [];
    const quranicSet = new Set(quranicMatches.map(m => m.word));
    const seen = new Set<string>();

    for (const word of rawCombinations) {
      if (!quranicSet.has(word) && !seen.has(word) && arabicDictionary.isWord(word)) {
        seen.add(word);
        list.push({ word, isReversed: false });
      }
      const reversed = word.split('').reverse().join('');
      if (reversed !== word && !quranicSet.has(reversed) && !seen.has(reversed) && arabicDictionary.isWord(reversed)) {
        seen.add(reversed);
        list.push({ word: reversed, isReversed: true });
      }
    }
    return list;
  }, [rawCombinations, quranicMatches]);

  // Filtered list of permutations for researcher view
  const filteredPermutations = useMemo(() => {
    if (!permutationSearch.trim()) return rawCombinations;
    const search = permutationSearch.trim();
    return rawCombinations.filter(w => w.includes(search));
  }, [rawCombinations, permutationSearch]);

  // Active layers in current input
  const activeLayersNumbers = useMemo(() => {
    const set = new Set<number>();
    decodedItems.forEach(d => {
      d.matchingLayers.forEach(l => set.add(l.layer));
    });
    encryptionDetails.forEach(d => {
      if (d.layer) set.add(d.layer.layer);
    });
    return Array.from(set);
  }, [decodedItems, encryptionDetails]);

  // Determine correct select dropdown value matching either saved tables or preset keys
  const selectedDropdownValue = useMemo(() => {
    const saved = savedTables.find((t) => t.name === activeTableName);
    if (saved) return `saved_${saved.id}`;
    const presetEntry = Object.entries(PRESET_TABLES).find(([_, p]) => p.name === activeTableName);
    if (presetEntry) return presetEntry[0];
    return 'preset_1_hijai_asc';
  }, [activeTableName, savedTables]);

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-6xl mx-auto">
      
      {/* 1. Compact Profile Bar */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 sm:py-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          
          {/* Profile Selector Dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xs sm:text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0">
              المنظومة:
            </span>
            <select
              value={selectedDropdownValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('saved_')) {
                  loadSavedTable(val.replace('saved_', ''));
                } else if (PRESET_TABLES[val as keyof typeof PRESET_TABLES]) {
                  applyPreset(val as keyof typeof PRESET_TABLES);
                }
              }}
              className="flex-1 min-w-0 text-xs font-bold py-1.5 px-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <optgroup label="المنظومات المعيارية المعتمدة">
                {Object.entries(PRESET_TABLES).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {savedTables.length > 0 && (
                <optgroup label="منظوماتك المخصصة المحفوظة">
                  {savedTables.map((t) => (
                    <option key={t.id} value={`saved_${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Quick Actions & Rainbow Indicators */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <CompactLayersIndicator activeLayerNumbers={activeLayersNumbers.length > 0 ? activeLayersNumbers : [1, 2, 3, 4, 5, 6, 7]} />

            <div className="flex items-center gap-1 ms-1">
              {isSaving ? (
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-md">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="اسم المنظومة..."
                    className="text-2xs px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 w-24"
                    autoFocus
                  />
                  <button onClick={handleSaveProfile} className="px-1.5 py-0.5 text-2xs font-bold text-white bg-amber-600 rounded hover:bg-amber-700 cursor-pointer">حفظ</button>
                  <button onClick={() => setIsSaving(false)} className="px-1 py-0.5 text-2xs text-stone-500 hover:bg-stone-200 rounded cursor-pointer">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSaving(true)}
                  className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                  title="حفظ المنظومة الحالية في مكتبتك"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => exportCurrentTableAsTextFile()}
                className="px-2 py-1 rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer text-2xs font-bold"
                title="تصدير المنظومة كملف نصي مبسط (.txt) سطر بسطر"
              >
                TXT
              </button>

              <button
                onClick={() => exportCurrentTableAsFile()}
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                title="تصدير المنظومة كملف JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compact Smart Input Card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>الكلمة أو حروف التشفير:</span>
          </label>

          {/* Compact View Mode Selector */}
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-2xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              عرض متزامن
            </button>
            <button
              type="button"
              onClick={() => setViewMode('decrypt')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'decrypt'
                  ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              فك التشفير
            </button>
            <button
              type="button"
              onClick={() => setViewMode('encrypt')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'encrypt'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              التشفير
            </button>
          </div>
        </div>

        {/* Input and Generate Button */}
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="اكتب كلمة عربية أو شفرة (طسم، كهيعص، بقرة)..."
              className="w-full text-sm sm:text-base font-bold py-2 px-3 pe-8 rounded-lg border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all shadow-inner"
            />
            {inputText && (
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setSubmittedText('');
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
                title="مسح"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!inputText.trim()}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>توليد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMultiSystemScanner(!showMultiSystemScanner);
              if (!submittedText && inputText) {
                setSubmittedText(inputText.trim());
              }
            }}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              showMultiSystemScanner
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border border-stone-700'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
            }`}
            title="بحث وفحص شامل عبر كافة المنظومات الـ 50+ مع مؤشر تقدم وإلغاء فوري"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showMultiSystemScanner ? 'إغلاق البحث الشامل' : 'البحث في كل المنظومات'}</span>
            <span className="sm:hidden">{showMultiSystemScanner ? 'إغلاق' : 'كل المنظومات'}</span>
          </button>
        </div>

        {/* Multi-System Full Scanner */}
        {showMultiSystemScanner && (
          <div className="pt-2">
            <MultiSystemScanner
              initialQuery={submittedText || inputText}
              onClose={() => setShowMultiSystemScanner(false)}
            />
          </div>
        )}

        {/* 3. Interactive Recent Search History (سجل البحث السابق) */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-2xs font-extrabold text-stone-500 dark:text-stone-400 shrink-0">
            <History className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>السجل:</span>
          </div>

          {searchHistory.length === 0 ? (
            <span className="text-2xs text-stone-400 italic">لا يوجد بحث سابق</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap">
              {searchHistory.map((item) => (
                <button
                  key={`hist_${item}`}
                  type="button"
                  onClick={() => handleSelectHistory(item)}
                  className={`text-2xs font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                    submittedText === item
                      ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-950/60'
                  }`}
                  title={`البحث عن: ${item}`}
                >
                  {item}
                </button>
              ))}

              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-1 text-stone-400 hover:text-rose-500 rounded transition-colors shrink-0"
                  title="مسح سجل البحث"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Dense Output Results Layout (مضغوطة ومكبوسة لتظهر في صفحة واحدة) */}
      {submittedText && (
        <div className="space-y-3">

          {/* Section A: Decryption Results (Dense Format) */}
          {(viewMode === 'both' || viewMode === 'decrypt') && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    نتائج فك التشفير
                  </h3>
                </div>

                {onNavigateToDecrypt && (
                  <button
                    onClick={() => onNavigateToDecrypt(submittedText)}
                    className="text-2xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>التفاصيل الكاملة</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Priority 1: Exact Quranic Matches (High Density Grid) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span>المطابقات القرآنية المؤكدة ({quranicMatches.length})</span>
                  </h4>
                  <span className="text-3xs text-stone-400">
                    ألفاظ واردة بنصها في القرآن الكريم
                  </span>
                </div>

                {quranicMatches.length === 0 ? (
                  <div className="py-2.5 px-3 bg-stone-50/60 dark:bg-stone-950/40 rounded-lg border border-stone-200 dark:border-stone-800 text-2xs text-stone-500 text-center">
                    لم يُعثر على ألفاظ قرآنية مباشرة، يمكنك مراجعة الكلمات المعجمية أدناه.
                  </div>
                ) : (
                  /* High Density Quranic Chips Grid: Fits 15-25 words at once! */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
                    {quranicMatches.map((item, idx) => {
                      const url = getQuranTopWordUrl(item.word, item.meta.surahNumber, item.meta.ayahNum, item.meta.occurrences);
                      const isCopied = copiedText === `q_${idx}`;
                      return (
                        <div
                          key={`quran_${item.word}_${idx}`}
                          onClick={() => handleCopy(item.word, `q_${idx}`)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-1.5 shadow-2xs hover:border-amber-400 dark:hover:border-amber-700 transition-all cursor-pointer select-none group"
                          title={`انقر لنسخ [${item.word}]`}
                        >
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-base sm:text-lg font-bold font-['Amiri',serif] text-stone-900 dark:text-amber-100 leading-tight">
                              {item.word}
                            </span>
                            {isCopied ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                تم النسخ
                              </span>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10.5px] text-stone-400 dark:text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 font-sans truncate hover:underline"
                                title="عرض السورة والآيات"
                              >
                                {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                              </a>
                            )}
                          </div>

                          {item.isReversed && (
                            <RotateCcw
                              className="w-3 h-3 text-amber-600/70 dark:text-amber-400/70 shrink-0"
                              title="معكوس الكلمة"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Priority 2: Confirmed Arabic Lexicon Matches (Dense Cloud) */}
              {arabicDictionaryMatches.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الكلمات المعجمية المعتمدة ({arabicDictionaryMatches.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                    {arabicDictionaryMatches.slice(0, 60).map((item, idx) => (
                      <button
                        key={`dict_${item.word}_${idx}`}
                        onClick={() => handleCopy(item.word, `d_${idx}`)}
                        className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 text-2xs font-bold hover:scale-105 transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="انقر لنسخ الكلمة"
                      >
                        <span>{item.word}</span>
                        {item.isReversed && (
                          <RotateCcw className="w-2.5 h-2.5 text-emerald-700/80 dark:text-emerald-300/80 shrink-0" title="معكوس الكلمة" />
                        )}
                        {copiedText === `d_${idx}` ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority 3: Permutations Vault (Collapsible) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllPermutations(!showAllPermutations)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-950/60 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-2xs sm:text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-stone-500" />
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      بنك الاحتمالات والتوافيق الرياضية الكاملة ({rawCombinations.length} احتمال)
                    </span>
                  </div>
                  {showAllPermutations ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                </button>

                {showAllPermutations && (
                  <div className="mt-2 p-2.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={permutationSearch}
                          onChange={(e) => setPermutationSearch(e.target.value)}
                          placeholder="تصفية الاحتمالات بحرف معين..."
                          className="w-full text-2xs py-1 px-2 pe-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(filteredPermutations.join('\n'), 'all_perms')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="نسخ كافة الاحتمالات والتوافيق"
                      >
                        {copiedText === 'all_perms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto p-1.5 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap gap-1">
                      {filteredPermutations.map((word, i) => (
                        <span
                          key={`perm_${word}_${i}`}
                          onClick={() => handleCopy(word, `perm_${i}`)}
                          className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                          title="انقر للنسخ"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Section B: Encryption Results (Dense Format) */}
          {(viewMode === 'both' || viewMode === 'encrypt') && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    نتائج التشفير (أحرف الشيفرة وتوافيقها)
                  </h3>
                </div>

                {onNavigateToEncrypt && (
                  <button
                    onClick={() => onNavigateToEncrypt(submittedText)}
                    className="text-2xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>التفاصيل الكاملة</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {hasMissingArabic ? (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-center text-xs font-bold text-rose-700 dark:text-rose-300">
                  بعض أحرف هذه الكلمة غير موجودة في جدول التشفير الحالي. يرجى مراجعة محرر الطبقات.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dense Output Banner */}
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xs font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                        الشفرة الأساسية:
                      </span>
                      <div className="text-xl sm:text-2xl font-black font-['Amiri',serif] tracking-wider text-stone-900 dark:text-stone-100 truncate">
                        {primaryCipherOutput}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(primaryCipherOutput, 'enc_res')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      {copiedText === 'enc_res' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>نسخ</span>
                    </button>
                  </div>

                  {/* Noorani Segments if any */}
                  {encCipherSegmentation && encCipherSegmentation.segments.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex items-center gap-2 flex-wrap">
                      <span className="text-3xs font-bold text-amber-800 dark:text-amber-300">
                        فواتح السور في الشفرة:
                      </span>
                      <NooraniSegmentsBadge segmentation={encCipherSegmentation} />
                    </div>
                  )}

                  {/* Dense Letter Breakdown */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-2xs text-stone-400 font-bold">الطبقات:</span>
                    {encryptionDetails.map((detail, idx) => {
                      if (detail.isSpecialOrSpace) return null;
                      const layerNum = detail.layer ? detail.layer.layer : 0;
                      const color = getLayerColor(layerNum);
                      const ciphers = detail.layer ? detail.layer.cipherLetters.filter(Boolean) : [];

                      return (
                        <div
                          key={`char_${idx}`}
                          className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/80 flex items-center gap-1.5 text-xs shadow-2xs"
                        >
                          <span className="font-black font-['Amiri',serif] text-stone-900 dark:text-stone-100 text-sm">
                            {detail.char}
                          </span>
                          <span className={`text-3xs font-extrabold px-1 rounded ${color.badgeBg} ${color.badgeText}`}>
                            ط{layerNum}
                          </span>
                          <span className="text-3xs text-stone-500 font-bold">
                            → {ciphers.join('/')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Priority 1: Exact Quranic Matches from Encryption Combinations */}
                  {encQuranicMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          <span>المطابقات القرآنية المؤكدة للشفرة ({encQuranicMatches.length})</span>
                        </h4>
                        <span className="text-3xs text-stone-400">
                          ألفاظ واردة بنصها في القرآن الكريم من احتمالات الشفرة
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
                        {encQuranicMatches.map((item, idx) => {
                          const url = getQuranTopWordUrl(item.word, item.meta.surahNumber, item.meta.ayahNum, item.meta.occurrences);
                          const isCopied = copiedText === `enc_q_${idx}`;
                          return (
                            <div
                              key={`enc_quran_${item.word}_${idx}`}
                              onClick={() => handleCopy(item.word, `enc_q_${idx}`)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-1.5 shadow-2xs hover:border-amber-400 dark:hover:border-amber-700 transition-all cursor-pointer select-none group"
                              title={`انقر لنسخ [${item.word}]`}
                            >
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-base sm:text-lg font-bold font-['Amiri',serif] text-stone-900 dark:text-amber-100 leading-tight">
                                  {item.word}
                                </span>
                                {isCopied ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    تم النسخ
                                  </span>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10.5px] text-stone-400 dark:text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 font-sans truncate hover:underline"
                                    title="عرض السورة والآيات"
                                  >
                                    {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                                  </a>
                                )}
                              </div>

                              {item.isReversed && (
                                <RotateCcw
                                  className="w-3 h-3 text-amber-600/70 dark:text-amber-400/70 shrink-0"
                                  title="معكوس التوليفة"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Priority 2: Nearest Quranic Vocabulary Matches (أقرب المفردات القرآنية شبهاً) */}
                  {encNearestQuranicMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>أقرب المفردات القرآنية شبهاً باحتمالات الشفرة ({encNearestQuranicMatches.length})</span>
                        </h4>
                        <span className="text-3xs text-stone-400">
                          بنسبة تقارب بصري ومعجمي مرتفعة
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {encNearestQuranicMatches.map((item, idx) => {
                          const isCopied = copiedText === `enc_near_${idx}`;
                          return (
                            <div
                              key={`enc_near_${item.combo}_${idx}`}
                              onClick={() => handleCopy(item.nearest.word, `enc_near_${idx}`)}
                              className="px-2 py-1 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 flex items-center gap-1.5 cursor-pointer text-xs transition-all shadow-2xs"
                              title={`احتمال الشفرة: [${item.combo}] ← أقرب مفردة قرآنية: [${item.nearest.word}] في ${item.nearest.surahName}`}
                            >
                              <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                                {item.nearest.similarity}%
                              </span>
                              <span className="font-bold font-['Amiri',serif] text-stone-900 dark:text-stone-100 text-sm">
                                {item.nearest.word}
                              </span>
                              <span className="text-3xs text-stone-400 font-mono">
                                ← {item.combo}
                              </span>
                              {item.isReversed && (
                                <RotateCcw className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" title="معكوس" />
                              )}
                              {isCopied && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Priority 3: Confirmed Arabic Lexicon Matches for Encryption */}
                  {encArabicDictionaryMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الكلمات المعجمية لشفرات الحروف ({encArabicDictionaryMatches.length})</span>
                      </h4>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                        {encArabicDictionaryMatches.map((item, idx) => (
                          <button
                            key={`enc_dict_${item.word}_${idx}`}
                            onClick={() => handleCopy(item.word, `enc_d_${idx}`)}
                            className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 text-2xs font-bold hover:scale-105 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="انقر لنسخ الكلمة"
                          >
                            <span>{item.word}</span>
                            {item.isReversed && (
                              <RotateCcw className="w-2.5 h-2.5 text-emerald-700/80 dark:text-emerald-300/80 shrink-0" title="معكوس الكلمة" />
                            )}
                            {copiedText === `enc_d_${idx}` ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority 4: Encryption Permutations Vault (Collapsible) */}
                  {rawEncCombinations.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAllEncPermutations(!showAllEncPermutations)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-950/60 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-2xs sm:text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-bold text-stone-700 dark:text-stone-300">
                            بنك توافيق وأحرف التشفير الكاملة ({rawEncCombinations.length} احتمال)
                          </span>
                        </div>
                        {showAllEncPermutations ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                      </button>

                      {showAllEncPermutations && (
                        <div className="mt-2 p-2.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                              <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              <input
                                type="text"
                                value={encPermutationSearch}
                                onChange={(e) => setEncPermutationSearch(e.target.value)}
                                placeholder="تصفية الاحتمالات بحرف معين..."
                                className="w-full text-2xs py-1 px-2 pe-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(filteredEncPermutations.join('\n'), 'all_enc_perms')}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                              title="نسخ كافة احتمالات التشفير"
                            >
                              {copiedText === 'all_enc_perms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="max-h-48 overflow-y-auto p-1.5 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap gap-1">
                            {filteredEncPermutations.map((word, i) => (
                              <span
                                key={`enc_perm_${word}_${i}`}
                                onClick={() => handleCopy(word, `enc_perm_${i}`)}
                                className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                                title="انقر للنسخ"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
