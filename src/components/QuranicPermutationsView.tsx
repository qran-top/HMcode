import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shuffle,
  Search,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Bookmark,
  ExternalLink,
  RotateCcw,
  Square,
  Layers,
  ListFilter,
  Eye,
  SlidersHorizontal,
  History,
  Star,
} from 'lucide-react';
import {
  analyzeWordPermutations,
  QuranicPermutationsAnalysis,
  WordPermutationItem,
  PermutationAyahOccurrence,
  PermutationsProgress,
  cleanWordForPermutations,
  matchArabicStem,
} from '../utils/quranicPermutationsEngine';
import {
  PermutationsWordsHistoryModal,
  PermutationsHistoryWordItem,
} from './PermutationsWordsHistoryModal';
import { useTheme } from '../context/ThemeContext';
import { useHint } from '../context/HintContext';
import { useNotebook } from '../context/NotebookContext';

interface QuranicPermutationsViewProps {
  initialWord?: string;
  isWideMode?: boolean;
  onNavigateToGematria?: (text: string) => void;
}

const FAMOUS_PRESET_WORDS = [
  { word: 'لحم', desc: 'حمل، ملح، حلم، لمح، محل (تقاليب كاملة 100%)' },
  { word: 'علم', desc: 'عمل، لمع، لعم...' },
  { word: 'سفر', desc: 'فسر، فرس...' },
  { word: 'ملك', desc: 'كلم، كمل، لكم...' },
  { word: 'كتب', desc: 'كبت، تبك...' },
  { word: 'رحم', desc: 'حرم، حمر...' },
  { word: 'صبر', desc: 'بصر، ربص...' },
  { word: 'بحر', desc: 'حرب، حبر...' },
  { word: 'نور', desc: 'رون، ونر...' },
  { word: 'قمر', desc: 'رقم، رمق...' },
  { word: 'أمر', desc: 'مأر، رأم...' },
];

export function QuranicPermutationsView({
  initialWord = 'لحم',
  isWideMode = false,
  onNavigateToGematria,
}: QuranicPermutationsViewProps) {
  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint } = useHint();
  const { addEntry } = useNotebook();

  const [inputWord, setInputWord] = useState<string>(initialWord || 'لحم');
  const [matchMode, setMatchMode] = useState<'stem' | 'exact' | 'contains'>('stem');
  const [filterMode, setFilterMode] = useState<'all' | 'quranic_only' | 'dormant_only'>('quranic_only');
  const [sortBy, setSortBy] = useState<'occurrences' | 'alpha' | 'default'>('occurrences');

  // Selected permutation ('all' means show all permutations' ayahs unified)
  const [selectedPermutationKey, setSelectedPermutationKey] = useState<string>('all');
  const [ayahSearchFilter, setAyahSearchFilter] = useState<string>('');

  // Pagination / Display limit so the page remains ultra-fast
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<PermutationsProgress | null>(null);
  const [analysis, setAnalysis] = useState<QuranicPermutationsAnalysis | null>(null);

  // Words History state (persisted in localStorage)
  const [wordsHistory, setWordsHistory] = useState<PermutationsHistoryWordItem[]>(() => {
    try {
      const saved = localStorage.getItem('quranic_permutations_words_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse words history from localStorage:', e);
    }
    return [];
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Add word to history upon analysis
  const addWordToHistory = useCallback(
    (analysisRes: QuranicPermutationsAnalysis, mode: 'stem' | 'exact' | 'contains') => {
      setWordsHistory((prev) => {
        const existing = prev.find((item) => item.word === analysisRes.originalWord);
        const isFav = existing?.isFavorite ?? false;

        const newItem: PermutationsHistoryWordItem = {
          id: `${analysisRes.originalWord}_${Date.now()}`,
          word: analysisRes.originalWord,
          timestamp: Date.now(),
          matchMode: mode,
          totalPermutations: analysisRes.totalPossiblePermutations,
          quranicCount: analysisRes.quranicPermutationsCount,
          occurrencesCount: analysisRes.totalOccurrencesCount,
          versesCount: analysisRes.totalVersesCount,
          gematria: analysisRes.sharedGematria.standard,
          isFavorite: isFav,
        };

        const filtered = prev.filter((item) => item.word !== analysisRes.originalWord);
        const updated = [newItem, ...filtered].slice(0, 60);
        try {
          localStorage.setItem('quranic_permutations_words_history', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    []
  );

  const toggleFavoriteHistoryItem = useCallback((id: string) => {
    setWordsHistory((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      try {
        localStorage.setItem('quranic_permutations_words_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    setWordsHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('quranic_permutations_words_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setWordsHistory([]);
    try {
      localStorage.removeItem('quranic_permutations_words_history');
    } catch {}
  }, []);

  // Copy states & saved states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedPermutations, setSavedPermutations] = useState<Set<string>>(new Set());

  const abortControllerRef = useRef<AbortController | null>(null);

  // Run analysis for a given word
  const executeAnalysis = useCallback(
    async (wordToAnalyze: string, mode: 'stem' | 'exact' | 'contains') => {
      const clean = cleanWordForPermutations(wordToAnalyze);
      if (!clean) {
        setAnalysis(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setDisplayLimit(30);
      setProgress({
        percent: 5,
        phase: 'permuting',
        message: 'جاري فحص وتوليد التباديل الرياضية...',
        scannedAyahs: 0,
        totalAyahs: 6236,
        foundMatchesCount: 0,
      });

      try {
        const res = await analyzeWordPermutations(clean, {
          matchMode: mode,
          onProgress: (p) => setProgress(p),
          abortSignal: controller.signal,
        });

        if (!controller.signal.aborted && res) {
          setAnalysis(res);
          // Default to 'all' so user sees the complete view of all permutations immediately
          setSelectedPermutationKey('all');
          // Add to words history
          addWordToHistory(res, mode);
        }
      } catch (e) {
        console.error('Error analyzing permutations:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [addWordToHistory]
  );

  // Initial load
  useEffect(() => {
    executeAnalysis(inputWord, matchMode);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playDosBeep) playDosBeep(850, 30);
    executeAnalysis(inputWord, matchMode);
  };

  // Filtered & sorted list of permutation items
  const displayedPermutationPills = useMemo(() => {
    if (!analysis) return [];
    let list = [...analysis.permutations];

    if (filterMode === 'quranic_only') {
      list = list.filter((p) => p.isQuranic);
    } else if (filterMode === 'dormant_only') {
      list = list.filter((p) => !p.isQuranic);
    }

    if (sortBy === 'occurrences') {
      list.sort((a, b) => {
        if (b.allOccurrencesCount !== a.allOccurrencesCount) {
          return b.allOccurrencesCount - a.allOccurrencesCount;
        }
        return a.permutation.localeCompare(b.permutation);
      });
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.permutation.localeCompare(b.permutation));
    }

    return list;
  }, [analysis, filterMode, sortBy]);

  // Aggregate Ayah items to display in full-page list
  const allFilteredAyahs = useMemo(() => {
    if (!analysis) return [];

    let rawList: Array<{
      permutation: string;
      surahNumber: number;
      surahName: string;
      ayahNumber: number;
      ayahText: string;
      matchedWords: string[];
      isExact: boolean;
      quranUrl: string;
    }> = [];

    if (selectedPermutationKey === 'all') {
      // Gather from all Quranic permutations
      for (const p of analysis.permutations) {
        if (!p.isQuranic) continue;
        for (const occ of p.occurrences) {
          rawList.push({
            permutation: p.permutation,
            ...occ,
          });
        }
      }
    } else {
      const p = analysis.permutations.find((item) => item.permutation === selectedPermutationKey);
      if (p) {
        for (const occ of p.occurrences) {
          rawList.push({
            permutation: p.permutation,
            ...occ,
          });
        }
      }
    }

    // Optional text filter inside verses
    const q = ayahSearchFilter.trim();
    if (q) {
      rawList = rawList.filter(
        (o) =>
          o.ayahText.includes(q) ||
          o.surahName.includes(q) ||
          o.permutation.includes(q) ||
          String(o.ayahNumber) === q
      );
    }

    return rawList;
  }, [analysis, selectedPermutationKey, ayahSearchFilter]);

  const displayedAyahs = useMemo(() => {
    return allFilteredAyahs.slice(0, displayLimit);
  }, [allFilteredAyahs, displayLimit]);

  // Copy helper
  const handleCopyAyah = (o: {
    surahName: string;
    ayahNumber: number;
    ayahText: string;
    permutation: string;
  }, key: string) => {
    const text = `«${o.ayahText}» [سورة ${o.surahName}: ${o.ayahNumber}] (تقليبة: ${o.permutation})`;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    if (playDosBeep) playDosBeep(920, 25);
  };

  const handleSavePermutationToNotebook = (p: WordPermutationItem) => {
    if (analysis) {
      addEntry(
        p.permutation,
        `تقليبة [${analysis.originalWord}] | جُمّل = ${analysis.sharedGematria.standard}`,
        {
          type: 'quranic',
          systemName: 'تقاليب الأحرف القرآنية',
          note: `التقليبة القرآنية للكلمة «${analysis.originalWord}»: [${p.permutation}] واردة في ${p.allOccurrencesCount} موضعاً في القرآن الكريم عبر ${p.surahsCount} سورة. الجُمّل = ${analysis.sharedGematria.standard}.`,
        }
      );
      setSavedPermutations((prev) => new Set(prev).add(p.permutation));
      if (playDosBeep) playDosBeep(950, 40);
    }
  };

  // Helper to highlight matching permutation words inside an Ayah
  const renderHighlightedAyah = (ayahText: string, targetPermutation: string) => {
    const tokens = ayahText.split(/\s+/);
    return (
      <span>
        {tokens.map((token, idx) => {
          const matchResult = matchArabicStem(token, targetPermutation, matchMode);
          const isMatch = matchResult.isMatch;
          if (isMatch) {
            return (
              <span
                key={idx}
                className="bg-[#ffff55] text-black font-black px-1.5 py-0.2 rounded mx-0.5 shadow-2xs font-bold"
                title={`الكلمة المطابقة للتقليبة [${targetPermutation}]: ${token}`}
              >
                {token}{' '}
              </span>
            );
          }
          return <span key={idx}>{token} </span>;
        })}
      </span>
    );
  };

  return (
    <div
      className={`${isWideMode ? 'max-w-full px-0 sm:px-1' : 'max-w-6xl mx-auto'} space-y-2.5 sm:space-y-3 w-full font-mono transition-all`}
      dir="rtl"
    >
      {/* 1. TOP RETRO DOS CONTROL & SEARCH CARD (Same compact style as السلاسل) */}
      <div
        style={{
          backgroundColor: 'var(--dos-panel, #000088)',
          borderColor: 'var(--dos-border, #00aaaa)',
        }}
        className="border-2 p-2.5 sm:p-3 shadow-md space-y-2 text-white"
      >
        {/* DOS Scanner Progress Bar if running */}
        {isLoading && progress ? (
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-[var(--dos-border)] pb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#ffff55] text-black px-2 py-0.5 text-xs font-black shadow-xs">
                  [TAQALEEB SCANNER]
                </span>
                <span className="text-[#55ffff] font-bold text-xs sm:text-sm">
                  {progress.message}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#55ff55] font-black text-sm sm:text-base">
                  {progress.percent}%
                </span>
                <button
                  type="button"
                  onClick={handleStopSearch}
                  className="px-2 py-0.5 bg-[#aa0000] text-white hover:bg-[#ff5555] font-black border border-white cursor-pointer text-xs"
                >
                  [ESC إلغاء]
                </button>
              </div>
            </div>

            {/* ASCII Progress Bar */}
            <div className="bg-black/90 p-2 border border-[var(--dos-border)] text-center shadow-inner">
              <div className="text-xs sm:text-sm tracking-widest font-mono font-black break-all dir-ltr text-center select-none">
                {(() => {
                  const totalBlocks = 32;
                  const filledBlocks = Math.min(
                    totalBlocks,
                    Math.max(1, Math.round((progress.percent / 100) * totalBlocks))
                  );
                  const emptyBlocks = totalBlocks - filledBlocks;
                  return (
                    <span>
                      <span className="text-white">[</span>
                      <span className="text-[#55ff55]">{'█'.repeat(filledBlocks)}</span>
                      <span className="text-[#004422]">{'░'.repeat(emptyBlocks)}</span>
                      <span className="text-white">]</span>
                      <span className="text-[#ffff55] mr-2"> {progress.percent}%</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between text-2xs text-[#ffff55] font-mono">
              <span>الآيات المفحوصة: {progress.scannedAyahs} / 6236</span>
              <span className="text-[#55ff55]">المطابقات: {progress.foundMatchesCount}</span>
            </div>
          </div>
        ) : (
          /* Header Info & Breakdown Line */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--dos-border)] pb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#00aaaa] text-black px-1.5 py-0.5 font-black text-xs shadow-xs">
                [►]
              </span>
              <span className="text-[#ffff55] font-black text-sm sm:text-base tracking-wide font-mono">
                {analysis ? `تقاليب كلمة «${analysis.originalWord}» في القرآن الكريم` : 'تباديل الحروف والتقاليب القرآنية'}
              </span>
              <span className="text-3xs text-[#55ffff] bg-black/60 px-1.5 py-0.5 border border-[#00aaaa]/50 hidden sm:inline">
                C:\QURAN\TAQALEEB.EXE
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Words History Button */}
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(true);
                  if (playDosBeep) playDosBeep(850, 25);
                }}
                className="px-2 py-0.5 bg-[#00aaaa] hover:bg-[#55ffff] text-black font-bold text-2xs border border-white cursor-pointer active:translate-y-0.5 transition-none inline-flex items-center gap-1 shrink-0 shadow-xs"
                title="فتح سجل الكلمات والتقاليب السابقة والمفضلة"
              >
                <History className="w-3.5 h-3.5" />
                <span>[سجل الكلمات: {wordsHistory.length}]</span>
              </button>

              {/* Compact Letters & Gematria Breakdown (Same as السلاسل) */}
              {analysis && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/70 border border-[#00aaaa] text-2xs font-mono flex-wrap self-start sm:self-auto shadow-2xs">
                  <div className="flex items-center gap-1">
                    {analysis.cleanLetters.map((c, i) => (
                      <span
                        key={i}
                        className="bg-[#002244] border border-[#55ffff]/60 text-[#55ff55] px-1 font-bold text-3xs font-quran"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <span className="text-stone-500">|</span>
                  <span className="text-[#ffff55] font-bold">
                    الجُمّل: {analysis.sharedGematria.standard}
                  </span>
                  <span className="text-stone-500">|</span>
                  <span className="text-[#55ffff]">
                    صرقم 1: {analysis.sharedGematria.srqm1}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Form with Match Mode Selectors (Clean Single Line) */}
        <form onSubmit={handleSearchSubmit} className="space-y-2 pt-1">
          <div className="flex items-stretch gap-1.5 flex-col sm:flex-row">
            {/* Input field with DOS prompt styling */}
            <div className="relative flex-1 flex items-center bg-black border border-[#00aaaa] px-2 py-1 shadow-inner focus-within:border-[#ffff55]">
              <span className="text-[#55ffff] text-2xs font-mono pl-1.5 select-none shrink-0 font-bold">
                C:\&gt;
              </span>
              <input
                type="text"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder="اكتب كلمة لتوليد تقاليبها وفحصها بالمصحف (مثل: لحم، علم، سفر، ملك)..."
                className="w-full bg-transparent text-[#ffff55] text-xs sm:text-sm font-bold font-quran focus:outline-none placeholder:text-stone-500"
              />
              {inputWord && (
                <button
                  type="button"
                  onClick={() => setInputWord('')}
                  className="text-stone-400 hover:text-white text-3xs font-mono px-1 cursor-pointer"
                >
                  [مسح]
                </button>
              )}
            </div>

            {/* Match Mode Pills */}
            <div className="flex items-center gap-1 bg-black/80 border border-[#00aaaa] p-0.5 shrink-0 text-3xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMatchMode('stem');
                  executeAnalysis(inputWord, 'stem');
                }}
                className={`px-2 py-0.5 cursor-pointer transition-none ${
                  matchMode === 'stem'
                    ? 'bg-[#ffff55] text-black font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="جذع ومشتقات: مطابقة الكلمة مع الزوائد والسوابق واللواحق (لحماً، تحمله، محله...)"
              >
                جذع ومشتقات
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchMode('exact');
                  executeAnalysis(inputWord, 'exact');
                }}
                className={`px-2 py-0.5 cursor-pointer transition-none ${
                  matchMode === 'exact'
                    ? 'bg-[#ffff55] text-black font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="مجرد تام: مطابقة الكلمة بصيغتها المجردة فقط"
              >
                مجرد تام
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchMode('contains');
                  executeAnalysis(inputWord, 'contains');
                }}
                className={`px-2 py-0.5 cursor-pointer transition-none ${
                  matchMode === 'contains'
                    ? 'bg-[#ffff55] text-black font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="شامل: الكلمات المحتوية على تسلسل الحروف"
              >
                شامل
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!inputWord.trim() || isLoading}
              className="px-3 py-1 bg-[#ffff55] hover:bg-white text-black font-black text-xs border border-white cursor-pointer active:translate-y-0.5 disabled:opacity-50 shrink-0 inline-flex items-center justify-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>فحص التقاليب</span>
            </button>
          </div>

          {/* Quick Preset Words Chips (Compact single line) */}
          <div className="flex items-center gap-1 flex-wrap text-3xs text-stone-300 pt-0.5">
            <span className="text-[#ffff55] font-bold shrink-0">أمثلة سريعة:</span>
            {FAMOUS_PRESET_WORDS.map((item) => (
              <button
                key={item.word}
                type="button"
                onClick={() => {
                  setInputWord(item.word);
                  if (playDosBeep) playDosBeep(800, 20);
                  executeAnalysis(item.word, matchMode);
                }}
                className={`px-1.5 py-0.2 border cursor-pointer font-bold font-quran text-2xs transition-none ${
                  inputWord.trim() === item.word
                    ? 'bg-[#ffff55] text-black border-white font-black'
                    : 'bg-black/60 text-stone-200 border-[#00aaaa]/70 hover:bg-[#00aaaa] hover:text-black'
                }`}
                title={`فحص تقاليب «${item.word}»: ${item.desc}`}
              >
                {item.word}
              </button>
            ))}
          </div>

          {/* Quick Words History Chips */}
          {wordsHistory.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap text-3xs text-stone-300 pt-1 border-t border-white/10">
              <span className="text-[#55ff55] font-bold shrink-0 flex items-center gap-1">
                <History className="w-3 h-3 text-[#55ff55]" />
                سجل الكلمات المفحوصة:
              </span>
              {wordsHistory.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setInputWord(item.word);
                    setMatchMode(item.matchMode);
                    if (playDosBeep) playDosBeep(800, 20);
                    executeAnalysis(item.word, item.matchMode);
                  }}
                  className={`px-1.5 py-0.2 border cursor-pointer font-bold font-quran text-2xs transition-none inline-flex items-center gap-1 ${
                    inputWord.trim() === item.word
                      ? 'bg-[#55ff55] text-black border-white font-black'
                      : 'bg-black/70 text-stone-200 border-[#00aaaa] hover:bg-[#00aaaa] hover:text-black'
                  }`}
                  title={`كلمة «${item.word}»: وارد بالمصحف ${item.quranicCount}/${item.totalPermutations} (${item.occurrencesCount} موضعاً)`}
                >
                  <span>{item.word}</span>
                  {item.isFavorite && <span className="text-amber-400 text-3xs">★</span>}
                  <span className="text-4xs font-mono opacity-80">
                    ({item.quranicCount}/{item.totalPermutations})
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(true);
                  if (playDosBeep) playDosBeep(850, 25);
                }}
                className="text-[#ffff55] hover:underline font-bold text-3xs pr-1 cursor-pointer"
              >
                [عرض السجل بالكامل ({wordsHistory.length})]
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 2. COMPACT PERMUTATIONS SELECTOR & STATS BAR (Like Surah filter pills in السلاسل) */}
      {analysis && (
        <div
          style={{
            backgroundColor: 'var(--dos-panel, #000088)',
            borderColor: 'var(--dos-border, #00aaaa)',
          }}
          className="border-2 p-2 sm:p-2.5 shadow-md space-y-2 text-white"
        >
          {/* Top Line: Compact Statistics Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--dos-border)]/40 pb-1.5 text-2xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#ffff55] font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#ffff55]" />
                <span>إحصاء التقاليب:</span>
              </span>
              <span className="bg-black/60 px-1.5 py-0.2 border border-stone-600 text-white">
                الممكنة: <strong className="text-[#ffff55]">{analysis.totalPossiblePermutations}</strong>
              </span>
              <span className="bg-[#003300] px-1.5 py-0.2 border border-[#55ff55] text-[#55ff55]">
                الواردة بالمصحف: <strong>{analysis.quranicPermutationsCount}</strong> ({Math.round((analysis.quranicPermutationsCount / analysis.totalPossiblePermutations) * 100)}%)
              </span>
              {analysis.dormantPermutationsCount > 0 && (
                <span className="bg-black/60 px-1.5 py-0.2 border border-stone-700 text-stone-400">
                  المهمل: <strong>{analysis.dormantPermutationsCount}</strong>
                </span>
              )}
              <span className="bg-black/60 px-1.5 py-0.2 border border-[#ffff55]/50 text-[#ffff55]">
                الآيات: <strong>{analysis.totalVersesCount}</strong> آية (<strong>{analysis.totalOccurrencesCount}</strong> لفظ)
              </span>
            </div>

            {/* Quick Text Filter inside Ayahs */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={ayahSearchFilter}
                onChange={(e) => setAyahSearchFilter(e.target.value)}
                placeholder="تصفية الآيات باسم السورة أو النص..."
                className="bg-black text-[#ffff55] border border-[#00aaaa] px-2 py-0.5 text-3xs rounded-none w-44 sm:w-56 focus:outline-none focus:border-[#ffff55] placeholder:text-stone-500 font-sans"
              />
              {ayahSearchFilter && (
                <button
                  type="button"
                  onClick={() => setAyahSearchFilter('')}
                  className="text-stone-400 hover:text-white text-3xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Permutation Pills Row (Like the clickable Surah Pills in السلاسل) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-3xs text-stone-300 font-bold shrink-0">عرض الشواهد:</span>

            {/* 'All' button */}
            <button
              type="button"
              onClick={() => {
                setSelectedPermutationKey('all');
                setDisplayLimit(30);
                if (playDosBeep) playDosBeep(850, 20);
              }}
              className={`px-2 py-0.5 text-2xs font-bold border cursor-pointer transition-none flex items-center gap-1 shadow-2xs ${
                selectedPermutationKey === 'all'
                  ? 'bg-[#ffff55] text-black border-white font-black'
                  : 'bg-black/70 text-stone-200 border-[#00aaaa] hover:bg-[#00aaaa] hover:text-black'
              }`}
              title="عرض كافة الشواهد والآيات لجميع التقاليب معاً"
            >
              <span>[كل التقاليب الواردة ({analysis.quranicPermutationsCount})]</span>
              <span className="text-3xs opacity-80">({analysis.totalOccurrencesCount} موضع)</span>
            </button>

            {/* Individual Permutation Pills */}
            {displayedPermutationPills.map((p) => {
              const isSelected = selectedPermutationKey === p.permutation;
              const isSaved = savedPermutations.has(p.permutation);

              return (
                <button
                  key={p.permutation}
                  type="button"
                  onClick={() => {
                    setSelectedPermutationKey(p.permutation);
                    setDisplayLimit(30);
                    if (playDosBeep) playDosBeep(900, 20);
                  }}
                  className={`px-2 py-0.5 text-2xs border cursor-pointer transition-none flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-amber-400 text-black border-white font-black ring-1 ring-white'
                      : p.isQuranic
                      ? 'bg-[#000088] text-white border-[#00aaaa] hover:bg-[#00aaaa] hover:text-black'
                      : 'bg-black/60 text-stone-400 border-stone-800 opacity-60'
                  }`}
                  title={`تقليبة «${p.permutation}»: ${
                    p.isQuranic ? `${p.allOccurrencesCount} موضعاً في ${p.surahsCount} سورة` : 'غير واردة بالمصحف'
                  }`}
                >
                  <span className="font-quran text-sm font-bold">«{p.permutation}»</span>
                  {p.isOriginal && (
                    <span className="text-4xs bg-[#ffff55] text-black font-black px-1 py-0.1">
                      الأصل
                    </span>
                  )}
                  {p.isQuranic ? (
                    <span
                      className={`text-3xs font-mono font-bold px-1 py-0.1 ${
                        isSelected ? 'bg-black text-[#55ff55]' : 'bg-[#003300] text-[#55ff55] border border-[#55ff55]/40'
                      }`}
                    >
                      {p.allOccurrencesCount}م
                    </span>
                  ) : (
                    <span className="text-4xs text-stone-400">مهمل</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FULL-PAGE VERSES LIST (NO NESTED SCROLLING BOX - Flows directly on the page!) */}
      {analysis && (
        <div className="space-y-1.5 w-full">
          {/* Header of results counter */}
          <div className="flex items-center justify-between px-1 text-2xs text-[#ffff55] font-bold border-b border-[var(--dos-border)]/50 pb-1">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#ffff55]" />
              <span>
                {selectedPermutationKey === 'all'
                  ? `كافة الشواهد القرآنية لتقاليب «${analysis.originalWord}» (${allFilteredAyahs.length} موضع):`
                  : `شواهد التقليبة «${selectedPermutationKey}» في المصحف الشريف (${allFilteredAyahs.length} موضع):`}
              </span>
            </div>
            <span className="text-3xs text-stone-400 font-mono">
              عرض {displayedAyahs.length} من {allFilteredAyahs.length}
            </span>
          </div>

          {/* Results rows (exact same compact, clean DOS style as السلاسل) */}
          {displayedAyahs.length > 0 ? (
            <div className="space-y-1.5 w-full">
              {displayedAyahs.map((o, idx) => {
                const ayahKey = `${o.permutation}_${o.surahNumber}_${o.ayahNumber}_${idx}`;
                const isCopied = copiedKey === ayahKey;

                return (
                  <div
                    key={ayahKey}
                    style={{
                      backgroundColor: 'var(--dos-panel, #000088)',
                      borderColor: 'var(--dos-border, #00aaaa)',
                    }}
                    className="px-2.5 py-2 border shadow-2xs select-none group flex flex-col justify-center gap-1.5 transition-none hover:border-[#ffff55]"
                  >
                    {/* Compact Top Row: Sequence, Permutation Tag, Surah:Ayah, and Actions */}
                    <div className="flex items-center justify-between gap-1.5 w-full border-b border-white/10 pb-1 text-2xs">
                      {/* Right side: Surah and Ayah info */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                        <span className="bg-[#00aaaa] text-black px-1.5 py-0.2 font-mono font-bold text-3xs shrink-0">
                          #{idx + 1}
                        </span>

                        <span className="bg-[#ffff55] text-black font-black px-1.5 py-0.2 font-quran text-xs shrink-0">
                          «{o.permutation}»
                        </span>

                        <span className="font-bold text-[#55ffff] font-sans flex items-center gap-1 shrink-0">
                          <span>سورة {o.surahName}</span>
                          <span className="font-mono text-stone-300">({o.surahNumber}:{o.ayahNumber})</span>
                        </span>

                        {o.isExact && (
                          <span className="text-4xs bg-[#00e676] text-black font-black px-1 py-0.2 shrink-0">
                            ★ مطابقة تامة
                          </span>
                        )}
                      </div>

                      {/* Left side: Copy & Mushaf Link */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyAyah(o, ayahKey)}
                          className="px-1.5 py-0.5 bg-black/80 hover:bg-white hover:text-black text-stone-300 border border-stone-600 text-3xs font-bold inline-flex items-center gap-0.5 cursor-pointer"
                          title="نسخ الآية الكريمة"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-[#55ff55]" />
                              <span className="text-[#55ff55]">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>

                        <a
                          href={o.quranUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 bg-black/80 hover:bg-white hover:text-black text-stone-300 border border-stone-600 text-3xs font-bold inline-flex items-center gap-0.5 cursor-pointer"
                          title="فتح في موقع المصحف الشريف والتفاسير"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>المصحف</span>
                        </a>
                      </div>
                    </div>

                    {/* Ayah Text in clean Quranic Font with highlighted matched word */}
                    <div className="text-xs sm:text-sm font-quran leading-loose text-stone-100 pr-1">
                      {renderHighlightedAyah(o.ayahText, o.permutation)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center bg-black/60 border border-stone-700 text-stone-400 text-xs">
              {ayahSearchFilter
                ? 'لا توجد شواهد مطابقة لشرط التصفية المحدد.'
                : 'هذه التقليبة لم ترد في القرآن الكريم (من التراكيب المهملة قرآنياً).'}
            </div>
          )}

          {/* Show More Pagination Button if items exceed displayLimit */}
          {allFilteredAyahs.length > displayLimit && (
            <div className="text-center pt-2 pb-6">
              <button
                type="button"
                onClick={() => {
                  setDisplayLimit((prev) => Math.min(allFilteredAyahs.length, prev + 30));
                  if (playDosBeep) playDosBeep(880, 20);
                }}
                className="px-4 py-1.5 bg-[#ffff55] hover:bg-white text-black font-black text-xs border border-white cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <span>[عرض المزيد +30 (المتبقي: {allFilteredAyahs.length - displayLimit})]</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayLimit(allFilteredAyahs.length);
                  if (playDosBeep) playDosBeep(920, 30);
                }}
                className="px-3 py-1.5 mr-2 bg-black hover:bg-stone-800 text-[#55ffff] font-bold text-xs border border-[#55ffff] cursor-pointer"
              >
                [عرض الكل ({allFilteredAyahs.length})]
              </button>
            </div>
          )}
        </div>
      )}

      {/* Words History Modal */}
      <PermutationsWordsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        items={wordsHistory}
        onSelectWord={(word, mode) => {
          setInputWord(word);
          setMatchMode(mode);
          executeAnalysis(word, mode);
        }}
        onToggleFavorite={toggleFavoriteHistoryItem}
        onDeleteItem={deleteHistoryItem}
        onClearHistory={clearHistory}
      />
    </div>
  );
}

export default QuranicPermutationsView;
