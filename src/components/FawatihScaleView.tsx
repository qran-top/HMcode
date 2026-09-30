import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scale,
  Sparkles,
  Search,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Info,
} from 'lucide-react';
import {
  FawatihMatchMode,
  FawatihCalculationMode,
  FawatihAnalysisResult,
  FawatihSurahDistribution,
  PeerQuranicWordMatch,
  analyzeWordFawatihDistribution,
  findPeerQuranicWordsByValue,
} from '../utils/fawatihScaleEngine';
import { useTheme } from '../context/ThemeContext';
import { useHint } from '../context/HintContext';
import { getQuranTopSearchUrl } from '../utils/quranicDictionary';

interface FawatihScaleViewProps {
  initialQuery?: string;
  onNavigateToGematria?: (text: string) => void;
}

const PRESET_WORDS = [
  'كتاب',
  'القرآن',
  'الله',
  'الحق',
  'الهدى',
  'نور',
  'علم',
  'رسول',
  'آيات',
  'حكمة',
  'رحمة',
];

export function FawatihScaleView({ initialQuery = 'كتاب', onNavigateToGematria }: FawatihScaleViewProps) {
  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint } = useHint();

  const [query, setQuery] = useState<string>(() => initialQuery || 'كتاب');
  const [matchMode, setMatchMode] = useState<FawatihMatchMode>('exact');
  const [calcMode, setCalcMode] = useState<FawatihCalculationMode>('total_frequency');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<FawatihAnalysisResult | null>(null);
  const [peerMatches, setPeerMatches] = useState<PeerQuranicWordMatch[]>([]);
  const [isPeerLoading, setIsPeerLoading] = useState<boolean>(false);

  // Selected Surah to inspect Ayahs
  const [selectedSurah, setSelectedSurah] = useState<FawatihSurahDistribution | null>(null);

  // Copy states
  const [copiedPure, setCopiedPure] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // Peer results sorting & search
  const [peerSearchQuery, setPeerSearchQuery] = useState<string>('');
  const [peerSortBy, setPeerSortBy] = useState<'quran_freq' | 'abjad' | 'alpha'>('quran_freq');

  // Run analysis when query or modes change
  const runAnalysis = useCallback(async (searchWord: string, mMode: FawatihMatchMode, cMode: FawatihCalculationMode) => {
    const trimmed = searchWord.trim();
    if (!trimmed) {
      setAnalysis(null);
      setPeerMatches([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeWordFawatihDistribution(trimmed, mMode, cMode);
      setAnalysis(result);
      if (selectedSurah) {
        const updatedSurah = result.distribution.find((s) => s.surahNumber === selectedSurah.surahNumber);
        setSelectedSurah(updatedSurah || null);
      }

      // Load Peer Words with the exact same value
      if (result.primaryValue > 0) {
        setIsPeerLoading(true);
        const peers = await findPeerQuranicWordsByValue(result.primaryValue, cMode, trimmed);
        setPeerMatches(peers);
        setIsPeerLoading(false);
      } else {
        setPeerMatches([]);
      }
    } catch (e) {
      console.error('Fawatih scale analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSurah]);

  useEffect(() => {
    runAnalysis(query, matchMode, calcMode);
  }, [query, matchMode, calcMode]);

  // Filter and sort peer matches
  const filteredPeers = useMemo(() => {
    let list = [...peerMatches];
    if (peerSearchQuery.trim()) {
      const q = peerSearchQuery.trim();
      list = list.filter((p) => p.word.includes(q) || p.cleanWord.includes(q));
    }

    if (peerSortBy === 'quran_freq') {
      list.sort((a, b) => b.totalQuranOccurrences - a.totalQuranOccurrences);
    } else if (peerSortBy === 'abjad') {
      list.sort((a, b) => b.abjadValue - a.abjadValue);
    } else if (peerSortBy === 'alpha') {
      list.sort((a, b) => a.word.localeCompare(b.word));
    }

    return list;
  }, [peerMatches, peerSearchQuery, peerSortBy]);

  const handleCopyPure = () => {
    if (filteredPeers.length === 0) return;
    const wordsOnly = filteredPeers.map((p) => p.word.trim()).filter(Boolean);
    navigator.clipboard.writeText(wordsOnly.join('\n'));
    setCopiedPure(true);
    setTimeout(() => setCopiedPure(false), 2000);
  };

  const handleCopyDetailed = () => {
    if (!analysis || filteredPeers.length === 0) return;
    const lines = [
      `ميزان الفواتح للكلمة «${analysis.query}» [القيمة: ${analysis.primaryValue}]:`,
      `المجموع في الفواتح: ${analysis.totalFrequency} | الميزان المرجّح: ${analysis.weightedBalance} | عدد السور: ${analysis.surahCoverage}/29`,
      '',
      `الكلمات القرآنية النظيرة المتطابقة في القيمة (${filteredPeers.length} كلمة):`,
      ...filteredPeers.map(
        (p, idx) =>
          `${idx + 1}. ${p.word} (القيمة: ${p.calculatedValue} | تكرار الفواتح: ${p.totalFrequency} | المصحف: ${p.totalQuranOccurrences} | جُمّل: ${p.abjadValue})`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto" dir="rtl">
      {/* Top Header Card */}
      <div
        style={{ backgroundColor: 'var(--dos-panel, #000088)', borderColor: 'var(--dos-border, #55ffff)' }}
        className="p-3 sm:p-4 rounded-xl border-2 shadow-md space-y-3 font-mono"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--dos-border)]/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ffff55] text-black shadow-xs font-black">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#ffff55] flex items-center gap-2">
                <span>ميزان الفواتح • البصمة التكرارية في سور الأحرف المقطعة الـ 29</span>
              </h2>
              <p className="text-3xs text-[#55ffff]">
                عدّ تكرار أي كلمة في سور الفواتح الـ 29 واستخراج الكلمات القرآنية النظيرة المتطابقة في القيمة
              </p>
            </div>
          </div>

          {/* Preset Quick Chips */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-4xs text-stone-300">كلمات سريعة:</span>
            {PRESET_WORDS.slice(0, 6).map((pw) => (
              <button
                key={pw}
                type="button"
                onClick={() => {
                  setQuery(pw);
                  if (isDos) playDosBeep(880, 20);
                }}
                className={`px-1.5 py-0.5 rounded text-3xs font-quran font-bold cursor-pointer transition-none border ${
                  query === pw
                    ? 'bg-[#ffff55] text-black border-white shadow-xs'
                    : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#0000aa] hover:text-white'
                }`}
              >
                {pw}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Row */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب كلمة للبحث (مثال: كتاب، القرآن، نور، علم...)"
              className="w-full text-sm sm:text-base font-quran font-bold h-10 px-3 pr-8 rounded-xl border-2 border-[var(--dos-border)] bg-black text-[#55ff55] placeholder:text-[#55ffff]/40 focus:outline-none focus:ring-2 focus:ring-[#ffff55] text-right"
            />
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dos-border)] pointer-events-none" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                title="مسح"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Gematria Jump Button */}
          {onNavigateToGematria && query.trim() && (
            <button
              type="button"
              onClick={() => onNavigateToGematria(query.trim())}
              className="h-10 px-3 rounded-xl bg-[#00aa00] text-white hover:bg-[#00dd00] hover:text-black border border-white cursor-pointer text-xs font-bold inline-flex items-center gap-1 shrink-0 shadow-xs"
              title="فحص الكلمة في مطابق السلاسل والجُمّل"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>فحص السلاسل</span>
            </button>
          )}
        </div>

        {/* Control Toggles: Match Mode (الخيار 1) & Calculation Mode (الخيار 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-[var(--dos-border)]/40 text-xs">
          {/* 1. Match Mode Options */}
          <div className="flex items-center gap-1.5 flex-wrap bg-black/50 p-1.5 rounded-lg border border-[var(--dos-border)]/50">
            <span className="text-[#ffff55] font-bold text-3xs shrink-0 ml-1">نوع المطابقة:</span>
            <button
              type="button"
              onClick={() => {
                setMatchMode('exact');
                if (isDos) playDosBeep(700, 20);
              }}
              onMouseEnter={() => setHintText('مطابقة تامة ومجردة: احتساب الكلمة بصيغتها المباشرة فقط بعد تجريد علامات التشكيل وأل التعريف')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 rounded text-3xs font-bold cursor-pointer transition-none border flex items-center gap-1 ${
                matchMode === 'exact'
                  ? 'bg-[#ffff55] text-black border-white shadow-xs font-black'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#000088]'
              }`}
            >
              <span>مطابقة تامة ومجردة</span>
              {matchMode === 'exact' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setMatchMode('morphological');
                if (isDos) playDosBeep(850, 20);
              }}
              onMouseEnter={() => setHintText('شامل التصريفات واللواحق: احتساب الكلمة بكافة مشتقاتها ولواحقها وضمائرها المتصلة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 rounded text-3xs font-bold cursor-pointer transition-none border flex items-center gap-1 ${
                matchMode === 'morphological'
                  ? 'bg-[#ffff55] text-black border-white shadow-xs font-black'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#000088]'
              }`}
            >
              <span>شامل التصريفات واللواحق</span>
              {matchMode === 'morphological' && <span>✓</span>}
            </button>
          </div>

          {/* 2. Calculation Mode (The 3 Methods Requested by User) */}
          <div className="flex items-center gap-1.5 flex-wrap bg-black/50 p-1.5 rounded-lg border border-[var(--dos-border)]/50">
            <span className="text-[#ffff55] font-bold text-3xs shrink-0 ml-1">طريقة حساب القيمة:</span>
            <button
              type="button"
              onClick={() => {
                setCalcMode('total_frequency');
                if (isDos) playDosBeep(900, 20);
              }}
              onMouseEnter={() => setHintText('المجموع التكراري الإجمالي: جمع عدد مرات ظهور الكلمة عبر السور الـ 29 مجتمعة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 rounded text-3xs font-bold cursor-pointer transition-none border flex items-center gap-1 ${
                calcMode === 'total_frequency'
                  ? 'bg-[#00aa00] text-white border-white shadow-xs font-black'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#000088]'
              }`}
            >
              <span>١. المجموع التكراري</span>
              {calcMode === 'total_frequency' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setCalcMode('weighted_balance');
                if (isDos) playDosBeep(950, 20);
              }}
              onMouseEnter={() => setHintText('ميزان الفواتح المرجّح: ضرب تكرار الكلمة في كل سورة بقيمة جُمّل فاتحة تلك السورة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 rounded text-3xs font-bold cursor-pointer transition-none border flex items-center gap-1 ${
                calcMode === 'weighted_balance'
                  ? 'bg-[#00aa00] text-white border-white shadow-xs font-black'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#000088]'
              }`}
            >
              <span>٢. الميزان المرجّح (×الفاتحة)</span>
              {calcMode === 'weighted_balance' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setCalcMode('surah_coverage');
                if (isDos) playDosBeep(1000, 20);
              }}
              onMouseEnter={() => setHintText('رصيد السور: عدد السور التي وردت فيها الكلمة من أصل 29 سورة')}
              onMouseLeave={clearHint}
              className={`px-2 py-1 rounded text-3xs font-bold cursor-pointer transition-none border flex items-center gap-1 ${
                calcMode === 'surah_coverage'
                  ? 'bg-[#00aa00] text-white border-white shadow-xs font-black'
                  : 'bg-[#000044] text-[#55ffff] border-[#55ffff]/40 hover:bg-[#000088]'
              }`}
            >
              <span>٣. رصيد السور (/29)</span>
              {calcMode === 'surah_coverage' && <span>✓</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Dashboard Banner */}
      {analysis && (
        <div
          style={{ backgroundColor: 'var(--dos-panel, #000055)', borderColor: 'var(--dos-border, #55ffff)' }}
          className="p-3.5 rounded-xl border-2 shadow-md space-y-2.5 font-mono"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#ffff55] font-bold">بصمة الكلمة:</span>
              <span className="text-base sm:text-lg font-quran font-black text-white bg-black px-2.5 py-0.5 rounded border border-[#55ff55]">
                «{analysis.query}»
              </span>
              <span className="text-3xs text-[#55ffff]">
                (المصحف كاملاً: {analysis.totalQuranOccurrences} مرة)
              </span>
            </div>

            {/* 3 Summary Values Strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                  calcMode === 'total_frequency'
                    ? 'bg-[#008800] text-white border-[#55ff55] font-black ring-1 ring-white'
                    : 'bg-black/60 text-[#55ffff] border-[var(--dos-border)]/50'
                }`}
              >
                <span className="text-3xs">المجموع التكراري:</span>
                <strong className="text-sm sm:text-base font-black font-mono">
                  {analysis.totalFrequency}
                </strong>
              </div>

              <div
                className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                  calcMode === 'weighted_balance'
                    ? 'bg-[#008800] text-white border-[#55ff55] font-black ring-1 ring-white'
                    : 'bg-black/60 text-[#55ffff] border-[var(--dos-border)]/50'
                }`}
              >
                <span className="text-3xs">الميزان المرجّح:</span>
                <strong className="text-sm sm:text-base font-black font-mono">
                  {analysis.weightedBalance}
                </strong>
              </div>

              <div
                className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                  calcMode === 'surah_coverage'
                    ? 'bg-[#008800] text-white border-[#55ff55] font-black ring-1 ring-white'
                    : 'bg-black/60 text-[#55ffff] border-[var(--dos-border)]/50'
                }`}
              >
                <span className="text-3xs">السور الحاضرة:</span>
                <strong className="text-sm sm:text-base font-black font-mono">
                  {analysis.surahCoverage} <span className="text-4xs font-normal">من 29</span>
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 29 Interactive Fawatih Cards Strip (Strictly matching user uploaded image structure) */}
      {analysis && (
        <div
          style={{ backgroundColor: 'var(--dos-bg, #000000)', borderColor: 'var(--dos-border, #55ffff)' }}
          className="p-3 rounded-xl border-2 shadow-md space-y-2.5 font-mono"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--dos-border)]/30 pb-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>خريطة التوزيع في سور الفواتح الـ 29</span>
              </span>
              <span className="text-3xs text-stone-400 font-mono">
                (انقر على أي سورة لعرض الآيات التي وردت فيها فوراً)
              </span>
            </div>

            {selectedSurah && (
              <button
                type="button"
                onClick={() => setSelectedSurah(null)}
                className="text-3xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 cursor-pointer"
              >
                إغلاق تفاصيل سورة {selectedSurah.surahName} ✕
              </button>
            )}
          </div>

          {/* 29 Surah Grid - Matches exactly the 2-row layout in the image */}
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 gap-1.5">
            {analysis.distribution.map((item) => {
              const isSelected = selectedSurah?.surahNumber === item.surahNumber;
              const hasOccurrences = item.occurrences > 0;
              const isMax = analysis.maxSurah && analysis.maxSurah.occurrences > 0 && item.occurrences === analysis.maxSurah.occurrences;

              return (
                <button
                  key={item.surahNumber}
                  type="button"
                  onClick={() => {
                    setSelectedSurah(isSelected ? null : item);
                    if (isDos) playDosBeep(item.occurrences > 0 ? 980 : 440, 20);
                  }}
                  onMouseEnter={() =>
                    setHintText(
                      `سورة ${item.surahName} (${item.surahNumber}) ۞ الفاتحة: [${item.formula}] (قيمتها: ${item.formulaValue}) ۞ تكرار كلمة «${analysis.query}»: ${item.occurrences} مرة - انقر لعرض الآيات`
                    )
                  }
                  onMouseLeave={clearHint}
                  className={`relative flex flex-col items-center justify-between p-1.5 rounded-lg border text-center transition-all cursor-pointer min-h-[72px] ${
                    isSelected
                      ? 'bg-[#ffff55] text-black border-white ring-2 ring-white shadow-md font-bold'
                      : hasOccurrences
                      ? 'bg-[#002a22] text-[#55ff55] border-[#00aa88] hover:bg-[#004433] shadow-2xs'
                      : 'bg-[#0a0e14] text-[#446666] border-[#1a2e30] hover:bg-[#121c24]'
                  }`}
                  title={`سورة ${item.surahName} (${item.formula}): تكرار ${item.occurrences}`}
                >
                  {/* Fawatih Formula at top */}
                  <span
                    className={`font-quran text-xs sm:text-sm font-black leading-tight ${
                      isSelected ? 'text-black' : hasOccurrences ? 'text-[#55ffff]' : 'text-stone-500'
                    }`}
                  >
                    {item.formula}
                  </span>

                  {/* Surah Name in middle */}
                  <span
                    className={`text-3xs font-bold truncate max-w-full leading-tight my-0.5 ${
                      isSelected ? 'text-stone-900' : hasOccurrences ? 'text-stone-200' : 'text-stone-500'
                    }`}
                  >
                    {item.surahName}
                  </span>

                  {/* Occurrence Number at bottom (Prominent like in image) */}
                  <div className="flex items-center justify-center gap-0.5 w-full">
                    <span
                      className={`font-mono text-xs sm:text-sm font-black leading-none px-1 rounded ${
                        isSelected
                          ? 'bg-black text-[#ffff55]'
                          : isMax
                          ? 'bg-amber-500 text-black px-1.5 py-0.2 shadow-xs animate-pulse'
                          : hasOccurrences
                          ? 'text-[#55ff55]'
                          : 'text-stone-600'
                      }`}
                    >
                      {item.occurrences}
                    </span>
                    {isMax && (
                      <span className="text-[9px] text-amber-400" title="الأعلى تكراراً في الفواتح">🔥</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expanded Selected Surah Ayahs Drawer */}
          {selectedSurah && (
            <div className="mt-2.5 p-3 rounded-lg bg-black border-2 border-[#55ffff] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#ffff55] border-b border-stone-800 pb-1 flex-wrap">
                <span className="font-bold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    مواضع ورود «{analysis.query}» في سورة {selectedSurah.surahName} ({selectedSurah.occurrences} موضعاً • الفاتحة: {selectedSurah.formula}):
                  </span>
                </span>
                <a
                  href={getQuranTopSearchUrl(analysis.query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-3xs text-[#55ffff] hover:underline flex items-center gap-0.5"
                >
                  <span>بحث في المصحف كاملاً</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {selectedSurah.matchingAyahs.length === 0 ? (
                <p className="text-3xs text-stone-400 py-2 text-center">
                  لم ترد كلمة «{analysis.query}» في سورة {selectedSurah.surahName} (0 تكرار).
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedSurah.matchingAyahs.map((a) => (
                    <div
                      key={a.ayahNumber}
                      className="p-2 rounded bg-[#001c18] border border-[#006650] text-right text-xs leading-relaxed font-quran text-white"
                    >
                      <span className="font-mono text-3xs text-[#ffff55] font-bold ml-1.5">
                        [آية {a.ayahNumber}]:
                      </span>
                      <span>{a.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Peer Matching Quranic Words Section (الكلمات القرآنية النظيرة المتطابقة في القيمة) */}
      {analysis && (
        <div
          style={{ backgroundColor: 'var(--dos-panel, #000088)', borderColor: 'var(--dos-border, #55ffff)' }}
          className="p-3 sm:p-4 rounded-xl border-2 shadow-md space-y-3 font-mono"
        >
          {/* Peer Words Header & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--dos-border)]/40 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-[#ffff55] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#ffff55]" />
                <span>الكلمات القرآنية النظيرة المتطابقة في القيمة ({filteredPeers.length}):</span>
              </span>
              <span className="text-3xs text-[#55ff55] bg-black px-2 py-0.5 rounded border border-[#55ff55] font-bold">
                القيمة المستهدفة = {analysis.primaryValue}
              </span>
            </div>

            {/* Quick Actions & Sorting */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Search Filter inside Peer Words */}
              <div className="relative w-36 sm:w-44">
                <input
                  type="text"
                  value={peerSearchQuery}
                  onChange={(e) => setPeerSearchQuery(e.target.value)}
                  placeholder="تصفية الكلمات النظيرة..."
                  className="w-full text-3xs h-7 px-2 pr-6 rounded border border-[var(--dos-border)] bg-black text-[#55ff55] placeholder:text-stone-400 focus:outline-none text-right"
                />
                <Search className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded border border-[var(--dos-border)]/50 text-3xs">
                <button
                  type="button"
                  onClick={() => setPeerSortBy('quran_freq')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    peerSortBy === 'quran_freq'
                      ? 'bg-[#ffff55] text-black font-bold'
                      : 'text-[#55ffff] hover:text-white'
                  }`}
                  title="ترتيب بحسب تكرار الكلمة في القرآن الكريم"
                >
                  الأكثر تكراراً
                </button>
                <button
                  type="button"
                  onClick={() => setPeerSortBy('abjad')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    peerSortBy === 'abjad'
                      ? 'bg-[#ffff55] text-black font-bold'
                      : 'text-[#55ffff] hover:text-white'
                  }`}
                  title="ترتيب بحسب القيمة الجُمّلية الكبرى"
                >
                  الجُمّل
                </button>
              </div>

              {/* Copy Pure Button (نسخ مجرد) */}
              <button
                type="button"
                onClick={handleCopyPure}
                className={`px-2 py-1 h-7 rounded border text-3xs font-bold cursor-pointer transition-none inline-flex items-center gap-1 ${
                  copiedPure
                    ? 'bg-[#00aa00] text-white border-white'
                    : 'bg-[#000044] text-[#ffff55] border-[#55ffff]/50 hover:bg-[#0000aa] hover:text-white'
                }`}
                title="نسخ المفردات والكلمات فقط صافية دون أي أرقام أو تفاصيل"
              >
                {copiedPure ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPure ? 'تم نسخ المجرد' : 'نسخ مجرد'}</span>
              </button>

              {/* Copy Detailed Button (نسخ مفصل) */}
              <button
                type="button"
                onClick={handleCopyDetailed}
                className={`px-2 py-1 h-7 rounded border text-3xs font-bold cursor-pointer transition-none inline-flex items-center gap-1 ${
                  copiedAll
                    ? 'bg-stone-200 text-black border-white'
                    : 'bg-[#000044] text-stone-200 border-[#55ffff]/50 hover:bg-[#0000aa] hover:text-white'
                }`}
                title="نسخ كافة النتائج مع التفاصيل والقيم والتكرارات"
              >
                {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAll ? 'تم النسخ المفصل' : 'نسخ مفصل'}</span>
              </button>
            </div>
          </div>

          {/* Peer Words Results Grid */}
          {isPeerLoading ? (
            <div className="p-6 text-center text-xs text-[#55ffff] animate-pulse">
              جاري مسح ومطابقة المعجم القرآني الشامل...
            </div>
          ) : filteredPeers.length === 0 ? (
            <div className="p-5 text-center text-xs text-stone-400 bg-black/40 rounded-lg border border-[var(--dos-border)]/30">
              لا توجد كلمات قرآنية أخرى مطابقة للقيمة ({analysis.primaryValue}) في هذه الطريقة الحسابية.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredPeers.map((peer) => {
                const isCardCopied = copiedCardId === peer.cleanWord;

                return (
                  <div
                    key={peer.cleanWord}
                    onClick={() => {
                      setQuery(peer.word);
                      if (isDos) playDosBeep(920, 25);
                    }}
                    onMouseEnter={() =>
                      setHintText(
                        `كلمة قرانية: «${peer.word}» ۞ القيمة المحسوبة: ${peer.calculatedValue} ۞ تكرار الفواتح: ${peer.totalFrequency} ۞ السور الحاضرة: ${peer.surahCoverage}/29 ۞ تكرار المصحف كاملاً: ${peer.totalQuranOccurrences} ۞ جُمّل: ${peer.abjadValue} - انقر لتحليل توزيعها في السور الـ 29`
                      )
                    }
                    onMouseLeave={clearHint}
                    className="p-2.5 rounded-lg bg-black/80 hover:bg-[#002233] border border-[var(--dos-border)]/60 hover:border-white transition-all cursor-pointer flex flex-col justify-between gap-2 group shadow-2xs"
                    title={`انقر لتحليل توزيع «${peer.word}» في سور الفواتح الـ 29`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-quran text-sm sm:text-base font-bold text-white group-hover:text-[#ffff55]">
                        {peer.word}
                      </span>
                      <span className="font-mono text-xs font-black text-[#55ff55] bg-[#00290a] px-1.5 py-0.2 rounded border border-[#33ff33]">
                        = {peer.calculatedValue}
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center justify-between gap-1 text-3xs text-stone-300 font-mono pt-1 border-t border-stone-800">
                      <span>الفواتح: {peer.totalFrequency}م</span>
                      <span>السور: {peer.surahCoverage}/29</span>
                      <span className="text-[#55ffff]">المصحف: {peer.totalQuranOccurrences}</span>
                    </div>

                    {/* Bottom Action strip */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-800/80 text-4xs">
                      <span className="text-stone-400">جُمّل: {peer.abjadValue}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(peer.word);
                          setCopiedCardId(peer.cleanWord);
                          setTimeout(() => setCopiedCardId(null), 1500);
                        }}
                        className="p-1 hover:text-[#ffff55] text-stone-400 cursor-pointer"
                        title="نسخ الكلمة"
                      >
                        {isCardCopied ? <Check className="w-3 h-3 text-[#55ff55]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FawatihScaleView;
