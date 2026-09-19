import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import {
  getAllSearchableSystems,
  analyzeSystemForSearch,
  SystemDefinition,
  SystemScanMatch,
  MatchedQuranWord
} from '../utils/multiSystemSearch';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import { QuranicWordMeta, getQuranTopWordUrl } from '../utils/quranicDictionary';
import {
  Search,
  Sparkles,
  Layers,
  Check,
  Copy,
  ExternalLink,
  BookOpen,
  StopCircle,
  Play,
  RotateCcw,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Unlock,
  Lock,
  RefreshCw
} from 'lucide-react';

interface MultiSystemScannerProps {
  initialQuery?: string;
  onApplySystem?: (layers: any[], name: string) => void;
  onClose?: () => void;
}

export function MultiSystemScanner({ initialQuery = '', onApplySystem, onClose }: MultiSystemScannerProps) {
  const { savedTables, importLayersJson, setActiveTableName } = useCipherLayers();

  const [queryText, setQueryText] = useState(initialQuery);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanningName, setCurrentScanningName] = useState('');
  const [results, setResults] = useState<SystemScanMatch[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'quranic' | 'dictionary' | 'openings'>('quranic');
  const [filterSearch, setFilterSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedSystemId, setAppliedSystemId] = useState<string | null>(null);
  const [scanStats, setScanStats] = useState<{ total: number; matched: number; quranicCount: number; dictCount: number } | null>(null);

  const isCancelledRef = useRef(false);

  const allSystems = useMemo(() => getAllSearchableSystems(savedTables), [savedTables]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplySystem = (match: SystemScanMatch) => {
    if (onApplySystem) {
      onApplySystem(match.layers, match.systemName);
    } else {
      importLayersJson(JSON.stringify(match.layers));
      setActiveTableName(match.systemName);
    }
    setAppliedSystemId(match.systemId);
    setTimeout(() => setAppliedSystemId(null), 3000);
  };

  const cancelScan = () => {
    isCancelledRef.current = true;
    setIsScanning(false);
  };

  const runMultiSystemScan = useCallback(async (textToScan: string) => {
    const trimmed = textToScan.trim();
    if (!trimmed) return;

    isCancelledRef.current = false;
    setIsScanning(true);
    setScanProgress(0);
    setResults([]);
    setScanStats(null);

    const systems = getAllSearchableSystems(savedTables);
    const total = systems.length;
    const accumulatedResults: SystemScanMatch[] = [];

    let totalQuranic = 0;
    let totalDict = 0;

    for (let i = 0; i < total; i++) {
      if (isCancelledRef.current) {
        break;
      }

      const sys = systems[i];
      setCurrentScanningName(sys.name);
      setScanProgress(Math.round(((i + 1) / total) * 100));

      // Analyze the system
      const match = analyzeSystemForSearch(sys, trimmed);
      accumulatedResults.push(match);

      totalQuranic += match.quranicMatches.length;
      totalDict += match.dictMatches.length;

      // Yield control every 2 systems to keep UI 100% smooth and responsive
      if (i % 2 === 0 || i === total - 1) {
        setResults([...accumulatedResults]);
        await new Promise((resolve) => setTimeout(resolve, 6));
      }
    }

    setIsScanning(false);
    setScanProgress(100);
    setCurrentScanningName('');

    const matchedSystemsCount = accumulatedResults.filter((r) => r.totalMatchesCount > 0).length;
    setScanStats({
      total,
      matched: matchedSystemsCount,
      quranicCount: totalQuranic,
      dictCount: totalDict,
    });

    // Auto switch filter if no quranic matches but some dictionary matches exist
    if (totalQuranic === 0 && totalDict > 0) {
      setActiveFilter('dictionary');
    } else if (totalQuranic === 0 && totalDict === 0) {
      setActiveFilter('all');
    }
  }, [savedTables]);

  // Sync with initialQuery when passed or updated from parent
  useEffect(() => {
    const target = initialQuery.trim();
    if (target) {
      setQueryText(target);
      runMultiSystemScan(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Filtered & Sorted Results
  const filteredResults = useMemo(() => {
    let list = results;

    if (activeFilter === 'quranic') {
      list = list.filter((r) => r.quranicMatches.length > 0);
    } else if (activeFilter === 'dictionary') {
      list = list.filter((r) => r.dictMatches.length > 0);
    } else if (activeFilter === 'openings') {
      list = list.filter((r) => r.hasQuranicOpenings);
    }

    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.systemName.toLowerCase().includes(q) ||
          String(r.systemNumber).includes(q) ||
          r.canonicalCipher.includes(q) ||
          r.encryption.quranicMatches.some((m) => m.word.includes(q)) ||
          r.decryption.quranicMatches.some((m) => m.word.includes(q)) ||
          r.encryption.dictMatches.some((d) => d.word.includes(q)) ||
          r.decryption.dictMatches.some((d) => d.word.includes(q))
      );
    }

    // Sort by total matches descending
    return list.sort((a, b) => b.totalMatchesCount - a.totalMatchesCount);
  }, [results, activeFilter, filterSearch]);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
              محرك البحث والمسح الشامل عبر كافة المنظومات ({allSystems.length} منظومة مفحوصة)
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            فحص متزامن للكلمة واستخراج نتائج التشفير وفك التشفير والتطابقات القرآنية والمعجمية مع أرقام المنظومات
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            إغلاق المحرك
          </button>
        )}
      </div>

      {/* Target Word Display & Action Bar */}
      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0">
            النص المفحوص:
          </span>
          <div className="text-xl sm:text-2xl font-black font-['Amiri',serif] text-stone-900 dark:text-amber-300 tracking-wider truncate">
            {queryText || initialQuery || '—'}
          </div>
          {queryText && (
            <span className="text-2xs px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono">
              ({queryText.length} أحرف)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isScanning ? (
            <button
              type="button"
              onClick={cancelScan}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>إيقاف الفحص</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runMultiSystemScan(queryText || initialQuery)}
              disabled={!(queryText || initialQuery).trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة فحص كافة المنظومات</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar with Scanning Info */}
      {isScanning && (
        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>جاري الفحص السلس عبر المنظومات...</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono text-2xs truncate max-w-[200px] sm:max-w-md">
                ({currentScanningName})
              </span>
            </div>
            <span className="font-mono text-amber-600 dark:text-amber-400">{scanProgress}%</span>
          </div>

          <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-150 ease-out"
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-2xs text-stone-500 dark:text-stone-400">
            <span>تم رصد {results.filter((r) => r.totalMatchesCount > 0).length} منظومة ذات نتائج حتى الآن</span>
            <button
              type="button"
              onClick={cancelScan}
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
            >
              إيقاف الفحص
            </button>
          </div>
        </div>
      )}

      {/* Stats and Filter Controls */}
      {results.length > 0 && (
        <div className="space-y-3 pt-1">
          {scanStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-stone-50 dark:bg-stone-950 p-2 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="block text-stone-500 dark:text-stone-400 text-2xs">المنظومات المفحوصة</span>
                <span className="font-bold text-stone-900 dark:text-white font-mono">{scanStats.total}</span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-950 p-2 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="block text-stone-500 dark:text-stone-400 text-2xs">منظومات بتطابق</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{scanStats.matched}</span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-950 p-2 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="block text-stone-500 dark:text-stone-400 text-2xs">كلمات قرآنية مكتشفة</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{scanStats.quranicCount}</span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-950 p-2 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="block text-stone-500 dark:text-stone-400 text-2xs">كلمات معجمية مكتشفة</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{scanStats.dictCount}</span>
              </div>
            </div>
          )}

          {/* Filter Tabs & Quick Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('quranic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'quranic'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                ⭐ تطابقات قرآنية ({results.filter((r) => r.quranicMatches.length > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('dictionary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'dictionary'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                📖 تطابقات معجمية ({results.filter((r) => r.dictMatches.length > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('openings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'openings'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                📜 فواتح سور ({results.filter((r) => r.hasQuranicOpenings).length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                الكل ({results.length})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="تصفية باسم أو رقم المنظومة أو كلمة..."
                className="w-full sm:w-60 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3.5">
        {filteredResults.length === 0 && results.length > 0 && (
          <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs bg-stone-50 dark:bg-stone-950/40 rounded-xl border border-stone-200 dark:border-stone-800">
            لا توجد منظومات تطابق معيار التصفية المختار. جرب تبديل التبويب إلى (الكل).
          </div>
        )}

        {filteredResults.map((match) => (
          <div
            key={match.systemId}
            className={`rounded-xl border p-3.5 sm:p-4 transition-all space-y-3 ${
              match.totalMatchesCount > 0
                ? 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-amber-500/40 shadow-2xs'
                : 'bg-stone-50/50 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/60 opacity-85'
            }`}
          >
            {/* System Card Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400 font-mono font-black text-xs">
                  #{String(match.systemNumber).padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-stone-900 dark:text-white">
                  {match.systemName}
                </span>

                {match.category === 'standard' && (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    منظومة معيارية
                  </span>
                )}
                {match.category === 'saved' && (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                    منظومة مخصصة
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySystem(match)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-amber-600 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                  title="اعتماد وتطبيق هذه المنظومة كالمنظومة النشطة في التطبيق"
                >
                  {appliedSystemId === match.systemId ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">تم التطبيق بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>تطبيق هذه المنظومة</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Comprehensive Dual View: Section 1 (Encryption) & Section 2 (Decryption) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              
              {/* Box 1: Encryption Results for this System */}
              <div className="bg-amber-50/40 dark:bg-stone-900/80 rounded-xl p-3 border border-amber-200/70 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/50 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>نتائج التشفير (أحرف الشفرة وتوافيقها)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(match.encryption.canonicalCipher, `enc_c_${match.systemId}`)}
                    className="text-3xs text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === `enc_c_${match.systemId}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الشفرة</span>
                  </button>
                </div>

                {/* Primary Cipher Output */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-stone-950 border border-amber-200/60 dark:border-stone-800">
                  <span className="text-3xs font-extrabold text-amber-600">الشفرة الناتجة:</span>
                  <span className="text-lg font-black font-['Amiri',serif] text-stone-900 dark:text-stone-100 tracking-wider">
                    {match.encryption.canonicalCipher || '—'}
                  </span>
                </div>

                {/* Noorani Segments */}
                {match.encryption.cipherSegmentation.segments.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-3xs text-stone-500 font-bold">فواتح السور:</span>
                    <NooraniSegmentsBadge segmentation={match.encryption.cipherSegmentation} />
                  </div>
                )}

                {/* Encryption Quranic Matches */}
                {match.encryption.quranicMatches.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-3xs font-extrabold text-emerald-700 dark:text-emerald-400 block">
                      مطابقات قرآنية من الشفرة ({match.encryption.quranicMatches.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {match.encryption.quranicMatches.map((qm, qIdx) => (
                        <span
                          key={qIdx}
                          onClick={() => handleCopy(qm.word, `enc_q_${match.systemId}_${qIdx}`)}
                          className="inline-flex items-center gap-1 bg-white dark:bg-stone-950 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded text-2xs font-bold shadow-2xs hover:border-emerald-500 cursor-pointer"
                          title={`انقر لنسخ (${qm.word}) - ${qm.meta.surahName} آية ${qm.meta.ayahNum}`}
                        >
                          <span>{qm.word}</span>
                          <span className="text-3xs text-stone-400 font-normal">
                            ({qm.meta.surahName})
                          </span>
                          {qm.isReversed && <RotateCcw className="w-2.5 h-2.5 text-amber-600 shrink-0" title="معكوس" />}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-3xs text-stone-400">
                    لا توجد مطابقات قرآنية مباشرة من أحرف التشفير في هذه المنظومة.
                  </div>
                )}

                {/* Encryption Dictionary Matches */}
                {match.encryption.dictMatches.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-amber-200/40 dark:border-stone-800/80">
                    <span className="text-3xs font-bold text-stone-600 dark:text-stone-400 block">
                      كلمات معجمية ({match.encryption.dictMatches.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {match.encryption.dictMatches.map((dm, dIdx) => (
                        <span
                          key={dIdx}
                          onClick={() => handleCopy(dm.word, `enc_d_${match.systemId}_${dIdx}`)}
                          className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-3xs font-semibold cursor-pointer"
                          title="انقر للنسخ"
                        >
                          {dm.word}
                          {dm.isReversed && <RotateCcw className="w-2 h-2 text-stone-400 inline ms-0.5" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Decryption Results for this System */}
              <div className="bg-emerald-50/40 dark:bg-stone-900/80 rounded-xl p-3 border border-emerald-200/70 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نتائج فك التشفير (فك الحروف وتوافيقها)</span>
                  </div>
                </div>

                {/* Decryption Quranic Matches */}
                {match.decryption.quranicMatches.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-3xs font-extrabold text-emerald-700 dark:text-emerald-400 block">
                      مطابقات قرآنية من فك التشفير ({match.decryption.quranicMatches.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {match.decryption.quranicMatches.map((qm, qIdx) => (
                        <span
                          key={qIdx}
                          onClick={() => handleCopy(qm.word, `dec_q_${match.systemId}_${qIdx}`)}
                          className="inline-flex items-center gap-1 bg-white dark:bg-stone-950 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded text-2xs font-bold shadow-2xs hover:border-emerald-500 cursor-pointer"
                          title={`انقر لنسخ (${qm.word}) - ${qm.meta.surahName} آية ${qm.meta.ayahNum}`}
                        >
                          <span>{qm.word}</span>
                          <span className="text-3xs text-stone-400 font-normal">
                            ({qm.meta.surahName})
                          </span>
                          {qm.isReversed && <RotateCcw className="w-2.5 h-2.5 text-emerald-600 shrink-0" title="معكوس" />}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-3xs text-stone-400 py-1">
                    لا توجد مطابقات قرآنية مباشرة من فك التشفير في هذه المنظومة.
                  </div>
                )}

                {/* Decryption Dictionary Matches */}
                {match.decryption.dictMatches.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-emerald-200/40 dark:border-stone-800/80">
                    <span className="text-3xs font-bold text-blue-700 dark:text-blue-400 block">
                      كلمات معجمية من فك التشفير ({match.decryption.dictMatches.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {match.decryption.dictMatches.map((dm, dIdx) => (
                        <span
                          key={dIdx}
                          onClick={() => handleCopy(dm.word, `dec_d_${match.systemId}_${dIdx}`)}
                          className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-950 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-3xs font-semibold cursor-pointer"
                          title="انقر للنسخ"
                        >
                          {dm.word}
                          {dm.isReversed && <RotateCcw className="w-2 h-2 text-blue-400 inline ms-0.5" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Decryption Permutations */}
                {match.decryption.combinationsSample.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-stone-200/40 dark:border-stone-800/80">
                    <span className="text-3xs text-stone-400 block">
                      عينة من احتمالات فك الشفرة:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {match.decryption.combinationsSample.slice(0, 6).map((item, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 font-mono text-3xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
