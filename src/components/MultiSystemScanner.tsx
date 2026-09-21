import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useNotebook } from '../context/NotebookContext';
import { SaveSystemModal } from './SaveSystemModal';
import {
  CrossDecipherMatch,
  getAllNooraniItems,
  getAllArabicItems,
  buildCrossLayersFromPair,
  analyzeLayersForCrossDecipher,
} from '../utils/multiSystemSearch';
import {
  Layers,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Zap,
  BookOpen,
  Info,
  ArrowUpDown,
  BookmarkPlus,
  BookMarked,
} from 'lucide-react';

interface MultiSystemScannerProps {
  initialQuery?: string;
  onApplySystem?: (layers: any[], name: string) => void;
  onApplySystemPair?: (
    nooraniId: string,
    arabicId: string,
    isNooraniReversed: boolean,
    isArabicReversed: boolean,
    layers: any[],
    name: string
  ) => void;
  onClose?: () => void;
  includeWawInCelestial?: boolean;
  onToggleIncludeWaw?: (val: boolean) => void;
}

export function MultiSystemScanner({
  initialQuery = '',
  onApplySystem,
  onApplySystemPair,
  onClose,
  includeWawInCelestial = true,
  onToggleIncludeWaw,
}: MultiSystemScannerProps) {
  const { savedTables, savedNooraniPresets, savedArabicPresets, importLayersJson, setActiveTableName } = useCipherLayers();
  const { isSystemSaved, openDrawer, savedSystems } = useNotebook();

  const [queryText, setQueryText] = useState(initialQuery);
  const [includeWaw, setIncludeWaw] = useState(includeWawInCelestial);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanningName, setCurrentScanningName] = useState('');
  const [saveModalTarget, setSaveModalTarget] = useState<CrossDecipherMatch | null>(null);
  
  const [crossResults, setCrossResults] = useState<CrossDecipherMatch[]>([]);
  const [appliedSystemId, setAppliedSystemId] = useState<string | null>(null);
  const [appliedSystemName, setAppliedSystemName] = useState<string | null>(null);
  
  // Keep local includeWaw state in sync if parent prop changes
  useEffect(() => {
    setIncludeWaw(includeWawInCelestial);
  }, [includeWawInCelestial]);

  // Sort and Filter States
  const [sortOption, setSortOption] = useState<'quranic' | 'score' | 'alpha'>('quranic');
  const [operationFilter, setOperationFilter] = useState<'all' | 'decrypted' | 'encrypted'>('all');
  const [onlyQuranic, setOnlyQuranic] = useState<boolean>(false);
  const [onlyReversed, setOnlyReversed] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpandCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCancelledRef = useRef(false);

  const handleApplyCustomLayers = (match: CrossDecipherMatch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onApplySystemPair && match.nooraniId && match.arabicId) {
      onApplySystemPair(
        match.nooraniId,
        match.arabicId,
        Boolean(match.isNooraniReversed),
        Boolean(match.isArabicReversed),
        match.layers,
        match.label
      );
    } else if (onApplySystem) {
      onApplySystem(match.layers, match.label);
    } else {
      importLayersJson(JSON.stringify(match.layers));
      setActiveTableName(match.label);
    }
    setAppliedSystemId(match.id);
    setAppliedSystemName(match.label);
    setTimeout(() => {
      setAppliedSystemId(null);
    }, 3500);
  };

  const runScan = useCallback(async (textToScan: string, withWaw?: boolean) => {
    const trimmed = textToScan.trim();
    if (!trimmed) return;

    const useWaw = withWaw !== undefined ? withWaw : includeWaw;

    isCancelledRef.current = false;
    setIsScanning(true);
    setScanProgress(0);
    setCrossResults([]);

    const nooraniItems = getAllNooraniItems(savedNooraniPresets, savedTables);
    const arabicItems = getAllArabicItems(savedArabicPresets, savedTables);
    const accumulated: CrossDecipherMatch[] = [];

    const tasks: {
      layers: any[];
      label: string;
      primaryName: string;
      secondaryName?: string;
      nooraniSourceLabel?: string;
      arabicSourceLabel?: string;
      nooraniId: string;
      arabicId: string;
      isNooraniReversed: boolean;
      isArabicReversed: boolean;
      type: 'cross_hybrid' | 'cross_reversed';
      id: string;
    }[] = [];

    // Cartesian product across all Sky Orders x Earth Orders with 2 unique permutations (طبيعي و معكوس)
    for (const noorani of nooraniItems) {
      for (const arabic of arabicItems) {
        // 1. Normal (طبيعي: سماء مباشر × أرض مباشر)
        tasks.push({
          layers: buildCrossLayersFromPair(noorani, arabic, false, false, useWaw),
          label: `[سماء ${noorani.index}: ${noorani.name}] × [أرض ${arabic.index}: ${arabic.name}]`,
          primaryName: `سماء ${noorani.index}: ${noorani.name}`,
          secondaryName: `أرض ${arabic.index}: ${arabic.name}`,
          nooraniSourceLabel: `سماء ${noorani.index}: ${noorani.name}`,
          arabicSourceLabel: `أرض ${arabic.index}: ${arabic.name}`,
          nooraniId: noorani.id,
          arabicId: arabic.id,
          isNooraniReversed: false,
          isArabicReversed: false,
          type: 'cross_hybrid',
          id: `cross_${noorani.id}_${arabic.id}_norm${useWaw ? '_waw' : ''}`,
        });

        // 2. Reversed (معكوس: تثبيت السماء × عكس طبقات الأرض)
        // ملاحظة رياضية: عكس السماء مع أرض طبيعي يطابق تماماً سماء طبيعي مع أرض معكوس،
        // وعكس الاثنين معاً يعيد الحالة الطبيعية، لذا هناك احتمالان فريدان فقط.
        tasks.push({
          layers: buildCrossLayersFromPair(noorani, arabic, false, true, useWaw),
          label: `[سماء ${noorani.index}: ${noorani.name}] × [معكوس أرض ${arabic.index}: ${arabic.name}]`,
          primaryName: `سماء ${noorani.index}: ${noorani.name}`,
          secondaryName: `معكوس أرض ${arabic.index}: ${arabic.name}`,
          nooraniSourceLabel: `سماء ${noorani.index}: ${noorani.name}`,
          arabicSourceLabel: `أرض ${arabic.index}: ${arabic.name} (معكوس)`,
          nooraniId: noorani.id,
          arabicId: arabic.id,
          isNooraniReversed: false,
          isArabicReversed: true,
          type: 'cross_reversed',
          id: `cross_${noorani.id}_${arabic.id}_rev${useWaw ? '_waw' : ''}`,
        });
      }
    }

    const total = tasks.length;

    for (let i = 0; i < total; i++) {
      if (isCancelledRef.current) break;

      const t = tasks[i];
      setCurrentScanningName(t.label);
      setScanProgress(Math.round(((i + 1) / total) * 100));

      const match = analyzeLayersForCrossDecipher(
        t.layers,
        t.label,
        t.primaryName,
        t.secondaryName,
        t.nooraniSourceLabel,
        t.arabicSourceLabel,
        t.type,
        trimmed,
        t.id,
        t.nooraniId,
        t.arabicId,
        t.isNooraniReversed,
        t.isArabicReversed
      );

      if (match) {
        accumulated.push(match);
      }

      if (i % 10 === 0 || i === total - 1) {
        setCrossResults([...accumulated]);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    setIsScanning(false);
    setScanProgress(100);
    setCurrentScanningName('');
  }, [savedNooraniPresets, savedArabicPresets, savedTables, includeWaw]);

  useEffect(() => {
    if (typeof includeWawInCelestial === 'boolean' && includeWawInCelestial !== includeWaw) {
      setIncludeWaw(includeWawInCelestial);
    }
  }, [includeWawInCelestial]);

  const lastScannedKeyRef = useRef<string>('');

  useEffect(() => {
    const target = (initialQuery || queryText).trim();
    const effectiveWaw = typeof includeWawInCelestial === 'boolean' ? includeWawInCelestial : includeWaw;
    const scanKey = `${target}::${effectiveWaw}`;
    if (target && scanKey !== lastScannedKeyRef.current) {
      lastScannedKeyRef.current = scanKey;
      setQueryText(target);
      runScan(target, effectiveWaw);
    }
  }, [initialQuery, includeWawInCelestial, includeWaw, runScan]);

  // Filtered and Sorted Results
  const filteredAndSortedResults = useMemo(() => {
    const list: (CrossDecipherMatch & {
      displayedQuranicMatches: CrossDecipherMatch['quranicMatches'];
      displayedDictMatches: CrossDecipherMatch['dictMatches'];
    })[] = [];

    const matchesWord = (m: { source: 'plain' | 'enc' | 'dec'; isReversed: boolean }) => {
      if (operationFilter === 'decrypted' && m.source !== 'dec') return false;
      if (operationFilter === 'encrypted' && m.source !== 'enc') return false;
      if (onlyReversed && !m.isReversed) return false;
      return true;
    };

    const q = filterSearch.trim().toLowerCase();

    // Filter & Sort
    for (const r of crossResults) {
      const filteredQuranic = r.quranicMatches.filter(matchesWord);
      const isQuranicOnlyMode = onlyQuranic || sortOption === 'quranic';
      const filteredDict = isQuranicOnlyMode ? [] : r.dictMatches.filter(matchesWord);

      // Card must have at least one match passing the filter
      if (filteredQuranic.length === 0 && filteredDict.length === 0) {
        continue;
      }

      // Filter by keyword
      if (q) {
        const matchesQuery =
          r.label.toLowerCase().includes(q) ||
          r.primarySystemName.toLowerCase().includes(q) ||
          (r.secondarySystemName && r.secondarySystemName.toLowerCase().includes(q)) ||
          filteredQuranic.some((m) => m.word.includes(q)) ||
          filteredDict.some((m) => m.word.includes(q));

        if (!matchesQuery) continue;
      }

      list.push({
        ...r,
        displayedQuranicMatches: filteredQuranic,
        displayedDictMatches: filteredDict,
      });
    }

    // Sort
    if (sortOption === 'quranic') {
      list.sort((a, b) => {
        if (b.displayedQuranicMatches.length !== a.displayedQuranicMatches.length) {
          return b.displayedQuranicMatches.length - a.displayedQuranicMatches.length;
        }
        return b.coherenceScore - a.coherenceScore;
      });
    } else if (sortOption === 'score') {
      list.sort((a, b) => b.coherenceScore - a.coherenceScore);
    } else if (sortOption === 'alpha') {
      list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    }

    return list;
  }, [crossResults, operationFilter, onlyQuranic, onlyReversed, filterSearch, sortOption]);

  const { allCount, decCount, encCount, quranicFilteredCount, reversedFilteredCount } = useMemo(() => {
    let all = 0;
    let dec = 0;
    let enc = 0;
    let qCount = 0;
    let rCount = 0;

    for (const r of crossResults) {
      const hasDec = r.quranicMatches.some((m) => m.source === 'dec') || r.dictMatches.some((m) => m.source === 'dec');
      const hasEnc = r.quranicMatches.some((m) => m.source === 'enc') || r.dictMatches.some((m) => m.source === 'enc');

      all++;
      if (hasDec) dec++;
      if (hasEnc) enc++;

      const matchesActiveOp = (m: { source: 'plain' | 'enc' | 'dec' }) => {
        if (operationFilter === 'decrypted') return m.source === 'dec';
        if (operationFilter === 'encrypted') return m.source === 'enc';
        return true;
      };

      const hasQ = r.quranicMatches.some(matchesActiveOp);
      const hasR =
        r.quranicMatches.some((m) => matchesActiveOp(m) && m.isReversed) ||
        r.dictMatches.some((m) => matchesActiveOp(m) && m.isReversed);

      if (hasQ) qCount++;
      if (hasR) rCount++;
    }

    return {
      allCount: all,
      decCount: dec,
      encCount: enc,
      quranicFilteredCount: qCount,
      reversedFilteredCount: rCount,
    };
  }, [crossResults, operationFilter]);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-md p-4 sm:p-5 space-y-4 text-right dir-rtl">
      {/* Clean Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
              البحث الشامل
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              تقاطعات جداول السماء مع الأرض
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDrawer('systems')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="فتح مفكرة الشيفرات والمنظومات المحفوظة"
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>مفكرة الشيفرات</span>
            {savedSystems.length > 0 && (
              <span className="font-mono text-3xs px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-black">
                {savedSystems.length}
              </span>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Applied System Toast Banner */}
      {appliedSystemName && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              تم تفعيل <strong>{appliedSystemName}</strong> بنجاح!
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer text-2xs"
            >
              <span>العودة للمترجم</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      )}


      {/* Progress Bar */}
      {isScanning && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-stone-800 dark:text-stone-200">
            <span className="truncate max-w-[80%]">جاري الفحص... ({currentScanningName})</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">{scanProgress}%</span>
          </div>
          <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
          </div>
        </div>
      )}

      {/* Sort & Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-1 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Buttons */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200 dark:border-stone-800 shrink-0">
            <span className="text-3xs font-bold text-stone-400 px-1.5 flex items-center gap-0.5">
              <ArrowUpDown className="w-3 h-3" />
              <span>فرز:</span>
            </span>
            <button
              type="button"
              onClick={() => setSortOption('quranic')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOption === 'quranic'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>قرآني أولاً</span>
            </button>
            <button
              type="button"
              onClick={() => setSortOption('score')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOption === 'score'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>الأعلى جودة</span>
            </button>
            <button
              type="button"
              onClick={() => setSortOption('alpha')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOption === 'alpha'
                  ? 'bg-stone-800 dark:bg-stone-700 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <span>أبجدي</span>
            </button>
          </div>

          {/* Filter Type Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Operation Selector: الكل / فك تشفير / تشفير */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setOperationFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                  operationFilter === 'all'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                الكل ({allCount})
              </button>
              <button
                type="button"
                onClick={() => setOperationFilter('decrypted')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  operationFilter === 'decrypted'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-indigo-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>فك تشفير ({decCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setOperationFilter('encrypted')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  operationFilter === 'encrypted'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-amber-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>تشفير ({encCount})</span>
              </button>
            </div>

            {/* Combinable Toggle Badges: قرآني فقط و معكوسة */}
            <button
              type="button"
              onClick={() => setOnlyQuranic((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-2xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                onlyQuranic
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-950 text-emerald-800 dark:text-emerald-300 border-stone-200 dark:border-stone-800 hover:border-emerald-400'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>قرآني فقط {quranicFilteredCount > 0 ? `(${quranicFilteredCount})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyReversed((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-2xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                onlyReversed
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-950 text-rose-800 dark:text-rose-300 border-stone-200 dark:border-stone-800 hover:border-rose-400'
              }`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>معكوسة {reversedFilteredCount > 0 ? `(${reversedFilteredCount})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="بحث سريع في النتائج..."
          className="w-full lg:w-48 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Symbol Legend (مفتاح الدلالات) */}
      <div className="flex items-center gap-3 flex-wrap text-2xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300">
        <span className="font-extrabold text-stone-800 dark:text-stone-200 shrink-0">المفتاح:</span>

        {/* تمييز الإطارات: قرآني ومعجمي */}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border-2 border-emerald-500 dark:border-emerald-400 font-bold text-emerald-800 dark:text-emerald-300">
          <span>إطار أخضر: كلمة قرآنية</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-700 dark:text-stone-300">
          <span>إطار رمادي: كلمة معجمية</span>
        </span>

        {/* خلفيات الكلمات: فك تشفير وتشفير وأصلية */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
          <span>خلفية زرقاء: فك تشفير</span>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
          <span>خلفية برتقالية: تشفير</span>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
          <span>خلفية رمادية: أصلية</span>
        </span>

        {/* رمز المعكوس */}
        <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
          <RotateCcw className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
          <span>رمز 🔄: كلمة معكوسة</span>
        </span>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-2xs font-bold text-stone-500 dark:text-stone-400 px-1">
        <span>يوجد {filteredAndSortedResults.length} نتيجة متطابقة</span>
        {(operationFilter !== 'all' || onlyQuranic || onlyReversed || filterSearch.trim() !== '') && (
          <button
            type="button"
            onClick={() => {
              setOperationFilter('all');
              setOnlyQuranic(false);
              setOnlyReversed(false);
              setFilterSearch('');
            }}
            className="text-amber-600 hover:underline cursor-pointer"
          >
            إلغاء التصفية
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-2.5 pt-1">
        {filteredAndSortedResults.map((match) => {
          const isApplied = appliedSystemId === match.id;
          const isExpanded = !!expandedCards[match.id];

          return (
            <div
              key={match.id}
              onClick={(e) => handleApplyCustomLayers(match, e)}
              className={`group rounded-2xl border transition-all cursor-pointer p-3 space-y-2 ${
                isApplied
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-amber-500/60 hover:shadow-sm'
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                    ⚡
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {match.label}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto">
                  {/* Save to Notebook Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaveModalTarget(match);
                    }}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSystemSaved(match.label)
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs'
                        : 'bg-stone-50 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-200 border-stone-200 dark:border-stone-700'
                    }`}
                    title="حفظ هذه المنظومة في مفكرة الشيفرات مع ملاحظاتك للرجوع إليها وتفعيلها لاحقاً"
                  >
                    <BookmarkPlus className={`w-3.5 h-3.5 ${isSystemSaved(match.label) ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`} />
                    <span className="hidden sm:inline">
                      {isSystemSaved(match.label) ? 'محفوظة بالمفكرة ✓' : 'حفظ بالمفكرة'}
                    </span>
                    <span className="sm:hidden">
                      {isSystemSaved(match.label) ? 'محفوظة ✓' : 'حفظ'}
                    </span>
                  </button>

                  {/* Accordion Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleExpandCard(match.id, e)}
                    className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    title="تفاصيل"
                  >
                    <Info className="w-3 h-3 text-amber-500" />
                    <span>{isExpanded ? 'إخفاء ▴' : 'تفاصيل ▾'}</span>
                  </button>

                  {/* Apply / Activate Button */}
                  <button
                    type="button"
                    onClick={(e) => handleApplyCustomLayers(match, e)}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مفعل ✓</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>تفعيل ↗</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Accordion Drawer */}
              {isExpanded && (
                <div className="p-2 bg-stone-50/90 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-1.5 text-xs">
                  {(match.nooraniSourceLabel || match.arabicSourceLabel) && (
                    <div className="flex items-center gap-2 flex-wrap text-3xs">
                      {match.nooraniSourceLabel && (
                        <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-medium">
                          ✨ السماء: <strong className="font-extrabold">{match.nooraniSourceLabel}</strong>
                        </span>
                      )}
                      {match.arabicSourceLabel && (
                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
                          🌍 الأرض: <strong className="font-extrabold">{match.arabicSourceLabel}</strong>
                        </span>
                      )}
                      {includeWaw && (
                        <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-700 font-extrabold text-3xs">
                          ✨ تم ضم حرف (و) للأحرف السماوية في صفوف (ن، ق، ص)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-3xs flex-wrap">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      مؤشر التماسك: {match.coherenceScore} pt
                    </span>
                    {match.canonicalCipher && (
                      <span className="text-stone-500 dark:text-stone-400">
                        الشفرة: <strong className="font-['Amiri',serif] text-xs text-stone-800 dark:text-amber-200">{match.canonicalCipher}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Words Grid */}
              <div className="flex flex-wrap gap-2 items-center pt-1">
                {/* Quranic Matches (إطار أخضر زمردي مميز) */}
                {match.displayedQuranicMatches.map((qm, idx) => (
                  <div
                    key={`cq-${idx}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-2xs font-['Amiri',serif] border-2 border-emerald-500 dark:border-emerald-400 ${
                      qm.source === 'dec'
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                        : qm.source === 'enc'
                        ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100'
                        : 'bg-stone-100 dark:bg-stone-850 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <span className="text-sm font-bold">{qm.word}</span>

                    {/* رمز المعكوس القديم فقط عند اللزوم */}
                    {qm.isReversed && (
                      <RotateCcw
                        className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0"
                        title="معكوسة (قراءة مقلوبة)"
                      />
                    )}
                  </div>
                ))}

                {/* Dictionary Matches (إطار رمادي معجمي) */}
                {match.displayedDictMatches.map((dm, idx) => (
                  <div
                    key={`cd-${idx}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-2xs font-medium font-['Amiri',serif] border border-stone-300 dark:border-stone-700 ${
                      dm.source === 'dec'
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : dm.source === 'enc'
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{dm.word}</span>

                    {dm.isReversed && (
                      <RotateCcw
                        className="w-2 h-2 text-rose-600 dark:text-rose-400 shrink-0"
                        title="معكوسة (قراءة مقلوبة)"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {!isScanning && filteredAndSortedResults.length === 0 && (
          <div className="text-center py-8 text-xs text-stone-500 dark:text-stone-400 space-y-2">
            <p>لا توجد نتائج تطابق خيارات الفرز الحالية.</p>
          </div>
        )}
      </div>

      {/* Save System to Notebook Modal */}
      {saveModalTarget && (
        <SaveSystemModal
          isOpen={!!saveModalTarget}
          onClose={() => setSaveModalTarget(null)}
          defaultName={saveModalTarget.label}
          nooraniName={saveModalTarget.nooraniSourceLabel}
          arabicName={saveModalTarget.arabicSourceLabel}
          includeWaw={includeWaw}
          layers={saveModalTarget.layers}
        />
      )}
    </div>
  );
}
