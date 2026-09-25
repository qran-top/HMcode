import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNotebook } from '../context/NotebookContext';
import { useGematria, ARABIC_28_CANONICAL, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
import { NOORANI_LETTERS_SET, findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import { getQuranTopWordUrl, getQuranTopSearchUrl, getArabicDictSearchUrl } from '../utils/quranicDictionary';
import {
  parseNumericQuery,
  normalizeArabicDigits,
  GematriaCalculationOptions,
  findNooraniCombinations,
  NooraniFormulaMatch,
  AUTHENTIC_QURANIC_FAWATIH,
} from '../utils/gematriaEngine';
import { AddToNotebookButton } from './AddToNotebookButton';
import {
  Calculator,
  Search,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Hash,
  Sparkles,
  Layers,
  X,
  Loader2,
  TableProperties,
  ArrowRightLeft,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Settings2,
  History,
  Globe,
  Languages,
  Square,
  Play,
  ChevronsDown,
} from 'lucide-react';

interface GematriaViewProps {
  initialText?: string;
  onNavigateToDual?: (text: string) => void;
}

const EXAMPLE_PHRASES = ['سلام', 'كهيعص', 'الحمد لله', 'نور', 'علم', 'قرآن', 'حكيم', 'صراط', 'الرحمن', 'طه'];
const EXAMPLE_NUMBERS = [66, 92, 100, 114, 131, 140, 256, 300, 786];

const BATCH_SIZE = 160; // Initial first page size
const LOAD_MORE_STEP = 240; // Number of items loaded per "pull down / load more" action

export function GematriaView({ initialText, onNavigateToDual }: GematriaViewProps) {
  const {
    tables,
    activeTableId,
    activeTable,
    calculationOptions,
    updateCalculationOptions,
    setActiveTableId,
    addCustomTable,
    updateTable,
    deleteTable,
    resetToDefaults,
    calculateWordGematria,
    getLetterBreakdown,
    findQuranicMatches,
    findArabicMatches,
    synthesizeNonArabicPossibilities,
  } = useGematria();

  // Mode: 'calculator' (حساب ومطابقة القرآن) | 'tables_manager' (إدارة وتعديل جداول الجُمَّل)
  const [activeTab, setActiveTab] = useState<'calculator' | 'tables_manager'>('calculator');
  const [showOptionsPanel, setShowOptionsPanel] = useState<boolean>(false);

  // Search input states - manual button/enter triggered for snappy execution
  const [searchInput, setSearchInput] = useState<string>(initialText || '');
  const [committedQuery, setCommittedQuery] = useState<string>(initialText || '');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter for matching results: 'all' | 'quranic' | 'noorani' | 'arabic' | 'non_arabic'
  const [quranFilter, setQuranFilter] = useState<'all' | 'quranic' | 'noorani' | 'arabic' | 'non_arabic'>('quranic');
  const [resultsSearchQuery, setResultsSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Progressive batch rendering state
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [isGridFoldOpen, setIsGridFoldOpen] = useState<boolean>(false);
  const [calcProgress, setCalcProgress] = useState<number>(100);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const batchTimeoutRef = useRef<number | null>(null);

  // Table Management UI State
  const [selectedTableForEditId, setSelectedTableForEditId] = useState<string>(activeTableId);
  const [editingValues, setEditingValues] = useState<Record<string, number>>({});
  const [editingName, setEditingName] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableTemplate, setNewTableTemplate] = useState<'mashriqi' | 'maghribi'>('mashriqi');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync initialText if passed from parent
  useEffect(() => {
    if (initialText) {
      setSearchInput(initialText);
      setCommittedQuery(initialText);
      setActiveTab('calculator');
    }
  }, [initialText]);

  // Sync editing values when selected table changes
  const tableUnderEdit = useMemo(() => {
    return tables.find((t) => t.id === selectedTableForEditId) || activeTable;
  }, [tables, selectedTableForEditId, activeTable]);

  useEffect(() => {
    if (tableUnderEdit) {
      setEditingValues({ ...tableUnderEdit.values });
      setEditingName(tableUnderEdit.name);
      setEditingDescription(tableUnderEdit.description || '');
    }
  }, [tableUnderEdit]);

  const executeSearch = (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchInput).trim();
    if (queryToSearch !== undefined) {
      setSearchInput(queryToSearch);
    }
    setCommittedQuery(q);
  };

  // Check if committed query is direct number (supports Eastern Arabic ٠-٩ and ASCII 0-9)
  const numericQueryResult = useMemo(() => {
    return parseNumericQuery(committedQuery);
  }, [committedQuery]);

  const isDirectNumber = numericQueryResult.isNumber;

  // Calculate total Gematria value based on active Gematria table and options
  const targetNumber = useMemo(() => {
    if (isDirectNumber) {
      return numericQueryResult.value;
    }
    return calculateWordGematria(committedQuery);
  }, [committedQuery, isDirectNumber, numericQueryResult, calculateWordGematria]);

  // History log: سجل الحساب (الكلمة = المجموع الكلي)
  const [history, setHistory] = useState<Array<{ id: string; word: string; total: number }>>(() => {
    try {
      const saved = localStorage.getItem('gematria_history_log_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  // Automatically update history when a word calculation is committed
  useEffect(() => {
    if (!committedQuery || !committedQuery.trim() || isDirectNumber || targetNumber <= 0) return;
    const word = committedQuery.trim();
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.word !== word);
      const updated = [{ id: `${word}_${Date.now()}`, word, total: targetNumber }, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('gematria_history_log_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [committedQuery, isDirectNumber, targetNumber]);

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('gematria_history_log_v1');
    } catch {}
  };

  const removeHistoryItem = (e: React.MouseEvent, wordToRemove: string) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.word !== wordToRemove);
      try {
        localStorage.setItem('gematria_history_log_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Detailed breakdown of each letter in the word
  const letterBreakdown = useMemo(() => {
    if (isDirectNumber || !committedQuery.trim()) return [];
    return getLetterBreakdown(committedQuery);
  }, [committedQuery, isDirectNumber, getLetterBreakdown]);

  // Statistics on letters
  const stats = useMemo(() => {
    const totalLetters = letterBreakdown.length;
    const nooraniLettersCount = letterBreakdown.filter((l) => l.isNoorani).length;
    const nonNooraniLettersCount = totalLetters - nooraniLettersCount;
    const nooraniPercentage = totalLetters > 0 ? Math.round((nooraniLettersCount / totalLetters) * 100) : 0;

    return {
      totalLetters,
      nooraniLettersCount,
      nonNooraniLettersCount,
      nooraniPercentage,
    };
  }, [letterBreakdown]);

  // Progressive asynchronous matches calculation state
  const [allQuranicMatches, setAllQuranicMatches] = useState<any[]>([]);
  const [arabicLexiconMatches, setArabicLexiconMatches] = useState<any[]>([]);
  const [nonArabicPossibilities, setNonArabicPossibilities] = useState<any[]>([]);
  const [nooraniFormulasMatches, setNooraniFormulasMatches] = useState<NooraniFormulaMatch[]>([]);
  const [uniqueNooraniOnly, setUniqueNooraniOnly] = useState<boolean>(false);
  const [calcStatusText, setCalcStatusText] = useState<string>('');
  const calcTimerRef = useRef<any>(null);

  // Asynchronous progressive calculation pipeline to prevent any browser freezing
  useEffect(() => {
    if (calcTimerRef.current) {
      clearTimeout(calcTimerRef.current);
    }

    if (!targetNumber || targetNumber <= 0) {
      setAllQuranicMatches([]);
      setArabicLexiconMatches([]);
      setNonArabicPossibilities([]);
      setNooraniFormulasMatches([]);
      setIsCalculating(false);
      setCalcProgress(100);
      setCalcStatusText('');
      return;
    }

    setIsCalculating(true);
    setCalcProgress(20);
    setCalcStatusText('جاري مطابقة المفردات القرآنية والصيغ النورانية...');

    // Phase 1: Immediate Quranic Matches & Noorani Formulas (<1ms)
    try {
      const quranic = findQuranicMatches(targetNumber, {
        filterType: 'all',
        maxResults: 500,
      });
      setAllQuranicMatches(quranic);

      // Extract Noorani-only letter combinations ordered as close to Fawatih as possible
      const noorani = findNooraniCombinations(targetNumber, activeTable.values, {
        maxResults: 150,
        uniqueLettersOnly: uniqueNooraniOnly,
      });
      setNooraniFormulasMatches(noorani);
    } catch (e) {
      console.error(e);
    }

    // Phase 2: Lexicon matches on next animation frame / tick
    calcTimerRef.current = setTimeout(() => {
      setCalcProgress(55);
      setCalcStatusText('جاري البحث في المعاجم اللغوية العربية...');

      try {
        const arabic = findArabicMatches(targetNumber, {
          maxResults: 600,
        });
        setArabicLexiconMatches(arabic);
      } catch (e) {
        console.error(e);
      }

      // Phase 3: Letter combination synthesis with phonotactic checks
      calcTimerRef.current = setTimeout(() => {
        setCalcProgress(85);
        setCalcStatusText('جاري توليد التراكيب وفحص الممنوعات الصوتية...');

        try {
          const nonArabic = synthesizeNonArabicPossibilities(targetNumber, {
            maxResults: 1500,
          });
          setNonArabicPossibilities(nonArabic);
        } catch (e) {
          console.error(e);
        }

        calcTimerRef.current = setTimeout(() => {
          setCalcProgress(100);
          setIsCalculating(false);
          setCalcStatusText('');
        }, 30);
      }, 25);
    }, 15);

    return () => {
      if (calcTimerRef.current) {
        clearTimeout(calcTimerRef.current);
      }
    };
  }, [targetNumber, activeTable.values, uniqueNooraniOnly, findQuranicMatches, findArabicMatches, synthesizeNonArabicPossibilities]);

  // Noorani combinations converted to SynthesizedTextResult for unified display
  const nooraniSynthesizedMatches = useMemo(() => {
    return nooraniFormulasMatches.map((m) => ({
      text: m.formula,
      value: m.sum,
      letterCount: m.letters.length,
      letters: m.letters,
      isQuranic: m.isAuthenticQuranicFawatih,
      isLexical: false,
      quranicMeta: m.isAuthenticQuranicFawatih
        ? {
            surahName: m.surahs?.join('، ') || 'فاتحة قرآنية',
            surahNumber: 0,
            ayahNum: 1,
            isExactMatch: true,
            meaning: m.description,
          }
        : undefined,
      isNooraniOnly: true,
    }));
  }, [nooraniFormulasMatches]);

  // Combined all words (Quranic + general Arabic + letter combinations)
  const allCombinedMatches = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    for (const item of nooraniSynthesizedMatches) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        list.push(item);
      }
    }

    for (const item of allQuranicMatches) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        list.push(item);
      }
    }

    for (const item of arabicLexiconMatches) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        list.push(item);
      }
    }

    for (const item of nonArabicPossibilities) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        list.push(item);
      }
    }

    return list;
  }, [nooraniSynthesizedMatches, allQuranicMatches, arabicLexiconMatches, nonArabicPossibilities]);

  // Visible matches based on selected tab filter and optional search query
  const displayedMatches = useMemo(() => {
    let baseList = allCombinedMatches;
    if (quranFilter === 'quranic') baseList = allQuranicMatches;
    else if (quranFilter === 'noorani') baseList = nooraniSynthesizedMatches;
    else if (quranFilter === 'arabic') baseList = arabicLexiconMatches;
    else if (quranFilter === 'non_arabic') baseList = nonArabicPossibilities;

    if (!resultsSearchQuery.trim()) {
      return baseList;
    }

    const query = resultsSearchQuery.trim().toLowerCase();
    return baseList.filter((item) => {
      if (item.text.toLowerCase().includes(query)) return true;
      if (item.letters.some((c: string) => c.includes(query))) return true;
      if (item.quranicMeta?.surahName?.includes(query)) return true;
      if (String(item.quranicMeta?.ayahNum) === query) return true;
      return false;
    });
  }, [
    quranFilter,
    resultsSearchQuery,
    allQuranicMatches,
    nooraniSynthesizedMatches,
    arabicLexiconMatches,
    nonArabicPossibilities,
    allCombinedMatches,
  ]);

  // Initial page size setting on query/filter changes
  useEffect(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    setIsCancelled(false);
    setIsGeneratingBatch(false);
    setVisibleCount(Math.min(BATCH_SIZE, displayedMatches.length));
  }, [targetNumber, quranFilter, resultsSearchQuery, displayedMatches.length]);

  const handleLoadNextBatch = () => {
    setIsGeneratingBatch(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, displayedMatches.length));
      setIsGeneratingBatch(false);
    }, 40);
  };

  const handleLoadAll = () => {
    setIsGeneratingBatch(true);
    setTimeout(() => {
      setVisibleCount(displayedMatches.length);
      setIsGeneratingBatch(false);
    }, 60);
  };

  const handleCancelLoading = () => {
    setIsCancelled(true);
    setIsGeneratingBatch(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleWordClick = (word: string) => {
    executeSearch(word);
  };

  const renderedBatchList = useMemo(() => {
    return displayedMatches.slice(0, visibleCount);
  }, [displayedMatches, visibleCount]);

  const progressPercent = displayedMatches.length > 0
    ? Math.round((visibleCount / displayedMatches.length) * 100)
    : 100;

  const handleSaveTableEdits = () => {
    if (!tableUnderEdit) return;
    updateTable(tableUnderEdit.id, {
      name: editingName.trim() || tableUnderEdit.name,
      description: editingDescription.trim() || tableUnderEdit.description,
      values: editingValues,
    });
    setSaveSuccessMsg(`تم حفظ التعديلات على (${editingName}) بنجاح`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCreateNewTable = () => {
    const baseValues = newTableTemplate === 'maghribi' ? MAGHRIBI_VALUES : MASHRIQI_VALUES;
    const name = newTableName.trim() || (newTableTemplate === 'maghribi' ? 'جدول مغربي مخصص' : 'جدول مشرقي مخصص');
    const newId = addCustomTable(name, baseValues, 'جدول حساب جُمَّل مخصص');
    setSelectedTableForEditId(newId);
    setShowAddModal(false);
    setNewTableName('');
    setSaveSuccessMsg(`تم إنشاء جدول جديد: ${name}`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-4 font-sans max-w-6xl mx-auto" dir="rtl">
      {/* Top View Selector: Calculator & Quran Matcher vs Gematria Tables Manager */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-2 shadow-xs">
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl">
          <button
            type="button"
            id="gematria-tab-calculator"
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs border border-stone-200/80 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>حساب الجُمَّل ومطابقة مفردات القرآن الكريم</span>
          </button>

          <button
            type="button"
            id="gematria-tab-table-manager"
            onClick={() => setActiveTab('tables_manager')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'tables_manager'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-stone-200/80 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <TableProperties className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>إدارة وتعديل جداول الجُمَّل (الشرقي والغربي والمخصص)</span>
          </button>
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="space-y-4">
          {/* ======================================================== */}
          {/* 1. SEARCH & CALCULATION INPUT CARD */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 sm:p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="gematria-search-input"
                  className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  <span>اكتب الكلمة أو الرقم واضغط (بحث) لحساب الجُمَّل ومطابقة مفردات القرآن:</span>
                </label>

                {/* Active Table Badge in Calculator */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span>النظام النشط: {activeTable.name.replace(/\(.*\)/, '').trim()}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tables_manager')}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline ms-1 cursor-pointer"
                  >
                    (تبديل/تعديل)
                  </button>
                </div>
              </div>
            </div>

            {/* Input Field + Search Button Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  id="gematria-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="اكتب كلمة، اسم، آية، أو رقماً هنا واضغط بحث..."
                  className="w-full text-base sm:text-lg font-bold py-2.5 px-3.5 pe-10 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/70 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-right tracking-wide font-sans"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setCommittedQuery('');
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="مسح حقل الإدخال"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!searchInput.trim()}
                className="px-5 sm:px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>بحث</span>
              </button>
            </form>

            {/* History Log Strip directly under Search Box (سجل الحساب: الكلمة = المجموع) */}
            {history.length > 0 && (
              <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-2xs font-semibold text-stone-400 dark:text-stone-500 shrink-0 select-none">
                    <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>السجل:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {history.map((item) => {
                      const isCurrent = committedQuery === item.word;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSearchInput(item.word);
                            executeSearch(item.word);
                          }}
                          className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs'
                              : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200'
                          }`}
                          title={`انقر لعرض حساب: [${item.word}]`}
                        >
                          <span className="font-quran text-sm font-semibold">{item.word}</span>
                          <span className="text-stone-400 font-mono text-xs">=</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                            {item.total}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => removeHistoryItem(e, item.word)}
                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-opacity p-0.5 rounded cursor-pointer"
                            title="حذف"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-3xs text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer flex items-center gap-0.5 shrink-0"
                  title="مسح السجل بالكامل"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح</span>
                </button>
              </div>
            )}

            {/* Quick Orthography & Calculation Options Toolbar - Button without caption */}
            <div className="pt-1 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowOptionsPanel(!showOptionsPanel)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center ${
                      showOptionsPanel
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 border border-stone-200 dark:border-stone-700'
                    }`}
                    title="ضوابط وخيارات الحساب القرآني والإملائي"
                  >
                    <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </button>

                  {/* Active Rules Badges Summary */}
                  <div className="flex items-center gap-1 text-3xs font-bold text-stone-500 dark:text-stone-400 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      الخنجرية: {calculationOptions.daggerAlif === 'count_as_1' ? '1' : '0'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      المربوطة: {calculationOptions.taMarbuta === 'ha_5' ? 'هاء (5)' : 'تاء (400)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      المقصورة: {calculationOptions.alifMaqsura === 'ya_10' ? 'ياء (10)' : 'ألف (1)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      الشدة: {calculationOptions.shaddahMode === 'double_2x' ? '2x' : '1x'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible Options Drawer */}
              {showOptionsPanel && (
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200/80 dark:border-stone-700">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span>تخصيص قواعد الحساب القرآني والإملائي (تؤثر فوراً على نتائج الجُمَّل والبحث)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateCalculationOptions({
                          daggerAlif: 'count_as_1',
                          taMarbuta: 'ha_5',
                          alifMaqsura: 'ya_10',
                          hamzaMode: 'carrier_value',
                          shaddahMode: 'single_1x',
                          definiteArticleMode: 'include_all',
                          orthographyMode: 'uthmani',
                        })
                      }
                      className="text-3xs font-bold text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة الضوابط القياسية</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {/* 1. Dagger Alif */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>الألف الخنجرية (ٰ)</span>
                        <span className="text-3xs text-amber-600 font-mono">الرَّحْمٰن / هٰذَا</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ daggerAlif: 'count_as_1' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.daggerAlif === 'count_as_1'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          محتسبة (= 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ daggerAlif: 'ignore_0' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.daggerAlif === 'ignore_0'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          مهملة (= 0)
                        </button>
                      </div>
                    </div>

                    {/* 2. Ta Marbuta */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>التاء المربوطة (ة)</span>
                        <span className="text-3xs text-amber-600 font-mono">رحمة / صلاة</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ taMarbuta: 'ha_5' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.taMarbuta === 'ha_5'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          هاء (= 5) [وقفاً]
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ taMarbuta: 'ta_400' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.taMarbuta === 'ta_400'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          تاء (= 400) [وصلاً]
                        </button>
                      </div>
                    </div>

                    {/* 3. Alif Maqsura */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>الألف المقصورة (ى)</span>
                        <span className="text-3xs text-amber-600 font-mono">هدى / موسى</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ alifMaqsura: 'ya_10' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.alifMaqsura === 'ya_10'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          ياء (= 10) [رسماً]
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ alifMaqsura: 'alif_1' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.alifMaqsura === 'alif_1'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          ألف (= 1) [نطقاً]
                        </button>
                      </div>
                    </div>

                    {/* 4. Hamza Forms */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>صور الهمزة (ء، أ، ؤ، ئ)</span>
                        <span className="text-3xs text-amber-600 font-mono">مؤمن / شيء</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ hamzaMode: 'carrier_value' })}
                          className={`py-1 px-1 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.hamzaMode === 'carrier_value'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                          title="الهمزة على واو = 6، على ياء = 10، على ألف أو سطر = 1"
                        >
                          حسب الكرسي
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ hamzaMode: 'all_as_alif_1' })}
                          className={`py-1 px-1 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.hamzaMode === 'all_as_alif_1'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                          title="كل الهمزات = 1"
                        >
                          كلها ألف (1)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ hamzaMode: 'ignore_isolated_0' })}
                          className={`py-1 px-1 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.hamzaMode === 'ignore_isolated_0'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                          title="إهمال الهمزة السطرية المنفردة"
                        >
                          إهمال (ء=0)
                        </button>
                      </div>
                    </div>

                    {/* 5. Shaddah Doubling */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>الشدة والتضعيف (ّ)</span>
                        <span className="text-3xs text-amber-600 font-mono">محمّد / ربّ</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ shaddahMode: 'single_1x' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.shaddahMode === 'single_1x'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          حرف واحد (1x)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ shaddahMode: 'double_2x' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.shaddahMode === 'double_2x'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          فك التضعيف (2x)
                        </button>
                      </div>
                    </div>

                    {/* 6. Definite Article Strip */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                        <span>الـ التعريف (الـ)</span>
                        <span className="text-3xs text-amber-600 font-mono">الكتاب / كتاب</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ definiteArticleMode: 'include_all' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.definiteArticleMode === 'include_all'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          احتساب كامل
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalculationOptions({ definiteArticleMode: 'strip_al' })}
                          className={`py-1 px-1.5 rounded text-3xs font-bold transition-all cursor-pointer ${
                            calculationOptions.definiteArticleMode === 'strip_al'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          إسقاط الـ (للبحث بالأصل)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. COMPACT ULTRA-MINIMAL GEMATRIA RESULT BAR (سطرين كحد أقصى بدون كابشن أو مربعات زائدة) */}
          {/* ======================================================== */}
          {targetNumber > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
              {/* Letters breakdown + Equal + Total value (minimal & clean) */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
                {!isDirectNumber && letterBreakdown.length > 0 ? (
                  <>
                    {letterBreakdown.map((item, idx) => {
                      const layer = findLayerForChar(item.char);
                      const layerNum = layer ? layer.layer : 0;
                      const color = LAYER_RAINBOW_COLORS[layerNum] || {
                        name: 'زمردي',
                        activeBg: 'bg-emerald-600',
                        activeText: 'text-white',
                        activeBorder: 'border-emerald-700',
                      };

                      return (
                        <React.Fragment key={idx}>
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                            title={`الحرف [${item.char}] = ${item.value}`}
                          >
                            <span
                              className={`w-6.5 h-6.5 rounded-md font-bold text-xs sm:text-sm font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                            >
                              {item.char}
                            </span>
                            <span
                              className="h-6.5 min-w-[28px] px-1.5 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs"
                              title={`قيمة الجُمَّل: ${item.value}`}
                            >
                              {item.value}
                            </span>
                          </div>

                          {idx < letterBreakdown.length - 1 && (
                            <span className="text-stone-400 dark:text-stone-500 font-bold font-mono text-xs sm:text-sm px-0.5 select-none">
                              +
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}

                    <span className="text-stone-400 dark:text-stone-500 font-bold font-mono text-xs sm:text-sm px-0.5 select-none">
                      =
                    </span>
                  </>
                ) : isDirectNumber ? (
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    <span>الوزن:</span>
                  </span>
                ) : null}

                {/* Total Value Badge (Clickable to search divisors on Google) */}
                <button
                  type="button"
                  onClick={() => {
                    const query = encodeURIComponent(`ما هي قواسم العدد ${targetNumber}`);
                    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-mono font-black text-sm sm:text-base px-3 py-1 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  title={`انقر للبحث عن قواسم العدد ${targetNumber} في جوجل`}
                >
                  <span>{targetNumber}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Action Icons: Notebook Save (Icon-Only) + Copy */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(targetNumber.toString())}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title="نسخ الناتج"
                >
                  {copiedText === targetNumber.toString() ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <AddToNotebookButton
                  word={committedQuery}
                  cipher={`حساب الجمل: ${targetNumber}`}
                  type="manual"
                  note={`مجموع الجُمَّل: ${targetNumber} | نظام: ${activeTable.name}`}
                  variant="icon-only"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2.5 DEDICATED NOORANI COMBINATIONS SECTION (أحرف نورانية فقط مرتبة كالفواتح) */}
          {/* ======================================================== */}
          {targetNumber > 0 && nooraniFormulasMatches.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 dark:from-amber-950/40 dark:via-emerald-950/40 dark:to-indigo-950/40 rounded-xl border border-amber-300/80 dark:border-amber-700/60 p-2.5 sm:p-3 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-amber-200/80 dark:border-amber-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>التراكيب والصيغ النورانية المحتملة (أحرف نورانية فقط)</span>
                      <span className="text-3xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono font-bold">
                        {nooraniFormulasMatches.length} صيغة
                      </span>
                    </h3>
                    <p className="text-3xs text-stone-600 dark:text-stone-400">
                      توليفات من الأحرف النورانية الـ 14 مرتبة بأقرب صيغة لفواتح السور (مثل: الر، المر، المص، كهيعص، طه، يس، حم، عسق)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUniqueNooraniOnly(!uniqueNooraniOnly)}
                    className={`text-3xs font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs flex items-center gap-1 border ${
                      uniqueNooraniOnly
                        ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                    title={uniqueNooraniOnly ? 'إخفاء التراكيب التي تحتوي أحرفاً مكررة' : 'السماح بتكرار الأحرف في التركيب'}
                  >
                    <span>{uniqueNooraniOnly ? '✓ أحرف فريدة (دون تكرار)' : 'السماح بتكرار الحرف'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuranFilter('noorani')}
                    className="text-3xs font-bold px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-2xs"
                  >
                    عرض في جدول النتائج ↓
                  </button>
                </div>
              </div>

              {/* Noorani Formulas Horizontal / Grid Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {nooraniFormulasMatches.map((noorani, idx) => (
                  <div
                    key={`noorani_card_${idx}`}
                    className={`p-2.5 rounded-lg border transition-all select-none flex flex-col justify-between gap-1.5 shadow-2xs ${
                      noorani.isAuthenticQuranicFawatih
                        ? 'bg-amber-50/95 dark:bg-amber-950/70 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/40'
                        : 'bg-white/95 dark:bg-stone-900/90 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400'
                    }`}
                  >
                    {/* Header: Formula & Quranic Badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-base sm:text-lg font-quran font-black text-amber-950 dark:text-amber-100 tracking-wider">
                        {noorani.formula}
                      </span>
                      {noorani.isAuthenticQuranicFawatih ? (
                        <span className="inline-flex items-center gap-1 text-3xs font-bold px-1.5 py-0.5 rounded-md bg-amber-600 text-white shadow-2xs">
                          <span>⭐ فاتحة أصيلة</span>
                        </span>
                      ) : (
                        <span className="text-3xs px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono">
                          {noorani.letters.length} أحرف
                        </span>
                      )}
                    </div>

                    {/* Letter breakdown chips with values */}
                    <div className="flex items-center gap-1 flex-wrap text-3xs font-mono">
                      {noorani.letters.map((char, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100/70 dark:bg-amber-900/50 text-stone-800 dark:text-stone-200 border border-amber-200/80 dark:border-amber-800/60"
                        >
                          <strong className="font-quran">{char}</strong>
                          <span className="text-stone-500 dark:text-stone-400">({noorani.values[cIdx]})</span>
                          {cIdx < noorani.letters.length - 1 && <span className="text-amber-600 font-bold">+</span>}
                        </span>
                      ))}
                      <span className="text-stone-700 dark:text-stone-300 font-bold">= {noorani.sum}</span>
                    </div>

                    {/* Surah reference if available */}
                    {noorani.surahs && noorani.surahs.length > 0 && (
                      <div className="text-3xs text-emerald-700 dark:text-emerald-400 font-bold truncate">
                        سورة: {noorani.surahs.join('، ')}
                      </div>
                    )}

                    {/* Actions: Copy & Add to Notebook */}
                    <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-amber-100 dark:border-amber-900/40">
                      <button
                        type="button"
                        onClick={() => handleCopy(noorani.formula)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="نسخ الصيغة"
                      >
                        {copiedText === noorani.formula ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <AddToNotebookButton
                        word={committedQuery}
                        cipher={noorani.formula}
                        systemName={`صيغة نورانية (${noorani.sum})`}
                        surahInfo={noorani.surahs?.join('، ')}
                        type="manual"
                        note={`صيغة أحرف نورانية: ${noorani.formula} = ${noorani.sum}`}
                        variant="icon-only"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. VOCABULARY & POSSIBILITIES MATCHING SECTION */}
          {/* ======================================================== */}
          {targetNumber > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 sm:p-3 shadow-xs space-y-2.5">
              {/* Filter Tabs Header: All vs Quranic vs Arabic vs Non-Arabic */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>المفردات والاحتمالات المتطابقة</span>
                      <button
                        type="button"
                        onClick={() => {
                          const query = encodeURIComponent(`ما هي قواسم العدد ${targetNumber}`);
                          window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-3xs px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title={`انقر للبحث عن قواسم العدد ${targetNumber} في جوجل`}
                      >
                        <span>= {targetNumber}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </h3>
                  </div>
                </div>

                {/* Filter Selector Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-stone-800/80 rounded-lg overflow-x-auto">
                  {/* Tab 1: Quranic (Default) */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('quranic')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'quranic'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-emerald-600'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>القرآن</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'quranic'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {allQuranicMatches.length}
                    </span>
                  </button>

                  {/* Tab 2: Noorani Formulas Only */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('noorani')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'noorani'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-amber-600'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>نورانية فقط</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'noorani'
                          ? 'bg-amber-800 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {nooraniFormulasMatches.length}
                    </span>
                  </button>

                  {/* Tab 3: General Arabic Words */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('arabic')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'arabic'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-blue-600'
                    }`}
                  >
                    <Languages className="w-3 h-3" />
                    <span>عربي عام</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'arabic'
                          ? 'bg-blue-800 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {arabicLexiconMatches.length}
                    </span>
                  </button>

                  {/* Tab 4: Non-Arabic Combinations */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('non_arabic')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'non_arabic'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-indigo-600'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>غير عربية</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'non_arabic'
                          ? 'bg-indigo-800 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {nonArabicPossibilities.length}
                    </span>
                  </button>

                  {/* Tab 5: All Possibilities */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('all')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'all'
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <span>الكل</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'all'
                          ? 'bg-stone-700 text-white dark:bg-stone-300 dark:text-stone-900'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {allCombinedMatches.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Interactive Calculation Progress Bar */}
              {isCalculating && (
                <div className="p-2.5 bg-gradient-to-r from-emerald-50 via-amber-50 to-indigo-50 dark:from-emerald-950/40 dark:via-amber-950/40 dark:to-indigo-950/40 rounded-xl border border-amber-300 dark:border-amber-800/80 shadow-xs space-y-1.5 transition-all animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-2xs font-bold text-stone-800 dark:text-stone-200">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                      <span>{calcStatusText || 'جاري استخراج وفحص المفردات المتطابقة...'}</span>
                    </div>
                    <span className="font-mono text-amber-700 dark:text-amber-300 font-black">{calcProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-amber-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${calcProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* In-results Instant Search Input + Progress Bar Controller */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={resultsSearchQuery}
                    onChange={(e) => setResultsSearchQuery(e.target.value)}
                    placeholder="بحث سريع في المفردات والاحتمالات المعروضة..."
                    className="w-full pr-8 pl-8 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                  {resultsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setResultsSearchQuery('')}
                      className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Progressive Batch Loading Controller & Counter & Small Fold Toggle Button */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 text-2xs text-stone-500 shrink-0">
                  <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                    {quranFilter === 'quranic'
                      ? `معروض ${displayedMatches.length} مفردة قرآنية`
                      : `معروض ${Math.min(visibleCount, displayedMatches.length)} من ${displayedMatches.length}`}
                  </span>

                  {/* Fold toggle icon for expanding viewport */}
                  {displayedMatches.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setIsGridFoldOpen((prev) => !prev)}
                      className="p-1 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer flex items-center justify-center"
                      title={isGridFoldOpen ? 'الرجوع للحجم القياسي' : 'توسيع نافذة العرض للحد الأقصى'}
                    >
                      {isGridFoldOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {isGeneratingBatch && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 sm:w-24 bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all duration-75"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelLoading}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 hover:bg-red-200 font-bold text-3xs cursor-pointer"
                        title="إيقاف استكمال باقي النتائج لتجنب تعليق المتصفح"
                      >
                        <Square className="w-2.5 h-2.5" />
                        <span>إلغاء</span>
                      </button>
                    </div>
                  )}

                  {quranFilter !== 'quranic' && !isGeneratingBatch && visibleCount < displayedMatches.length && (
                    <button
                      type="button"
                      onClick={handleLoadAll}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-bold text-3xs cursor-pointer"
                      title="عرض كل النتائج المتبقية"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>عرض الكل ({displayedMatches.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Color legend */}
              <div className="flex items-center gap-3 text-3xs font-bold text-stone-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                  <span className="text-emerald-700 dark:text-emerald-300">قرآني (بحث المصحف)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                  <span className="text-blue-700 dark:text-blue-300">عربي (بحث جوجل)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                  <span className="text-amber-700 dark:text-amber-300">غير عربي (بحث جوجل)</span>
                </span>
              </div>

              {/* High-density Results Grid: ALWAYS scrollable with smooth scrollbar */}
              {displayedMatches.length > 0 ? (
                <>
                  <div
                    className={`transition-all duration-300 pr-1.5 pl-1 space-y-2 border border-stone-200/80 dark:border-stone-800/80 rounded-lg p-2 bg-stone-50/40 dark:bg-stone-950/40 overflow-y-auto overscroll-contain ${
                      isGridFoldOpen
                        ? 'max-h-[750px]'
                        : 'max-h-[460px] sm:max-h-[520px]'
                    }`}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                      {(quranFilter === 'quranic' ? displayedMatches : renderedBatchList).map((item, idx) => {
                        const isQuran = item.isQuranic;
                        const isArabic = !item.isQuranic && item.isLexical;
                        const isNonArabic = !item.isQuranic && !item.isLexical;

                        const searchHref = isQuran
                          ? (item.quranicMeta
                              ? getQuranTopWordUrl(
                                  item.quranicMeta.word,
                                  item.quranicMeta.surahName,
                                  item.quranicMeta.ayahNum,
                                  item.quranicMeta.occurrences
                                )
                              : getQuranTopSearchUrl(item.text))
                          : getArabicDictSearchUrl(item.text);

                        const borderBgStyle = isQuran
                          ? 'border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 hover:border-emerald-500'
                          : isArabic
                          ? 'border-blue-300/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 hover:border-blue-500'
                          : 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 hover:border-amber-500';

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border p-1.5 flex items-center justify-between gap-1 transition-all hover:shadow-2xs group ${borderBgStyle}`}
                          >
                            <a
                              href={searchHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-quran text-xs sm:text-sm font-normal truncate hover:underline flex-1 text-right"
                              title={
                                isQuran
                                  ? `انقر للبحث عن "${item.text}" في موقع القرآن الكريم`
                                  : `انقر للبحث عن "${item.text}" في جوجل`
                              }
                            >
                              {item.text}
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.text);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-0.5 rounded transition-opacity cursor-pointer shrink-0"
                              title="نسخ"
                            >
                              {copiedText === item.text ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Progressive Load / Expand Bar for Non-Quranic large sets */}
                  {quranFilter !== 'quranic' && visibleCount < displayedMatches.length && (
                    <div className="col-span-full pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadNextBatch}
                        disabled={isGeneratingBatch}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingBatch ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري فتح وتوليد الدفعة التالية...</span>
                          </>
                        ) : (
                          <>
                            <ChevronsDown className="w-4 h-4 animate-bounce" />
                            <span>
                              سحب وتوليد دفعة إضافية (+{Math.min(LOAD_MORE_STEP, displayedMatches.length - visibleCount)})
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleLoadAll}
                        disabled={isGeneratingBatch}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="توليد كافة الاحتمالات المتبقية دفعة واحدة"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>فتح كامل النتائج ({displayedMatches.length})</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 px-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 space-y-1">
                  <BookOpen className="w-6 h-6 text-stone-400 mx-auto opacity-60" />
                  <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {resultsSearchQuery.trim()
                      ? `لا توجد نتائج تطابق "${resultsSearchQuery}" في هذا القسم`
                      : `لا توجد مفردات مطابقة للرقم (${targetNumber}) في هذا القسم`}
                  </div>
                  <div className="text-3xs text-stone-500">
                    {resultsSearchQuery.trim() ? (
                      <button
                        type="button"
                        onClick={() => setResultsSearchQuery('')}
                        className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        مسح البحث وعرض كافة النتائج
                      </button>
                    ) : (
                      'يمكنك تجربة تبويب "الكل" لعرض كافة الاحتمالات المتاحة.'
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state when page opens or no search is executed yet */}
          {targetNumber === 0 && (
            <div className="text-center py-12 px-4 bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-stone-800 dark:text-stone-200">
                  حاسبة الجُمَّل ومطابقة مفردات القرآن والتراكيب
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                  اكتب أي كلمة، اسم، آية، أو رقماً في الحقل أعلاه واضغط على زر <strong className="text-amber-600">بحث</strong> أو مفتاح <strong className="text-amber-600">Enter</strong> لبدء الحساب وتوليد النتائج.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. GEMATRIA TABLES MANAGEMENT & LETTER VALUES EDITOR */}
      {/* ======================================================== */}
      {activeTab === 'tables_manager' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-5">
          {/* Notification Banner */}
          {saveSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
              <button type="button" onClick={() => setSaveSuccessMsg(null)} className="text-xs px-1">✕</button>
            </div>
          )}

          {/* Top Bar: Selector & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>إدارة وتعديل جداول حساب الجُمَّل</span>
              </h3>
              <p className="text-2xs text-stone-500 dark:text-stone-400 mt-0.5">
                نظام مستقل لحساب الجُمَّل يدعم النموذج الشرقي والنموذج الغربي والجداول المخصصة
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة جدول مخصص</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من استعادة كافة جداول ونماذج الجُمَّل الافتراضية؟')) {
                    resetToDefaults();
                    setSelectedTableForEditId('mashriqi');
                    setSaveSuccessMsg('تمت استعادة الجداول والنماذج الافتراضية');
                    setTimeout(() => setSaveSuccessMsg(null), 3000);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 border border-stone-200 dark:border-stone-700 cursor-pointer"
                title="استعادة الجداول الافتراضية الأصلية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          </div>

          {/* Model Differences Notice Card */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 text-2xs space-y-1.5">
            <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>الفرق الجوهري بين النموذج الشرقي والنموذج الغربي:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-stone-700 dark:text-stone-300 pt-1">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-stone-900/60 border border-amber-200/60 dark:border-amber-900/40">
                <span className="font-black text-amber-900 dark:text-amber-300 block mb-0.5">النموذج الشرقي (المعتمد افتراضياً):</span>
                <span>(أبجد هوز حطي كلمن <strong className="text-amber-800 dark:text-amber-300">سعفص قرشت</strong> ثخذ <strong className="text-amber-800 dark:text-amber-300">ضظغ</strong>)</span>
                <div className="text-3xs text-stone-500 mt-0.5">س=60، ع=70، ف=80، ص=90 | ق=100، ر=200، ش=300، ت=400 | ض=800، ظ=900، غ=1000</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-stone-900/60 border border-amber-200/60 dark:border-amber-900/40">
                <span className="font-black text-emerald-900 dark:text-emerald-300 block mb-0.5">النموذج المغربي (التاريخي):</span>
                <span>(أبجد هوز حطي كلمن <strong className="text-emerald-800 dark:text-emerald-300">صعفض قرست</strong> ثخذ <strong className="text-emerald-800 dark:text-emerald-300">ظغش</strong>)</span>
                <div className="text-3xs text-stone-500 mt-0.5">ص=60، ع=70، ف=80، ض=90 | ق=100، ر=200، س=300، ت=400 | ظ=800، غ=900، ش=1000</div>
              </div>
            </div>
          </div>

          {/* Tables Selector Carousel / Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-600 dark:text-stone-400">
              اختر الجدول لعرض وتعديل قيمه أو اعتماده كنظام نشط للحساب:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {tables.map((tbl) => {
                const isActive = activeTableId === tbl.id;
                const isSelectedForEdit = selectedTableForEditId === tbl.id;

                return (
                  <div
                    key={tbl.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelectedForEdit
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {tbl.name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-emerald-600 text-white shadow-2xs">
                            النشط حالياً
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-stone-500 dark:text-stone-400 line-clamp-2">
                        {tbl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60 gap-1.5">
                      <div className="flex items-center gap-1">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTableId(tbl.id);
                              setSelectedTableForEditId(tbl.id);
                              setSaveSuccessMsg(`تم اعتماد (${tbl.name}) كنظام الحساب النشط`);
                              setTimeout(() => setSaveSuccessMsg(null), 3000);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-3xs font-bold cursor-pointer transition-colors"
                          >
                            تفعيل كنظام نشط
                          </button>
                        ) : (
                          <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>مفعل للحساب</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedTableForEditId(tbl.id)}
                          className={`px-2 py-1 rounded-lg text-3xs font-bold cursor-pointer transition-colors ${
                            isSelectedForEdit
                              ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {isSelectedForEdit ? 'معروض للتحرير' : 'تحرير القيم'}
                        </button>
                      </div>

                      {!tbl.isPreset && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف جدول "${tbl.name}"؟`)) {
                              deleteTable(tbl.id);
                              setSelectedTableForEditId('mashriqi');
                            }
                          }}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="حذف هذا الجدول المخصص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive 28 Letters Values Editor for Selected Table */}
          {tableUnderEdit && (
            <div className="bg-stone-50/80 dark:bg-stone-800/40 rounded-xl p-4 border border-stone-200 dark:border-stone-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-700 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
                      تعديل قيم الأحرف الـ 28 في جدول:
                    </h4>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-xs font-bold py-1 px-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    placeholder="وصف الجدول..."
                    className="w-full text-2xs py-1 px-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTableEdits}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ القيم والتعديلات</span>
                  </button>
                </div>
              </div>

              {/* 28 Letters Grid with Numeric Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {(tableUnderEdit.letterOrder || ARABIC_28_CANONICAL.map((l) => l.char)).map((char) => {
                  const val = editingValues[char] ?? 0;
                  const isNoorani = NOORANI_LETTERS_SET.has(char);
                  const charInfo = ARABIC_28_CANONICAL.find((c) => c.char === char);

                  return (
                    <div
                      key={char}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isNoorani
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-3xs font-bold text-stone-500">
                        <span>{charInfo?.name || char}</span>
                        {isNoorani && <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>

                      <span className="text-2xl font-black font-quran text-stone-900 dark:text-stone-100 my-0.5">
                        {char}
                      </span>

                      <div className="w-full">
                        <label className="text-3xs text-stone-400 block text-center mb-0.5 font-bold">القيمة:</label>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10) || 0;
                            setEditingValues((prev) => ({
                              ...prev,
                              [char]: parsed,
                            }));
                          }}
                          className="w-full text-center text-xs font-mono font-black py-1 px-1 rounded border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-950 text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Custom Table Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>إضافة جدول حساب جُمَّل جديد</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-stone-400 hover:text-stone-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      اسم الجدول:
                    </label>
                    <input
                      type="text"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      placeholder="مثلاً: جُمَّل خاص، أو حساب رقمي محدد..."
                      className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      نسخ القيم الابتدائية من:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewTableTemplate('mashriqi')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          newTableTemplate === 'mashriqi'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        النموذج الشرقي
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTableTemplate('maghribi')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          newTableTemplate === 'maghribi'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        النموذج المغربي
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewTable}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                  >
                    إنشاء الجدول
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
