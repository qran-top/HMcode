import React, { useState, useMemo, useEffect } from 'react';
import { useNotebook } from '../context/NotebookContext';
import { useGematria, ARABIC_28_CANONICAL, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
import { NOORANI_LETTERS_SET, findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import { getQuranTopWordUrl, getArabicDictSearchUrl } from '../utils/quranicDictionary';
import {
  parseNumericQuery,
  normalizeArabicDigits,
  GematriaCalculationOptions,
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
} from 'lucide-react';

interface GematriaViewProps {
  initialText?: string;
  onNavigateToDual?: (text: string) => void;
}

const EXAMPLE_PHRASES = ['سلام', 'كهيعص', 'الحمد لله', 'نور', 'علم', 'قرآن', 'حكيم', 'صراط', 'الرحمن', 'طه'];
const EXAMPLE_NUMBERS = [66, 92, 100, 114, 131, 140, 256, 300, 786];

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

  // Search input states
  const [searchInput, setSearchInput] = useState<string>(initialText || 'سلام');
  const [committedQuery, setCommittedQuery] = useState<string>(initialText || 'سلام');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(100);
  const [searchStage, setSearchStage] = useState<string>('');

  // Filter for matching results: 'quranic' | 'arabic' | 'non_arabic' | 'all' | 'noorani' | 'non_noorani'
  const [quranFilter, setQuranFilter] = useState<'quranic' | 'arabic' | 'non_arabic' | 'all' | 'noorani' | 'non_noorani'>('quranic');
  const [resultsSearchQuery, setResultsSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

  // Execute search with animated progress bar
  const executeSearch = (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchInput).trim();
    if (!q) return;

    if (queryToSearch !== undefined) {
      setSearchInput(queryToSearch);
    }

    setIsSearching(true);
    setSearchProgress(25);
    setSearchStage('جاري حساب قيمة الجُمَّل وتفكيك الحروف وفق الجدول والضوابط النشطة...');

    setTimeout(() => {
      setSearchProgress(65);
      setSearchStage('مطابقة مفردات القرآن الكريم بالوزن التام وفق الضوابط المختارة...');

      setTimeout(() => {
        setCommittedQuery(q);
        setSearchProgress(100);
        setSearchStage('اكتملت المطابقة!');
        setTimeout(() => {
          setIsSearching(false);
        }, 250);
      }, 60);
    }, 50);
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

  // Fetch all Quranic words matching this exact Gematria value
  const allQuranicMatches = useMemo(() => {
    if (!targetNumber || targetNumber <= 0) return [];
    return findQuranicMatches(targetNumber, {
      filterType: 'all',
      maxResults: 150,
    });
  }, [targetNumber, findQuranicMatches]);

  // Fetch all Arabic vocabulary matches from general Arabic dictionary
  const arabicLexiconMatches = useMemo(() => {
    if (!targetNumber || targetNumber <= 0) return [];
    return findArabicMatches(targetNumber, {
      maxResults: 150,
    });
  }, [targetNumber, findArabicMatches]);

  // Synthesize non-Arabic permutations / letter combinations
  const nonArabicPossibilities = useMemo(() => {
    if (!targetNumber || targetNumber <= 0) return [];
    return synthesizeNonArabicPossibilities(targetNumber, {
      maxResults: 600,
    });
  }, [targetNumber, synthesizeNonArabicPossibilities]);

  // Filter into Noorani vs Non-Noorani Quranic words
  const nooraniQuranicMatches = useMemo(() => {
    return allQuranicMatches.filter((m) => m.isNooraniOnly);
  }, [allQuranicMatches]);

  const nonNooraniQuranicMatches = useMemo(() => {
    return allQuranicMatches.filter((m) => !m.isNooraniOnly);
  }, [allQuranicMatches]);

  // Combined all words (Quranic + general Arabic + non-Arabic)
  const allCombinedMatches = useMemo(() => {
    const list: typeof allQuranicMatches = [];
    const seen = new Set<string>();

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
  }, [allQuranicMatches, arabicLexiconMatches, nonArabicPossibilities]);

  // Visible matches based on selected tab filter and optional search query
  const displayedMatches = useMemo(() => {
    let baseList = allCombinedMatches;
    if (quranFilter === 'quranic') baseList = allQuranicMatches;
    else if (quranFilter === 'arabic') baseList = arabicLexiconMatches;
    else if (quranFilter === 'non_arabic') baseList = nonArabicPossibilities;
    else if (quranFilter === 'noorani') baseList = nooraniQuranicMatches;
    else if (quranFilter === 'non_noorani') baseList = nonNooraniQuranicMatches;

    if (!resultsSearchQuery.trim()) {
      return baseList;
    }

    const query = resultsSearchQuery.trim().toLowerCase();
    return baseList.filter((item) => {
      // Match text, letters, surah name, or ayah num
      if (item.text.toLowerCase().includes(query)) return true;
      if (item.letters.some((c) => c.includes(query))) return true;
      if (item.quranicMeta?.surahName?.includes(query)) return true;
      if (String(item.quranicMeta?.ayahNum) === query) return true;
      return false;
    });
  }, [
    quranFilter,
    resultsSearchQuery,
    allQuranicMatches,
    arabicLexiconMatches,
    nonArabicPossibilities,
    nooraniQuranicMatches,
    nonNooraniQuranicMatches,
    allCombinedMatches,
  ]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleWordClick = (word: string) => {
    executeSearch(word);
  };

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
                  <span>اكتب الكلمة أو الرقم لحساب الجُمَّل ومطابقة مفردات القرآن:</span>
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

              {/* Quick Examples Pills */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-3xs text-stone-400 dark:text-stone-500 font-bold">نماذج:</span>
                {EXAMPLE_PHRASES.slice(0, 5).map((phr) => (
                  <button
                    key={phr}
                    type="button"
                    onClick={() => executeSearch(phr)}
                    className="text-3xs font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
                  >
                    {phr}
                  </button>
                ))}
                {EXAMPLE_NUMBERS.slice(0, 3).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => executeSearch(String(num))}
                    className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Field + Search Button */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  id="gematria-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executeSearch();
                    }
                  }}
                  placeholder="اكتب كلمة، اسم، آية، أو رقماً مستهدفاً (بالعربية أو الإنجليزية ٧٨٦ أو 786) ثم اضغط بحث..."
                  className="w-full text-base sm:text-lg font-bold py-2 sm:py-2.5 px-3.5 pe-10 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/70 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-right tracking-wide font-sans"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="مسح حقل الإدخال"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                id="gematria-search-btn"
                onClick={() => executeSearch()}
                disabled={isSearching || !searchInput.trim()}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-2xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحساب والمطابقة...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>احسب وطابق المفردات</span>
                  </>
                )}
              </button>
            </div>

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

            {/* Step-by-Step Animated Progress Bar */}
            {isSearching && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>{searchStage}</span>
                  </span>
                  <span className="font-mono text-3xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold">
                    {searchProgress}%
                  </span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-200 ease-out shadow-xs"
                    style={{ width: `${searchProgress}%` }}
                  />
                </div>
              </div>
            )}
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

                {/* Total Value Badge (Minimal, no bulky caption) */}
                <div
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-mono font-black text-sm sm:text-base px-2.5 py-1 rounded-lg shadow-2xs"
                  title={`المجموع الكلي: ${targetNumber}`}
                >
                  <span>{targetNumber}</span>
                </div>

                {/* Mini Quranic Matches Counter Badge */}
                {allQuranicMatches.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-mono"
                    title={`يوجد ${allQuranicMatches.length} مفردة قرآنية تطابق هذا الوزن`}
                  >
                    <BookOpen className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{allQuranicMatches.length}</span>
                  </span>
                )}
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
          {/* 3. VOCABULARY & POSSIBILITIES MATCHING SECTION */}
          {/* ======================================================== */}
          {targetNumber > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 sm:p-3 shadow-xs space-y-2.5">
              {/* Filter Tabs Header: Quranic vs Arabic vs Non-Arabic vs All */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>المفردات والاحتمالات المتطابقة</span>
                      <span className="text-3xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                        = {targetNumber}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Filter Selector Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-stone-800/80 rounded-lg overflow-x-auto">
                  {/* Tab 1: Quranic */}
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

                  {/* Tab 2: General Arabic Words */}
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

                  {/* Tab 3: Non-Arabic Combinations */}
                  <button
                    type="button"
                    onClick={() => setQuranFilter('non_arabic')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      quranFilter === 'non_arabic'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-amber-600'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>غير عربية</span>
                    <span
                      className={`text-3xs px-1 py-0.2 rounded-full font-mono ${
                        quranFilter === 'non_arabic'
                          ? 'bg-amber-800 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {nonArabicPossibilities.length}
                    </span>
                  </button>

                  {/* Tab 4: All Possibilities */}
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

              {/* In-results Instant Search Input */}
              <div className="relative">
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

              {/* Realistic Compact Results Grid */}
              {displayedMatches.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                  {displayedMatches.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-50/90 dark:bg-stone-800/40 border border-stone-200/90 dark:border-stone-700/80 hover:border-amber-400 dark:hover:border-amber-500 rounded-lg p-2 flex flex-col justify-between transition-all hover:shadow-2xs group"
                    >
                      {/* Top Bar: Badges & Direct Links */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                          <span className="text-3xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-900/60 leading-none">
                            {item.value}
                          </span>

                          {item.isQuranic && (
                            <span
                              className="text-3xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 rounded leading-none"
                              title="مفردة قرآنية"
                            >
                              قرآن
                            </span>
                          )}

                          {!item.isQuranic && item.isLexical && (
                            <span
                              className="text-3xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-1 py-0.2 rounded leading-none"
                              title="كلمة عربية"
                            >
                              عربي
                            </span>
                          )}

                          {!item.isQuranic && !item.isLexical && (
                            <span
                              className="text-3xs font-bold text-stone-500 dark:text-stone-400 bg-stone-200/70 dark:bg-stone-800 px-1 py-0.2 rounded leading-none"
                              title="احتمال صوتي / تركيب"
                            >
                              غير عربي
                            </span>
                          )}

                          {/* Surah & Ayah Link if Quranic */}
                          {item.quranicMeta && (
                            <a
                              href={getQuranTopWordUrl(
                                item.quranicMeta.word,
                                item.quranicMeta.surahName,
                                item.quranicMeta.ayahNum,
                                item.quranicMeta.occurrences
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-3xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 hover:underline bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-1 py-0.2 rounded inline-flex items-center gap-0.5 truncate max-w-[85px] leading-tight"
                              title={`سورة ${item.quranicMeta.surahName} (آية ${item.quranicMeta.ayahNum}) - المصحف`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate">{item.quranicMeta.surahName}:{item.quranicMeta.ayahNum}</span>
                            </a>
                          )}
                        </div>

                        {/* Action Buttons: Copy */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.text);
                            }}
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                            title="نسخ"
                          >
                            {copiedText === item.text ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Middle: Word Display (انقر للبحث في جوجل كما في باقي البرنامج) */}
                      <div className="my-1">
                        <a
                          href={getArabicDictSearchUrl(item.text)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 font-quran hover:text-amber-600 dark:hover:text-amber-400 transition-colors block text-right leading-tight truncate hover:underline"
                          title={`انقر لفتح معنى "${item.text}" في جوجل`}
                        >
                          {item.text}
                        </a>
                      </div>

                      {/* Bottom: Compact Calculation details */}
                      <div className="flex items-center justify-between text-3xs font-mono text-stone-400 dark:text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800/60">
                        <span className="truncate dir-ltr text-right" title={item.letters.map((c) => activeTable.values[c] || 0).join('+')}>
                          {item.letters.map((c) => activeTable.values[c] || 0).join('+')}
                        </span>
                        <button
                          type="button"
                          onClick={() => executeSearch(item.text)}
                          className="text-3xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 mr-1 font-sans font-bold cursor-pointer"
                          title="حساب الجُمَّل"
                        >
                          احسب
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
