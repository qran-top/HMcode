import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Search,
  Copy,
  Check,
  BookOpen,
  ExternalLink,
  Bookmark,
  Info,
  Hash,
  History,
  Trash2,
  Star,
  Square,
  X,
  Filter,
  CheckSquare,
  SquareMinus,
  Grid,
} from 'lucide-react';
import {
  NOORANI_14_FREQ_ORDER,
  calculateNooraniFreqGematria,
  searchQuranByNooraniValue,
  NooraniQuranMatch,
  NooraniFreqCalculationResult,
  FAWATIH_SUWAR_ITEMS,
  NooraniScannerProgress,
  NooraniSearchHistoryItem,
  WordBreakdownItem,
} from '../utils/nooraniFrequencyEngine';
import { cleanArabicTextForGematria, normalizeAbjadChar } from '../utils/gematriaEngine';
import { useTheme } from '../context/ThemeContext';
import { useHint } from '../context/HintContext';
import { useNotebook } from '../context/NotebookContext';
import {
  SURAH_NAMES,
  SURAH_MUQATTAAT_MAP,
  getSurahMuqattaat,
} from '../utils/quranicDictionary';

interface FawatihGematriaViewProps {
  initialQuery?: string;
}

export interface FawatihPresetItem {
  text: string;
  value: number;
}

/**
 * All 14 unique Fawatih Al-Suwar formulas in the Quran, sorted ascending by Noorani frequency value
 */
export const ALL_14_FAWATIH_SORTED: FawatihPresetItem[] = [
  { text: 'ن', value: 1 },
  { text: 'ق', value: 2 },
  { text: 'ص', value: 3 },
  { text: 'طه', value: 6 },
  { text: 'يس', value: 7 },
  { text: 'طس', value: 9 },
  { text: 'عسق', value: 9 },
  { text: 'كهيعص', value: 10 },
  { text: 'حم', value: 24 },
  { text: 'طسم', value: 26 },
  { text: 'الر', value: 32 },
  { text: 'حم عسق', value: 33 },
  { text: 'الم', value: 43 },
  { text: 'المص', value: 46 },
  { text: 'المر', value: 49 },
];

const STORAGE_KEY_NOORANI_HISTORY = 'noorani_fawatih_gematria_history_v1';

export interface UniqueNooraniMatchGroup {
  phrase: string;
  cleanPhrase: string;
  value: number;
  wordCount: number;
  letterCount: number;
  occurrenceCount: number;
  occurrences: {
    surahName: string;
    surahNumber: number;
    ayahNumber: number;
    fullAyahText: string;
    quranUrl: string;
  }[];
  breakdown: WordBreakdownItem[];
}

export function FawatihGematriaView({ initialQuery = 'الم' }: FawatihGematriaViewProps) {
  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint } = useHint();
  const { addEntry } = useNotebook();

  const [query, setQuery] = useState<string>(initialQuery || 'الم');
  const [matchScope, setMatchScope] = useState<'all' | 'single_words' | 'phrases'>('all');

  // Multi-select Surah filter
  const [selectedSurahIds, setSelectedSurahIds] = useState<Set<number>>(new Set());
  const [surahGridTab, setSurahGridTab] = useState<'fawatih29' | 'all114'>('fawatih29');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedPhrases, setSavedPhrases] = useState<Set<string>>(new Set());

  // Selected Group for Detailed Occurrences View
  const [selectedGroup, setSelectedGroup] = useState<UniqueNooraniMatchGroup | null>(null);

  const [showFawatihList, setShowFawatihList] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Search History State
  const [searchHistory, setSearchHistory] = useState<NooraniSearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOORANI_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Scanner & Progress State
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [rawMatches, setRawMatches] = useState<NooraniQuranMatch[]>([]);
  const [progress, setProgress] = useState<NooraniScannerProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Calculate input gematria value
  const calculation: NooraniFreqCalculationResult = useMemo(() => {
    return calculateNooraniFreqGematria(query);
  }, [query]);

  // Set of active letters present in current input query text to light up the 14 square cards
  const activeQueryLetters = useMemo(() => {
    if (!query) return new Set<string>();
    const clean = cleanArabicTextForGematria(query);
    const chars = clean.split('').filter((c) => /[\u0621-\u064A\u0671]/.test(c));

    const set = new Set<string>();
    for (const c of chars) {
      const norm = normalizeAbjadChar(c);
      set.add(c);
      set.add(norm);
      if (c === 'ه' || c === 'ة' || c === 'هـ') {
        set.add('ه');
        set.add('هـ');
        set.add('ة');
      }
      if (c === 'ي' || c === 'ى' || c === 'ئ') {
        set.add('ي');
        set.add('ى');
        set.add('ئ');
      }
      if (c === 'ا' || c === 'أ' || c === 'إ' || c === 'آ' || c === 'ٱ') {
        set.add('ا');
        set.add('أ');
        set.add('إ');
        set.add('آ');
      }
    }
    return set;
  }, [query]);

  // Save history helper
  const saveToHistory = useCallback((item: Omit<NooraniSearchHistoryItem, 'id' | 'timestamp'>) => {
    setSearchHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.query === item.query && h.value === item.value);
      const newItem: NooraniSearchHistoryItem = {
        ...item,
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      };

      let updated = [...prev];
      if (existingIdx >= 0) {
        updated.splice(existingIdx, 1);
      }
      updated.unshift(newItem);
      if (updated.length > 50) updated = updated.slice(0, 50);

      try {
        localStorage.setItem(STORAGE_KEY_NOORANI_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // 2. Perform Quran Search with Live Progress Bar
  const executeSearch = useCallback(async () => {
    if (calculation.totalValue <= 0) {
      setRawMatches([]);
      setProgress(null);
      setSelectedGroup(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);
    setSelectedGroup(null);
    setProgress({
      percent: 0,
      scannedAyahs: 0,
      totalAyahs: 6236,
      currentSurahName: 'جاري البدء...',
      matchesCount: 0,
      isRunning: true,
      isCompleted: false,
    });

    try {
      const res = await searchQuranByNooraniValue(calculation.totalValue, {
        maxResults: 50000,
        surahFilter: 0, // scan all 114 surahs completely
        matchScope: 'all', // scan all single words & chains into memory so UI scope filters are instant!
        abortSignal: abortController.signal,
        onProgress: (p) => {
          setProgress(p);
        },
      });

      if (!abortController.signal.aborted) {
        setRawMatches(res);
        saveToHistory({
          query: calculation.text,
          value: calculation.totalValue,
          wordCount: calculation.wordCount,
          letterCount: calculation.letterCount,
          matchesCount: res.length,
        });
      }
    } catch {
      setRawMatches([]);
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [calculation, matchScope, saveToHistory]);

  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSearching(false);
    if (playDosBeep) playDosBeep(450, 30);
  };

  // Note: Automatic search on mount/typing is disabled as requested by user.
  // Search runs exclusively when the user clicks the 'البحث في المصحف' button or presses Enter.

  // Compute matches count per Surah ID across all raw matches
  const surahMatchCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const m of rawMatches) {
      counts[m.surahNumber] = (counts[m.surahNumber] || 0) + 1;
    }
    return counts;
  }, [rawMatches]);

  // Filter raw matches by selectedSurahIds (if set is non-empty)
  const filteredMatches = useMemo(() => {
    if (selectedSurahIds.size === 0) return rawMatches;
    return rawMatches.filter((m) => selectedSurahIds.has(m.surahNumber));
  }, [rawMatches, selectedSurahIds]);

  // Results Filter Query (Search inside calculated results by phrase text or Ayah text)
  const [resultsFilterQuery, setResultsFilterQuery] = useState<string>('');

  // Group filtered matches into unique word/phrase chips
  const groupedMatches: UniqueNooraniMatchGroup[] = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return [];

    const map = new Map<string, UniqueNooraniMatchGroup>();

    for (const m of filteredMatches) {
      const key = m.cleanPhrase || m.phrase;
      if (!map.has(key)) {
        map.set(key, {
          phrase: m.phrase,
          cleanPhrase: m.cleanPhrase,
          value: m.value,
          wordCount: m.wordCount,
          letterCount: m.letterCount,
          occurrenceCount: 1,
          occurrences: [
            {
              surahName: m.surahName,
              surahNumber: m.surahNumber,
              ayahNumber: m.ayahNumber,
              fullAyahText: m.fullAyahText,
              quranUrl: m.quranUrl,
            },
          ],
          breakdown: m.breakdown,
        });
      } else {
        const group = map.get(key)!;
        group.occurrenceCount++;
        const exists = group.occurrences.some(
          (o) => o.surahNumber === m.surahNumber && o.ayahNumber === m.ayahNumber
        );
        if (!exists) {
          group.occurrences.push({
            surahName: m.surahName,
            surahNumber: m.surahNumber,
            ayahNumber: m.ayahNumber,
            fullAyahText: m.fullAyahText,
            quranUrl: m.quranUrl,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [filteredMatches]);

  // Filter for Pure Noorani Words Only (أحرف نورانية فقط)
  const [onlyNooraniWords, setOnlyNooraniWords] = useState<boolean>(false);

  // Helper to check if a group consists exclusively of 100% Noorani letters
  const isPureNooraniGroup = useCallback((g: UniqueNooraniMatchGroup): boolean => {
    if (!g || !g.breakdown) return false;
    for (const w of g.breakdown) {
      for (const l of w.letters) {
        if (!l.isNoorani) return false;
      }
    }
    return true;
  }, []);

  // Filter groupedMatches dynamically by matchScope, onlyNooraniWords, and resultsFilterQuery
  const finalFilteredGroups = useMemo(() => {
    if (!groupedMatches || groupedMatches.length === 0) return [];

    let list = groupedMatches;

    // 1. Filter by matchScope (كلمات فردية vs سلاسل)
    if (matchScope === 'single_words') {
      list = list.filter((g) => g.wordCount === 1);
    } else if (matchScope === 'phrases') {
      list = list.filter((g) => g.wordCount > 1);
    }

    // 2. Filter by pure Noorani words toggle (أحرف نورانية فقط)
    if (onlyNooraniWords) {
      list = list.filter((g) => isPureNooraniGroup(g));
    }

    // 3. Filter by resultsFilterQuery (search by phrase text or Ayah text / Surah name)
    if (resultsFilterQuery && resultsFilterQuery.trim()) {
      const qRaw = resultsFilterQuery.trim();
      const qClean = cleanArabicTextForGematria(qRaw).trim() || qRaw;

      list = list.filter((g) => {
        const phraseClean = cleanArabicTextForGematria(g.phrase);
        if (
          g.phrase.includes(qRaw) ||
          g.phrase.includes(qClean) ||
          phraseClean.includes(qClean) ||
          g.cleanPhrase.includes(qClean)
        ) {
          return true;
        }

        return g.occurrences.some((occ) => {
          const ayahClean = cleanArabicTextForGematria(occ.fullAyahText);
          return (
            occ.fullAyahText.includes(qRaw) ||
            occ.fullAyahText.includes(qClean) ||
            ayahClean.includes(qClean) ||
            occ.surahName.includes(qRaw) ||
            occ.surahName.includes(qClean)
          );
        });
      });
    }

    return list;
  }, [groupedMatches, matchScope, onlyNooraniWords, resultsFilterQuery, isPureNooraniGroup]);

  // Display Limit for DOM Rendering Performance (paged word cloud)
  const [displayLimit, setDisplayLimit] = useState<number>(200);

  useEffect(() => {
    setDisplayLimit(200);
  }, [matchScope, onlyNooraniWords, resultsFilterQuery, query, rawMatches]);

  const visibleGroups = useMemo(() => {
    return finalFilteredGroups.slice(0, displayLimit);
  }, [finalFilteredGroups, displayLimit]);

  // Toggle Surah in multi-select filter
  const toggleSurahFilter = (surahNum: number) => {
    setSelectedSurahIds((prev) => {
      const next = new Set(prev);
      if (next.has(surahNum)) {
        next.delete(surahNum);
      } else {
        next.add(surahNum);
      }
      return next;
    });
    if (playDosBeep) playDosBeep(880, 20);
  };

  const clearSurahFilters = () => {
    setSelectedSurahIds(new Set());
    if (playDosBeep) playDosBeep(600, 20);
  };

  const selectLitSurahsOnly = () => {
    const litSurahs = new Set<number>();
    for (const sNumStr of Object.keys(surahMatchCounts)) {
      const num = Number(sNumStr);
      if (surahMatchCounts[num] > 0) {
        litSurahs.add(num);
      }
    }
    setSelectedSurahIds(litSurahs);
    if (playDosBeep) playDosBeep(950, 25);
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (playDosBeep) playDosBeep(950, 25);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotebook = (group: UniqueNooraniMatchGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const firstOcc = group.occurrences[0];
    addEntry(
      group.phrase,
      `طابق فواتح السور (${group.value})`,
      {
        type: 'quranic',
        surahInfo: firstOcc ? firstOcc.surahName : '',
        ayahNum: firstOcc ? firstOcc.ayahNumber : 0,
        note: `تكررت ${group.occurrenceCount} مرة بالمصحف الشريف. أول موضع: سورة ${firstOcc?.surahName || ''}: ${firstOcc?.fullAyahText || ''}`,
      }
    );
    setSavedPhrases((prev) => new Set(prev).add(group.cleanPhrase || group.phrase));
    if (playDosBeep) playDosBeep(1100, 30);
  };

  const handleToggleFavoriteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      try {
        localStorage.setItem(STORAGE_KEY_NOORANI_HISTORY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOORANI_HISTORY);
    } catch {
      // ignore
    }
    if (playDosBeep) playDosBeep(500, 30);
  };

  // Surahs IDs list for 29 Fawatih Surahs
  const fawatihSurahIds = useMemo(() => {
    return FAWATIH_SUWAR_ITEMS.map((item) => item.surah);
  }, []);

  // Surahs IDs list for all 114 Surahs
  const all114SurahIds = useMemo(() => {
    return Array.from({ length: 114 }, (_, i) => i + 1);
  }, []);

  const activeSurahDisplayIds = surahGridTab === 'fawatih29' ? fawatihSurahIds : all114SurahIds;

  return (
    <div className="space-y-3 font-mono select-none text-right w-full max-w-full" dir="rtl">
      {/* 1. Header Banner & Actions */}
      <div
        style={{ backgroundColor: 'var(--dos-panel, #0000aa)', borderColor: 'var(--dos-border, #00aaaa)' }}
        className="p-3 sm:p-3.5 rounded border-2 shadow-lg text-white space-y-2.5 w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#00aaaa]/40 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffff55] text-black font-black px-1.5 py-0.5 text-xs rounded">
              [F2]
            </span>
            <h1 className="text-base sm:text-lg font-black text-[#ffff55] tracking-wide">
              حساب فواتح السور الـ 29 (الجُمَّل النوراني المباشر)
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer((prev) => !prev)}
              className={`text-2xs font-bold px-2 py-1 rounded transition-none inline-flex items-center gap-1 cursor-pointer border ${
                showHistoryDrawer
                  ? 'bg-[#ffff55] text-black border-white'
                  : 'bg-[#0000a8] text-[#55ffff] border-[#00aaaa] hover:bg-[#00aaaa] hover:text-black'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              سجل الباحث ({searchHistory.length})
            </button>

            {/* Fawatih Suwar List Button */}
            <button
              type="button"
              onClick={() => setShowFawatihList((prev) => !prev)}
              className="text-2xs bg-[#00aaaa] hover:bg-white text-black font-bold px-2 py-1 rounded transition-none inline-flex items-center gap-1 cursor-pointer border border-white"
            >
              <Info className="w-3.5 h-3.5" />
              {showFawatihList ? 'إخفاء الفواتح الـ 29' : 'الفواتح الـ 29'}
            </button>
          </div>
        </div>

        <p className="text-2xs text-[#55ffff] leading-relaxed">
          حساب مباشر ومستقل: يُعطى كل حرف نوراني وزنه بناءً على **عدد تكراره في فواتح السور الـ 29**، بينما يُعطى باقي الأحرف **القيمة صفر**.
        </p>

        {/* 14 Noorani Letters Grid Weights (Small Squares that light up when present in input) */}
        <div className="bg-black/80 border border-[#55ffff]/60 p-2 rounded shadow-inner">
          <div className="text-3xs font-bold text-[#ffff55] mb-1.5 flex items-center justify-between flex-wrap gap-1">
            <span>أوزان الحروف النورانية الـ 14 (تضيء المربعات التابعة للأحرف الموجودة بالعبارة):</span>
            <span className="text-stone-400">باقي الأحرف = 0</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-start">
            {NOORANI_14_FREQ_ORDER.map((item) => {
              const isActive =
                activeQueryLetters.has(item.char) ||
                activeQueryLetters.has(normalizeAbjadChar(item.char));

              return (
                <div
                  key={item.char}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md border flex flex-col items-center justify-center transition-all duration-150 cursor-default font-mono ${
                    isActive
                      ? 'bg-[#0d382b] border-[#00e676] text-[#00e676] shadow-[0_0_12px_rgba(0,230,118,0.5)] ring-2 ring-[#00e676] scale-105 z-10'
                      : 'bg-[#0000a8] border-[#55ffff]/40 text-[#ffff55] opacity-85 hover:opacity-100'
                  }`}
                  title={`${item.name}: تكرر ${item.freq} مرة في الفواتح ${isActive ? '(موجود بالعبارة المدخلة ✨)' : ''}`}
                >
                  <span className={`text-xs sm:text-sm font-black leading-none ${isActive ? 'text-[#00e676]' : 'text-[#ffff55]'}`}>
                    {item.char}
                  </span>
                  <span className={`text-[9px] font-mono font-bold leading-tight mt-0.5 ${isActive ? 'text-[#00e676]' : 'text-[#55ff55]'}`}>
                    ={item.freq}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional 29 Fawatih Suwar Drawer */}
        {showFawatihList && (
          <div className="bg-stone-900 border border-[#ffff55]/50 p-2.5 rounded text-2xs space-y-1.5">
            <div className="font-bold text-[#ffff55] border-b border-stone-700 pb-1">
              سور وآيات فواتح المصحف الـ 29 المقطعة:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pl-1">
              {FAWATIH_SUWAR_ITEMS.map((item, idx) => (
                <div key={idx} className="bg-black/60 px-2 py-0.5 rounded border border-stone-700 flex justify-between">
                  <span className="text-stone-300">
                    {item.surah}. {item.name}
                  </span>
                  <span className="font-bold text-[#55ff55]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search History Drawer Panel */}
        {showHistoryDrawer && (
          <div className="bg-black/95 border-2 border-[#ffff55] p-3 rounded space-y-2 text-2xs shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-700 pb-1.5">
              <span className="font-black text-[#ffff55] flex items-center gap-1.5">
                <History className="w-4 h-4" /> سجل عمليات البحث السابقة ({searchHistory.length})
              </span>
              <div className="flex items-center gap-2">
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-stone-400 hover:text-[#ff5555] flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Trash2 className="w-3 h-3" /> مسح السجل
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {searchHistory.length === 0 ? (
              <div className="text-center py-4 text-stone-500">لا يوجد عمليات بحث سابقة محفوظة بالسجل حتى الآن.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pl-1">
                {searchHistory.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setQuery(h.query);
                      setShowHistoryDrawer(false);
                      if (playDosBeep) playDosBeep(800, 20);
                    }}
                    className="bg-[#000088] hover:bg-[#00aaaa] hover:text-black border border-[#00aaaa]/50 p-2 rounded flex items-center justify-between cursor-pointer transition-none gap-2"
                  >
                    <div className="truncate">
                      <div className="font-bold text-[#ffff55] hover:text-black truncate">« {h.query} »</div>
                      <div className="text-3xs text-stone-300 hover:text-black">
                        القيمة: {h.value} | {h.matchesCount} مطابقة قرآنية
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavoriteHistory(h.id, e)}
                      className={`p-1 rounded hover:bg-black/30 cursor-pointer ${
                        h.isFavorite ? 'text-[#ffff55]' : 'text-stone-500'
                      }`}
                      title={h.isFavorite ? 'مفضلة' : 'إضافة للمفضلة'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Interactive Input Box */}
      <div
        style={{ backgroundColor: 'var(--dos-bg, #000000)', borderColor: 'var(--dos-border, #00aaaa)' }}
        className="p-3 rounded border-2 space-y-2.5 w-full"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  executeSearch();
                }
              }}
              placeholder="اكتب كلمة أو عبارة لحساب قيمتها بفواتح السور والبحث بالمصحف..."
              className="w-full bg-black text-[#ffff55] border-2 border-[#00aaaa] px-3 py-2 rounded text-sm sm:text-base font-bold focus:outline-none focus:border-[#ffff55] placeholder:text-stone-600 shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                تفريغ
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isSearching ? (
              <button
                type="button"
                onClick={handleStopSearch}
                className="bg-[#ff5555] hover:bg-red-600 text-white font-black px-3 py-2 rounded text-xs sm:text-sm border border-white cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> إيقاف البحث
              </button>
            ) : (
              <button
                type="button"
                onClick={executeSearch}
                disabled={!query.trim()}
                className="bg-[#ffff55] hover:bg-white text-black font-black px-4 py-2 rounded text-xs sm:text-sm border-2 border-white cursor-pointer active:translate-y-0.5 transition-none inline-flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Search className="w-4 h-4" /> البحث في المصحف
              </button>
            )}
          </div>
        </div>

        {/* All 14 Unique Fawatih Formulas Buttons Sorted Ascending by Value */}
        <div className="flex items-center gap-1.5 flex-wrap text-2xs pt-1 border-t border-[#00aaaa]/30">
          <span className="text-[#ffff55] font-black shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#ffff55]" />
            صيغ فواتح السور الـ 14 المقطعة (مرتبة تصاعدياً حسب القيمة):
          </span>
          {ALL_14_FAWATIH_SORTED.map((preset) => (
            <button
              key={preset.text}
              type="button"
              onClick={() => {
                setQuery(preset.text);
                if (playDosBeep) playDosBeep(800, 20);
                setTimeout(() => {
                  executeSearch();
                }, 50);
              }}
              className="bg-[#000088] hover:bg-[#00aaaa] text-white hover:text-black border border-[#00aaaa] px-2 py-1 rounded cursor-pointer font-bold transition-none inline-flex items-center gap-1 shadow-xs active:scale-95"
              title={`انقر لبحث الصيغة «${preset.text}» وحساب قيمتها (${preset.value}) بالمصحف`}
            >
              <span className="font-black text-[#ffff55] hover:text-black">{preset.text}</span>
              <span className="text-3xs font-mono font-bold text-[#55ff55] hover:text-black bg-black/60 px-1 py-0.2 rounded">
                ={preset.value}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Input Calculation Summary Box */}
      {calculation.text && (
        <div
          style={{ backgroundColor: 'var(--dos-panel, #0000a8)', borderColor: 'var(--dos-border, #00aaaa)' }}
          className="p-3 rounded border-2 space-y-2 text-white w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#00aaaa]/40 pb-2">
            <div>
              <span className="text-3xs font-bold text-stone-300">العبارة المدخلة:</span>
              <h2 className="text-base sm:text-lg font-black text-[#ffff55]">
                « {calculation.text} »
              </h2>
            </div>

            <div className="bg-black/90 border-2 border-[#ffff55] px-3 py-1.5 rounded text-center shadow-md shrink-0">
              <span className="text-3xs text-stone-400 block font-bold">قيمة فواتح السور</span>
              <span className="text-xl sm:text-2xl font-black text-[#55ff55] font-mono">
                {calculation.totalValue}
              </span>
            </div>
          </div>

          {/* Detailed Letter Breakdown per Word */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {calculation.words.map((w, wIdx) => (
              <div key={wIdx} className="bg-black/80 border border-[#00aaaa] px-2 py-1 rounded text-2xs flex items-center gap-2">
                <span className="font-bold text-[#ffff55]">{w.word} = {w.value}</span>
                <span className="text-stone-600">|</span>
                <div className="flex items-center gap-0.5">
                  {w.letters.map((l, lIdx) => (
                    <span
                      key={lIdx}
                      className={`text-3xs font-mono px-1 rounded ${
                        l.isNoorani ? 'bg-[#003300] text-[#55ff55]' : 'text-stone-500'
                      }`}
                      title={l.isNoorani ? `حرف نوراني [وزنه=${l.value}]` : 'حرف غير نوراني [وزنه=0]'}
                    >
                      {l.char}={l.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Live Progress Bar during Scanning */}
      {isSearching && progress && (
        <div className="bg-black border-2 border-[#ffff55] p-3 rounded space-y-2 text-2xs shadow-md w-full">
          <div className="flex items-center justify-between font-bold text-[#ffff55]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block animate-spin text-sm">⌛</span>
              جاري البحث في المصحف الشريف... ({progress.currentSurahName})
            </span>
            <span className="font-mono text-sm text-[#55ff55]">{progress.percent}%</span>
          </div>

          {/* Retro DOS Progress Bar Visual */}
          <div className="bg-stone-900 border border-[#00aaaa] h-4 rounded overflow-hidden relative">
            <div
              className="bg-[#00aaaa] h-full transition-all duration-75"
              style={{ width: `${progress.percent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-3xs font-mono font-bold text-white drop-shadow">
              {progress.scannedAyahs} / {progress.totalAyahs} آية
            </div>
          </div>

          <div className="flex items-center justify-between text-3xs text-stone-400 font-bold">
            <span>تم العثور على: <strong className="text-[#55ff55]">{progress.matchesCount}</strong> مطابقة حتى الآن</span>
            <button
              type="button"
              onClick={handleStopSearch}
              className="text-[#ff5555] hover:underline cursor-pointer font-bold"
            >
              [إيقاف البحث]
            </button>
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE SURAH FILTER BUTTONS GRID (Styling matched to user image) */}
      <div
        style={{ backgroundColor: 'var(--dos-panel, #0000aa)', borderColor: 'var(--dos-border, #00aaaa)' }}
        className="p-3 sm:p-4 rounded border-2 space-y-3 w-full shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#00aaaa]/40 pb-2">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#ffff55]" />
            <h3 className="text-xs sm:text-sm font-black text-[#ffff55]">
              شبكة سور المصحف القرآنية والتراكمات المطابقة
            </h3>
            {selectedSurahIds.size > 0 && (
              <span className="bg-[#ffff55] text-black text-3xs font-bold px-1.5 py-0.5 rounded">
                محدد: {selectedSurahIds.size} سورة
              </span>
            )}
          </div>

          {/* Tabs for 29 Fawatih Surahs vs All 114 Surahs & Multi-select Actions */}
          <div className="flex items-center gap-1.5 flex-wrap text-2xs">
            <div className="bg-black/80 p-0.5 rounded border border-[#00aaaa] flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSurahGridTab('fawatih29')}
                className={`px-2 py-0.5 rounded font-bold transition-none cursor-pointer ${
                  surahGridTab === 'fawatih29'
                    ? 'bg-[#00aaaa] text-black font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                سور الفواتح الـ 29
              </button>
              <button
                type="button"
                onClick={() => setSurahGridTab('all114')}
                className={`px-2 py-0.5 rounded font-bold transition-none cursor-pointer ${
                  surahGridTab === 'all114'
                    ? 'bg-[#00aaaa] text-black font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                جميع السور (114)
              </button>
            </div>

            {/* Quick multi-select filter buttons */}
            <button
              type="button"
              onClick={selectLitSurahsOnly}
              className="bg-[#0d382b] hover:bg-[#00e676] text-[#00e676] hover:text-black border border-[#00e676] px-2 py-0.5 rounded text-3xs font-bold transition-none cursor-pointer flex items-center gap-1"
              title="تحديد السور التي تحتوي على نتائج مطابقة فقط"
            >
              <CheckSquare className="w-3 h-3" /> السور المضاءة فقط
            </button>

            {selectedSurahIds.size > 0 && (
              <button
                type="button"
                onClick={clearSurahFilters}
                className="bg-stone-800 hover:bg-white text-stone-300 hover:text-black border border-stone-600 px-2 py-0.5 rounded text-3xs font-bold transition-none cursor-pointer flex items-center gap-1"
              >
                <SquareMinus className="w-3 h-3" /> إلغاء التحديد (عرض الكل)
              </button>
            )}
          </div>
        </div>

        {/* The Surahs Button Cards Grid (Design exactly matching user uploaded image!) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 max-h-[380px] overflow-y-auto p-1 bg-black/60 rounded border border-[#00aaaa]/40">
          {activeSurahDisplayIds.map((sNum) => {
            const sName = SURAH_NAMES[sNum] || `سورة ${sNum}`;
            const fawatihText = getSurahMuqattaat(sNum, sName);
            const count = surahMatchCounts[sNum] || 0;
            const isLit = count > 0;
            const isSelected = selectedSurahIds.has(sNum);

            return (
              <button
                key={sNum}
                type="button"
                onClick={() => toggleSurahFilter(sNum)}
                className={`rounded-md p-1.5 border flex flex-col items-center justify-between text-center transition-all cursor-pointer font-mono min-h-[58px] relative ${
                  isSelected
                    ? 'ring-2 ring-[#ffff55] border-[#ffff55] bg-[#00e676] text-black font-black scale-105 z-10 shadow-lg'
                    : isLit
                    ? 'bg-[#0d382b] border-[#00e676] text-[#00e676] shadow-[0_0_10px_rgba(0,230,118,0.25)] hover:border-white'
                    : 'bg-[#131b26] border-[#243042] text-[#5a6e85] hover:border-[#3b4c63] hover:text-stone-300 opacity-80'
                }`}
                title={`سورة ${sName} (${sNum}) - ${count} مطابقة`}
              >
                {/* Top Line: Fawatih Text or Surah Number */}
                <span
                  className={`text-xs font-black truncate w-full ${
                    isSelected
                      ? 'text-black'
                      : isLit
                      ? 'text-[#00e676]'
                      : 'text-[#3b4c63]'
                  }`}
                >
                  {fawatihText || `${sNum}`}
                </span>

                {/* Middle Line: Surah Name */}
                <span
                  className={`text-3xs font-bold truncate w-full my-0.5 ${
                    isSelected ? 'text-black' : isLit ? 'text-white' : 'text-stone-400'
                  }`}
                >
                  {sName}
                </span>

                {/* Bottom Line: Matches Count Badge */}
                <span
                  className={`text-3xs font-black px-1.5 rounded-full ${
                    isSelected
                      ? 'bg-black text-[#ffff55]'
                      : isLit
                      ? 'bg-[#00e676]/20 text-[#00e676]'
                      : 'text-[#3b4c63]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Quranic Search Results (Full Width Page Word Cloud & Details Panel) */}
      <div
        style={{ backgroundColor: 'var(--dos-bg, #000000)', borderColor: 'var(--dos-border, #00aaaa)' }}
        className="p-3 sm:p-4 rounded border-2 space-y-3 w-full"
      >
        {/* Results Controls Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#00aaaa]/40 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ffff55]" />
            <h3 className="text-sm sm:text-base font-black text-[#ffff55]">
              الكلمات والسلاسل القرآنية المطابقة ({groupedMatches.length} كلمة/سلسلة فريدة)
            </h3>
            {selectedSurahIds.size > 0 && (
              <span className="text-3xs bg-[#00aaaa] text-black px-1.5 py-0.5 rounded font-bold">
                تصفية مفعلة لـ {selectedSurahIds.size} سورة
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-2xs">
            {/* Pure Noorani Words Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setOnlyNooraniWords((prev) => !prev);
                if (playDosBeep) playDosBeep(850, 20);
              }}
              className={`px-2.5 py-1 rounded font-black border transition-none cursor-pointer flex items-center gap-1 ${
                onlyNooraniWords
                  ? 'bg-[#55ff55] text-black border-white shadow-[0_0_10px_rgba(85,255,85,0.4)]'
                  : 'bg-stone-900 text-[#55ff55] border-[#55ff55]/60 hover:bg-[#003300]'
              }`}
              title="تصفية الكلمات التي تتكون حروفها بالكامل من الأحرف النورانية الـ 14 فقط"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {onlyNooraniWords ? '✨ أحرف نورانية فقط (مفعل)' : 'أحرف نورانية فقط'}
            </button>

            <span className="text-stone-600">|</span>

            {/* Scope filter buttons */}
            <button
              type="button"
              onClick={() => {
                setMatchScope('all');
                if (playDosBeep) playDosBeep(800, 15);
              }}
              className={`px-2 py-0.5 rounded font-bold border transition-none cursor-pointer ${
                matchScope === 'all'
                  ? 'bg-[#ffff55] text-black border-white font-black'
                  : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-[#00aaaa]'
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => {
                setMatchScope('single_words');
                if (playDosBeep) playDosBeep(800, 15);
              }}
              className={`px-2 py-0.5 rounded font-bold border transition-none cursor-pointer ${
                matchScope === 'single_words'
                  ? 'bg-[#ffff55] text-black border-white font-black'
                  : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-[#00aaaa]'
              }`}
            >
              كلمات فردية
            </button>

            <button
              type="button"
              onClick={() => {
                setMatchScope('phrases');
                if (playDosBeep) playDosBeep(800, 15);
              }}
              className={`px-2 py-0.5 rounded font-bold border transition-none cursor-pointer ${
                matchScope === 'phrases'
                  ? 'bg-[#ffff55] text-black border-white font-black'
                  : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-[#00aaaa]'
              }`}
            >
              سلاسل وعبارات
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!isSearching && groupedMatches.length === 0 && calculation.totalValue > 0 && (
          <div className="py-8 text-center space-y-2 text-stone-400 border border-dashed border-stone-800 rounded">
            <BookOpen className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-xs font-bold">
              لم نجد كلمات أو عبارات مطابقة تماماً بالقيمة ({calculation.totalValue}) ضمن السور والتصفيات المحددة.
            </p>
            {selectedSurahIds.size > 0 && (
              <button
                type="button"
                onClick={clearSurahFilters}
                className="text-[#ffff55] underline text-xs font-bold cursor-pointer"
              >
                إلغاء تصفية السور لعرض نتائج جميع السور
              </button>
            )}
          </div>
        )}

        {/* Full Width Unique Words Chips Grid / Flow Cloud (No height limit / full page width!) */}
        {!isSearching && groupedMatches.length > 0 && (
          <div className="space-y-3 w-full">
            {/* Interactive Results Filter Search Bar */}
            <div className="bg-[#0000a8]/80 border-2 border-[#ffff55] p-2.5 rounded-lg space-y-1.5 shadow-md">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={resultsFilterQuery}
                    onChange={(e) => setResultsFilterQuery(e.target.value)}
                    placeholder="تفتيش وفلترة سريعة في النتائج (ابحث باسم الكلمة أو بنص الآية القرآنية)..."
                    className="w-full bg-black text-[#55ff55] border border-[#00aaaa] px-3 py-1.5 rounded text-xs font-bold focus:outline-none focus:border-[#ffff55] placeholder:text-stone-500 shadow-inner"
                  />
                  {resultsFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setResultsFilterQuery('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-3xs px-1.5 py-0.5 rounded cursor-pointer font-bold bg-stone-800"
                    >
                      تفريغ الفلتر
                    </button>
                  )}
                </div>

                <div className="text-2xs font-bold text-stone-200 shrink-0 flex items-center gap-1.5">
                  {resultsFilterQuery ? (
                    <span className="bg-[#ffff55] text-black px-2.5 py-0.5 rounded font-black text-xs shadow-xs">
                      مطابقة الفلتر: {finalFilteredGroups.length} من أصل {groupedMatches.length} كلمة
                    </span>
                  ) : (
                    <span className="text-stone-300">
                      إجمالي نتائج الكلمات: <strong className="text-[#55ff55] text-xs">{groupedMatches.length}</strong> كلمة
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filter empty message */}
            {resultsFilterQuery && finalFilteredGroups.length === 0 && (
              <div className="py-6 text-center space-y-1.5 text-stone-300 bg-black/90 border-2 border-amber-500/70 rounded-lg p-4">
                <div className="text-sm sm:text-base font-black text-[#ffff55]">
                  الكلمة أو الآية « {resultsFilterQuery} » غير موجودة ضمن نتائج هذا البحث.
                </div>
                <div className="text-2xs text-stone-400">
                  تأكد من كتابة الكلمة بشكل صحيح، أو انقر على تفريغ الفلتر لعرض جميع النتائج المتاحة ({groupedMatches.length}).
                </div>
                <button
                  type="button"
                  onClick={() => setResultsFilterQuery('')}
                  className="text-2xs bg-[#00aaaa] text-black font-bold px-3 py-1 rounded cursor-pointer border border-white mt-1 inline-block"
                >
                  تفريغ الفلتر والعودة لكافة النتائج ({groupedMatches.length})
                </button>
              </div>
            )}

            {/* Word Cloud Grid */}
            {finalFilteredGroups.length > 0 && (
              <div className="space-y-3 w-full">
                <div className="flex items-center gap-2 flex-wrap p-3.5 bg-[#0000a8]/30 border border-[#00aaaa]/50 rounded-lg w-full">
                  {visibleGroups.map((g, idx) => {
                    const isSelected = selectedGroup?.phrase === g.phrase;
                    const isSaved = savedPhrases.has(g.cleanPhrase || g.phrase);

                    return (
                      <button
                        key={`${g.phrase}_${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(g);
                          if (playDosBeep) playDosBeep(900, 20);
                        }}
                        style={
                          isSelected
                            ? { backgroundColor: '#ffff55', color: '#000000', borderColor: '#ffffff' }
                            : { backgroundColor: '#000088', color: '#ffffff', borderColor: '#00aaaa' }
                        }
                        className={`px-3 py-1.5 rounded-md border text-sm sm:text-base font-black cursor-pointer transition-none active:scale-95 shadow-xs flex items-center gap-1.5 ${
                          isSelected
                            ? 'ring-2 ring-white scale-105 z-10'
                            : 'hover:bg-[#00aaaa] hover:text-black hover:border-white'
                        }`}
                        title={`انقر لعرض مواضع الورود بالمصحف (${g.occurrenceCount} موضع)`}
                      >
                        <span>{g.phrase}</span>
                        {g.occurrenceCount > 1 && (
                          <span className={`text-3xs px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            isSelected ? 'bg-black text-[#ffff55]' : 'bg-[#00aaaa] text-black'
                          }`}>
                            x{g.occurrenceCount}
                          </span>
                        )}
                        {isSaved && <span className="text-[#55ff55] font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Show More Pagination Bar */}
                {finalFilteredGroups.length > displayLimit && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDisplayLimit((prev) => prev + 300)}
                      className="bg-[#00aaaa] hover:bg-[#ffff55] text-black font-black px-4 py-2 rounded text-xs border border-white cursor-pointer shadow-md transition-none"
                    >
                      إظهار المزيد من النتائج (+300 كلمة أخرى) — المعروض حالياً: {visibleGroups.length} من أصل {finalFilteredGroups.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(finalFilteredGroups.length)}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold px-3 py-2 rounded text-xs border border-stone-600 cursor-pointer"
                    >
                      عرض جميع النتائج ({finalFilteredGroups.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Word Detail Modal Overlay Dialog (Opens in-place directly on top of screen!) */}
        {selectedGroup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm font-mono text-right animate-in fade-in duration-150"
            dir="rtl"
            onClick={() => setSelectedGroup(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: 'var(--dos-panel, #0000aa)', borderColor: '#ffff55' }}
              className="w-full max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-5 rounded-xl border-2 space-y-3.5 text-white shadow-2xl relative"
            >
              {/* Top Bar of Selected Word */}
              <div className="flex items-center justify-between border-b border-[#ffff55]/40 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xs font-bold text-stone-300">الكلمة المحددة:</span>
                  <span className="text-lg sm:text-2xl font-black text-[#ffff55]">
                    « {selectedGroup.phrase} »
                  </span>
                  <span className="bg-black/90 border border-[#55ff55] px-2.5 py-0.5 rounded text-2xs font-mono font-black text-[#55ff55]">
                    القيمة = {selectedGroup.value}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(selectedGroup.phrase, `group_${selectedGroup.phrase}`, e)}
                    className="bg-stone-800 hover:bg-[#00aaaa] text-white hover:text-black px-2.5 py-1 rounded text-2xs font-bold border border-stone-600 transition-none flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `group_${selectedGroup.phrase}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#55ff55]" /> تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> نسخ
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveToNotebook(selectedGroup, e)}
                    className={`px-2.5 py-1 rounded text-2xs font-bold border transition-none flex items-center gap-1 cursor-pointer ${
                      savedPhrases.has(selectedGroup.cleanPhrase || selectedGroup.phrase)
                        ? 'bg-[#003300] text-[#55ff55] border-[#55ff55]'
                        : 'bg-stone-800 hover:bg-[#ffff55] text-white hover:text-black border-stone-600'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {savedPhrases.has(selectedGroup.cleanPhrase || selectedGroup.phrase) ? 'محفوظة' : 'حفظ للمفكرة'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-[#ff5555] text-stone-300 hover:text-white border border-stone-600 cursor-pointer transition-colors"
                    title="إغلاق النافذة (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Letter Breakdown Grid */}
              <div className="bg-black/90 p-3 rounded-lg border border-[#00aaaa] space-y-1.5 text-2xs">
                <div className="font-bold text-[#ffff55] flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" /> تفصيل أوزان أحرف الكلمة بفواتح السور:
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedGroup.breakdown.map((wb, wbIdx) => (
                    <div key={wbIdx} className="bg-stone-900 p-1.5 rounded border border-stone-700">
                      <div className="font-bold text-[#ffff55] mb-0.5">
                        {wb.word} <span className="text-[#55ff55]">({wb.value})</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {wb.letters.map((lb, lbIdx) => (
                          <span
                            key={lbIdx}
                            className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                              lb.isNoorani ? 'bg-[#003300] text-[#55ff55]' : 'text-stone-500'
                            }`}
                          >
                            {lb.char}={lb.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Occurrences in Quran Ayahs */}
              <div className="space-y-2">
                <div className="text-2xs font-bold text-[#ffff55] flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-[#55ffff]" />
                  مواضع وردود الكلمة بالمصحف الشريف ({selectedGroup.occurrences.length} موضع):
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pl-1">
                  {selectedGroup.occurrences.map((occ, occIdx) => (
                    <div
                      key={occIdx}
                      className="bg-black/90 p-3 rounded-lg border border-[#00aaaa]/50 hover:border-[#ffff55] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1 text-3xs">
                        <span className="bg-[#00aaaa] text-black font-black px-2 py-0.5 rounded">
                          سورة {occ.surahName} : آية {occ.ayahNumber}
                        </span>
                        <a
                          href={occ.quranUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#55ffff] hover:text-white underline flex items-center gap-0.5 font-bold"
                        >
                          <ExternalLink className="w-3 h-3" /> فتح المصحف
                        </a>
                      </div>

                      <div className="text-stone-100 leading-relaxed font-bold pt-1">
                        {occ.fullAyahText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
