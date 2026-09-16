import { useState, useMemo, useEffect, useRef } from 'react';
import {
  CIPHER_LAYERS,
  cleanText,
  VALID_CIPHER_LETTERS,
  LAYER_RAINBOW_COLORS,
} from '../cipherData';
import { CompactLayersIndicator } from './CompactLayersIndicator';
import { arabicDictionary } from '../utils/arabicDictionary';
import {
  quranicDictionary,
  QuranicWordMeta,
  getQuranTopAyahUrl,
  getQuranTopSearchUrl,
} from '../utils/quranicDictionary';
import { QuranicMatchBadge } from './QuranicMatchBadge';
import { ResultsSummaryBox } from './ResultsSummaryBox';
import {
  Copy,
  Check,
  Eraser,
  Layers,
  Loader2,
  AlertCircle,
  BookOpen,
  Filter,
  Sparkles,
  ArrowLeftRight,
  ExternalLink,
  Search,
} from 'lucide-react';

export function DecryptView() {
  const [cipherInput, setCipherInput] = useState('طسم');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [onlyShowDictionaryWords, setOnlyShowDictionaryWords] = useState(false);
  const [onlyQuranicWords, setOnlyQuranicWords] = useState(false);
  const [dictLoaded, setDictLoaded] = useState(arabicDictionary.isLoaded());
  const [dictLoadProgress, setDictLoadProgress] = useState(arabicDictionary.getProgress());
  const [quranicCount, setQuranicCount] = useState<number>(quranicDictionary.getWordCount());

  // Async chunked generation for decrypted words
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const generationRef = useRef<number>(0);

  // Subscribe to dictionary progress & completion
  useEffect(() => {
    const unsubscribe = arabicDictionary.subscribe((progress, done) => {
      setDictLoadProgress(progress);
      setDictLoaded(done);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Quranic dictionary
  useEffect(() => {
    const unsub = quranicDictionary.subscribe((_, count) => {
      setQuranicCount(count);
    });
    return unsub;
  }, []);

  // Strict input sanitizer: allow ONLY valid cipher letters, space, or newline
  const handleInputChange = (raw: string) => {
    const cleaned = cleanText(raw);
    const filtered = Array.from(cleaned)
      .filter((char) => VALID_CIPHER_LETTERS.has(char) || char === ' ' || char === '\n')
      .join('');
    setCipherInput(filtered);
  };

  const handleAppendChar = (char: string) => {
    setCipherInput((prev) => prev + char);
  };

  const cleanChars = Array.from(cleanText(cipherInput));

  const decodedItems = cleanChars.map((char) => {
    if (char === ' ' || char === '\n' || char === '\t') {
      return {
        char,
        isSpace: true,
        matchingLayer: null,
        candidates: [] as string[],
      };
    }

    const matchingLayer = CIPHER_LAYERS.find((l) =>
      l.cipherLetters.includes(char)
    );

    return {
      char,
      isSpace: false,
      matchingLayer: matchingLayer || null,
      candidates: matchingLayer ? matchingLayer.arabicLetters : ([] as string[]),
    };
  });

  // Calculate active layers in decrypt input
  const activeLayersInDecrypt = useMemo(() => {
    const layers = new Set<number>();
    decodedItems.forEach((d) => {
      if (d.matchingLayer) layers.add(d.matchingLayer.layer);
    });
    return Array.from(layers);
  }, [decodedItems]);

  // Group letters into lines by spaces for line break
  const lines: { originalIndex: number; detail: typeof decodedItems[0] }[][] = [];
  let currentLine: { originalIndex: number; detail: typeof decodedItems[0] }[] = [];

  decodedItems.forEach((item, index) => {
    if (item.isSpace) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
      }
    } else {
      currentLine.push({ originalIndex: index, detail: item });
    }
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Meaningful letters count without spaces for decoding
  const meaningfulItems = decodedItems.filter((d) => !d.isSpace && d.matchingLayer);
  const meaningfulLettersCount = meaningfulItems.length;
  const totalCombinationsPossible = meaningfulLettersCount > 0 ? Math.pow(4, meaningfulLettersCount) : 0;
  // Cap target combinations to 3000 to keep DOM and memory extremely fast
  const maxTarget = Math.min(totalCombinationsPossible, 3000);

  // Progressive background generator with progress bar to guarantee ZERO page freezing
  useEffect(() => {
    if (meaningfulLettersCount === 0) {
      setGeneratedList([]);
      setProgressPercent(0);
      setIsGenerating(false);
      return;
    }

    const currentRunId = ++generationRef.current;
    setIsGenerating(true);
    setProgressPercent(0);
    setGeneratedList([]);

    const results: string[] = [];
    const stack: { index: number; str: string; candidateIdx: number }[] = [
      { index: 0, str: '', candidateIdx: 0 },
    ];

    function processChunk() {
      if (generationRef.current !== currentRunId) return;

      const startTime = performance.now();

      // Run up to 8ms per frame to keep UI butter-smooth (60-120fps)
      while (stack.length > 0 && results.length < maxTarget && performance.now() - startTime < 8) {
        const frame = stack[stack.length - 1];

        if (frame.index === meaningfulItems.length) {
          results.push(frame.str);
          stack.pop();
          continue;
        }

        const item = meaningfulItems[frame.index];
        const candidates = item.candidates;

        if (frame.candidateIdx < candidates.length) {
          const picked = candidates[frame.candidateIdx];
          frame.candidateIdx++;
          stack.push({
            index: frame.index + 1,
            str: frame.str + picked,
            candidateIdx: 0,
          });
        } else {
          stack.pop();
        }
      }

      if (generationRef.current !== currentRunId) return;

      const currentProgress = maxTarget > 0 ? Math.min(100, Math.round((results.length / maxTarget) * 100)) : 100;
      setProgressPercent(currentProgress);
      setGeneratedList([...results]);

      if (results.length < maxTarget && stack.length > 0) {
        requestAnimationFrame(processChunk);
      } else {
        setIsGenerating(false);
        setProgressPercent(100);
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(processChunk);
    }, 10);

    return () => {
      clearTimeout(timer);
      generationRef.current = 0;
    };
  }, [meaningfulLettersCount, cipherInput]);

  // Helper to reverse words
  const reverseString = (str: string) => Array.from(str).reverse().join('');

  // Processed combinations (supports both normal and reversed)
  const processedCombinations = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    
    for (const combo of generatedList) {
      if (!seen.has(combo)) {
        list.push({ word: combo, isReversed: false, original: combo });
        seen.add(combo);
      }
      const rev = reverseString(combo);
      if (!seen.has(rev)) {
        list.push({ word: rev, isReversed: true, original: combo });
        seen.add(rev);
      }
    }
    return list;
  }, [generatedList]);

  // Dictionary check map for high performance
  const dictionaryStatus = useMemo(() => {
    const statusMap = new Map<string, string | null>();
    if (!dictLoaded) return statusMap;

    for (const item of processedCombinations) {
      if (!statusMap.has(item.word)) {
        statusMap.set(item.word, arabicDictionary.getMatchedWord(item.word));
      }
    }
    return statusMap;
  }, [processedCombinations, dictLoaded]);

  // Quranic vocabulary check map for high performance
  const quranicStatus = useMemo(() => {
    const statusMap = new Map<string, QuranicWordMeta | null>();
    for (const item of processedCombinations) {
      if (!statusMap.has(item.word)) {
        statusMap.set(item.word, quranicDictionary.getWordDetails(item.word));
      }
    }
    return statusMap;
  }, [processedCombinations, quranicCount]);

  // Count dictionary matches
  const dictionaryMatchesCount = useMemo(() => {
    let count = 0;
    for (const matchedWord of dictionaryStatus.values()) {
      if (matchedWord) count++;
    }
    return count;
  }, [dictionaryStatus]);

  // Count Quranic vocabulary matches
  const quranicMatchesCount = useMemo(() => {
    let count = 0;
    for (const meta of quranicStatus.values()) {
      if (meta) count++;
    }
    return count;
  }, [quranicStatus]);

  // Compute exact lists for summary
  const exactQuranicList = useMemo(() => {
    const list: { combo: string; meta: QuranicWordMeta; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedCombinations) {
      const meta = quranicStatus.get(item.word);
      if (meta && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ combo: item.word, meta, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedCombinations, quranicStatus]);

  const exactDictList = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedCombinations) {
      const matched = dictionaryStatus.get(item.word);
      if (matched && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ word: matched, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedCombinations, dictionaryStatus]);

  // Filtering: allows characters anywhere inside the word (middle, start, or end) + optional dictionary/Quranic filter
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return processedCombinations.filter((item) => {
      if (onlyQuranicWords && !quranicStatus.get(item.word)) {
        return false;
      }
      if (onlyShowDictionaryWords && !dictionaryStatus.get(item.word)) {
        return false;
      }
      if (!normalizedFilter) return true;
      return item.word.includes(normalizedFilter);
    });
  }, [
    processedCombinations,
    normalizedFilter,
    onlyShowDictionaryWords,
    onlyQuranicWords,
    dictionaryStatus,
    quranicStatus,
  ]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label htmlFor="cipher-input" className="text-sm sm:text-base font-bold text-stone-900">
            النص المشفر:
          </label>

          <div className="flex items-center gap-3">
            {/* 7 Compact Layers Indicator */}
            <CompactLayersIndicator activeLayerNumbers={activeLayersInDecrypt} />
          </div>
        </div>

        {/* Input container with Clear button prominently positioned on the right side */}
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            id="clear-cipher-input-btn"
            onClick={() => setCipherInput('')}
            disabled={!cipherInput}
            className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 transition-all ${
              cipherInput
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer'
                : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
            }`}
            title="مسح النص المشفر بالكامل"
          >
            <Eraser className="w-4 h-4 text-rose-600" />
            <span>مسح</span>
          </button>

          <input
            id="cipher-input"
            type="text"
            value={cipherInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="اكتب أو انقر أحرف التشفير الـ 14 فقط..."
            className="flex-1 text-xl sm:text-2xl font-bold p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-stone-50/50"
          />
        </div>

        {/* 14 Cipher Buttons for Direct Clicking with Rainbow Colors */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-stone-500 ml-1">أحرف التشفير المسموحة:</span>
          {CIPHER_LAYERS.map((l) => {
            const color = LAYER_RAINBOW_COLORS[l.layer];
            return (
              <div key={l.layer} className="flex items-center gap-1">
                {l.cipherLetters.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAppendChar(c)}
                    className={`w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center border transition-transform active:scale-95 cursor-pointer ${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-2xs`}
                    title={`إضافة ${c} (الطبقة ${l.layer})`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => handleAppendChar(' ')}
            className="px-2.5 h-7 rounded-lg font-bold text-xs bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-300 transition-colors cursor-pointer"
          >
            مسافة
          </button>
        </div>
      </div>

      {meaningfulLettersCount > 0 && (
        <ResultsSummaryBox
          exactQuranicList={exactQuranicList}
          exactDictList={exactDictList}
          nooraniMatchesCount={0}
          isGenerating={isGenerating}
        />
      )}

      {/* Breakdown per letter with Line Breaks on Spaces */}
      {lines.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              تحليل رموز التشفير إلى الطبقات والأحرف المرشحة
            </h3>
            <span className="text-xs text-stone-400">
              {meaningfulLettersCount} رمز مشفر
            </span>
          </div>

          <div className="space-y-3">
            {lines.map((lineItems, lineIdx) => (
              <div
                key={lineIdx}
                className="flex flex-wrap items-stretch gap-2.5 sm:gap-3 p-2 rounded-xl bg-stone-50/50 border border-stone-100"
              >
                {lineItems.map(({ originalIndex, detail: item }) => {
                  const layerNum = item.matchingLayer?.layer ?? 0;
                  const color = LAYER_RAINBOW_COLORS[layerNum] || {
                    activeBg: 'bg-stone-800',
                    activeText: 'text-white',
                    activeBorder: 'border-stone-900',
                  };

                  return (
                    <div
                      key={originalIndex}
                      className="w-36 sm:w-44 p-2.5 rounded-xl border border-stone-200 bg-white shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center shadow-xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                        >
                          {item.char}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                        >
                          الطبقة {layerNum}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center pt-1">
                        {item.candidates.map((cand, cIdx) => (
                          <div
                            key={cIdx}
                            className="py-1 rounded bg-stone-50 border border-stone-200 text-stone-900 font-bold text-sm"
                          >
                            {cand}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permanently Open Combinations with Arabic Dictionary Highlights, Reverse Mode & Progress Bar */}
      {meaningfulLettersCount > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Layers className="w-4 h-4 text-stone-600" />
              <h4 className="text-sm sm:text-base font-bold text-stone-900">
                قائمة احتمالات الكلمات الأصلية (بدون فراغات)
              </h4>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                {totalCombinationsPossible.toLocaleString('ar-EG')} إجمالي
              </span>

              {/* Quranic Lexicon Matches Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>المفردات القرآنية:</span>
                <span className="font-extrabold text-amber-950">
                  {quranicMatchesCount} كلمة
                </span>
              </div>

              {/* Dictionary Status Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>القاموس العربي:</span>
                <span className="font-extrabold text-emerald-900">
                  {dictLoaded ? `${dictionaryMatchesCount} كلمة` : `تحميل (${dictLoadProgress}%)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick toggle: show only Quranic vocabulary */}
              <button
                type="button"
                id="quranic-decrypt-only-btn"
                onClick={() => setOnlyQuranicWords(!onlyQuranicWords)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  onlyQuranicWords
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50 hover:border-amber-200'
                }`}
                title="عرض الكلمات التي تطابق مفردات في القرآن الكريم فقط (مثل وقب)"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>مفردات قرآنية ({quranicMatchesCount})</span>
              </button>

              {/* Quick toggle: show only dictionary words */}
              <button
                type="button"
                onClick={() => setOnlyShowDictionaryWords(!onlyShowDictionaryWords)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  onlyShowDictionaryWords
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
                title="عرض الكلمات العربية المعتمدة في القاموس فقط"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>كلمات القاموس ({dictionaryMatchesCount})</span>
              </button>

              {/* Filter in any position */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="تصفية بأي حرف (في أي موضع)..."
                  value={combinationFilter}
                  onChange={(e) => setCombinationFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56 text-right bg-stone-50/50"
                />
              </div>
            </div>
          </div>

          {/* Smooth Progress Bar (zero freeze guarantee) */}
          {isGenerating && (
            <div className="space-y-1.5 py-1">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>جاري معالجة وتوليد ومطابقة الاحتمالات مع القاموس والمعجم القرآني...</span>
                </span>
                <span className="font-bold text-stone-700">{progressPercent}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Match Summary */}
          {(normalizedFilter || onlyQuranicWords || onlyShowDictionaryWords) && (
            <div className="flex items-center justify-between text-xs text-stone-600 bg-indigo-50/60 border border-indigo-200 px-3 py-1.5 rounded-lg flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {onlyQuranicWords && (
                    <strong className="text-amber-900 ml-1">
                      (المفردات القرآنية المعتمدة فقط)
                    </strong>
                  )}
                  {onlyShowDictionaryWords && (
                    <strong className="text-emerald-800 ml-1">
                      (الكلمات العربية الموثقة بالقاموس فقط)
                    </strong>
                  )}
                  {normalizedFilter && (
                    <span>
                      مطابقة المقطع &quot;<strong className="text-indigo-900">{normalizedFilter}</strong>&quot; في أي موضع
                    </span>
                  )}
                </span>
              </span>
              <span className="font-bold text-indigo-900">{filteredCombinations.length} احتمال</span>
            </div>
          )}

          {/* Color Legend */}
          <div className="flex items-center gap-4 text-xs text-stone-500 pt-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500 inline-block shadow-2xs" />
              <strong className="text-amber-950">ذهبي:</strong> مفردة وردت في القرآن الكريم (مثل وقب في سورة الفلق)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs" />
              <strong className="text-emerald-900">أخضر:</strong> كلمة عربية موثقة في القاموس
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-stone-100 border border-stone-300 inline-block" />
              <span>رمادي: احتمالات توليفية أخرى</span>
            </span>
          </div>

          {/* Combinations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
            {filteredCombinations.map((item, idx) => {
              const quranicMeta = quranicStatus.get(item.word);
              const isDictWord = dictionaryStatus.get(item.word);
              const hasFilterMatch = normalizedFilter && item.word.includes(normalizedFilter);

              return (
                <div
                  key={idx}
                  id={`decode-combo-${idx}`}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 select-none relative ${
                    quranicMeta
                      ? 'border-amber-400 bg-linear-to-b from-amber-50 to-white text-amber-950 shadow-xs ring-1 ring-amber-300 font-black'
                      : isDictWord
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-400 font-black'
                      : hasFilterMatch
                      ? 'border-indigo-400 bg-indigo-50/80 text-stone-900'
                      : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  {/* Reversed Indicator Badge */}
                  {item.isReversed && (
                    <div className="absolute top-0 right-0 -mt-1.5 -mr-1.5 bg-stone-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 z-10">
                      معكوس
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {quranicMeta ? (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300 shrink-0 animate-pulse"
                          title={`لفظ قرآني كريم بسورة ${quranicMeta.surahName}`}
                        />
                      ) : isDictWord ? (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"
                          title="كلمة عربية في القاموس"
                        />
                      ) : null}
                      <span
                        className={`text-sm tracking-wider break-all font-bold ${
                          quranicMeta ? 'text-amber-950 font-black text-base' : ''
                        }`}
                      >
                        {item.word}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(item.word, `decode-combo-${idx}`)}
                      className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                        quranicMeta
                          ? 'text-amber-800 hover:bg-amber-100'
                          : isDictWord
                          ? 'text-emerald-700 hover:bg-emerald-100'
                          : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200/60'
                      }`}
                      title="نسخ"
                    >
                      {copiedKey === `decode-combo-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Quranic Surah Reference Badge */}
                  {quranicMeta && (
                    <div className="pt-1 border-t border-amber-200/60 flex items-center justify-between text-2xs text-amber-900 font-extrabold">
                      {quranicMeta.occurrences > 1 ? (
                        <a
                          href={getQuranTopSearchUrl(quranicMeta.originalQuranicWord || item.word)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline hover:text-amber-950 transition-colors group/link"
                          title={`بحث عن "${quranicMeta.originalQuranicWord || item.word}" (${quranicMeta.occurrences} مواضع) بمحرك بحث قرآن توب`}
                        >
                          <Search className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          <span>بحث قرآني ({quranicMeta.occurrences} مواضع)</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-700 opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0" />
                        </a>
                      ) : (
                        <a
                          href={getQuranTopAyahUrl(quranicMeta.surahNumber || quranicMeta.surahName, quranicMeta.ayahNum)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline hover:text-amber-950 transition-colors group/link"
                          title={`فتح وتلاوة الآية ${quranicMeta.ayahNum} من سورة ${quranicMeta.surahName} على موقع قرآن توب`}
                        >
                          <BookOpen className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          <span>سورة {quranicMeta.surahName} (آية {quranicMeta.ayahNum})</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-700 opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCombinations.length === 0 && !isGenerating && (
              <div className="col-span-full py-8 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-stone-300" />
                <span>لا توجد نتائج مطابقة للشروط أو التصفية الحالية</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
