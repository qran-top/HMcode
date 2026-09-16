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
} from 'lucide-react';

export function DecryptView() {
  const [cipherInput, setCipherInput] = useState('ن ص ع');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [onlyShowDictionaryWords, setOnlyShowDictionaryWords] = useState(false);
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [dictLoaded, setDictLoaded] = useState(arabicDictionary.isLoaded());
  const [dictLoadProgress, setDictLoadProgress] = useState(arabicDictionary.getProgress());

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

  // Processed combinations (supports reversing words order)
  const processedCombinations = useMemo(() => {
    return generatedList.map((combo) => (isReversed ? reverseString(combo) : combo));
  }, [generatedList, isReversed]);

  // Dictionary check map for high performance (evaluates the current words, including reversed if selected)
  const dictionaryStatus = useMemo(() => {
    const statusMap = new Map<string, boolean>();
    if (!dictLoaded) return statusMap;

    for (const word of processedCombinations) {
      if (!statusMap.has(word)) {
        statusMap.set(word, arabicDictionary.isWord(word));
      }
    }
    return statusMap;
  }, [processedCombinations, dictLoaded]);

  // Count dictionary matches
  const dictionaryMatchesCount = useMemo(() => {
    let count = 0;
    for (const isDict of dictionaryStatus.values()) {
      if (isDict) count++;
    }
    return count;
  }, [dictionaryStatus]);

  // Filtering: allows characters anywhere inside the word (middle, start, or end) + optional dictionary-only filter
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return processedCombinations.filter((c) => {
      if (onlyShowDictionaryWords && !dictionaryStatus.get(c)) {
        return false;
      }
      if (!normalizedFilter) return true;
      return c.includes(normalizedFilter);
    });
  }, [processedCombinations, normalizedFilter, onlyShowDictionaryWords, dictionaryStatus]);

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

            {cipherInput && (
              <button
                type="button"
                onClick={() => setCipherInput('')}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="مسح"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            )}
          </div>
        </div>

        <input
          id="cipher-input"
          type="text"
          value={cipherInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="اكتب أو انقر أحرف التشفير الـ 14 فقط..."
          className="w-full text-xl sm:text-2xl font-bold p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-stone-50/50"
        />

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

              {/* Dictionary Status Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>القاموس العربي الشامل:</span>
                <span className="font-extrabold text-emerald-900">
                  {dictLoaded ? `${dictionaryMatchesCount} كلمة متطابقة` : `جاري التحميل (${dictLoadProgress}%)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Reverse Option Toggle */}
              <button
                type="button"
                id="reverse-decrypt-combos-btn"
                onClick={() => setIsReversed(!isReversed)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isReversed
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50 hover:border-amber-200'
                }`}
                title="عكس ترتيب أحرف الكلمات بالكامل وفحصها بالقاموس العربي"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>الاحتمالات العكسية {isReversed ? '(مفعل)' : ''}</span>
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
                <span>كلمات القاموس فقط ({dictionaryMatchesCount})</span>
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
                  <span>جاري معالجة وتوليد ومطابقة الاحتمالات مع القاموس...</span>
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
          {(normalizedFilter || onlyShowDictionaryWords || isReversed) && (
            <div className="flex items-center justify-between text-xs text-stone-600 bg-indigo-50/60 border border-indigo-200 px-3 py-1.5 rounded-lg flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {isReversed && (
                    <strong className="text-amber-800 ml-1">
                      (الوضع المعكوس للأحرف)
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
          <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs" />
              <strong className="text-emerald-900">أخضر بارز:</strong> كلمة عربية موثقة في القاموس
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-stone-100 border border-stone-300 inline-block" />
              <span>رمادي: احتمالات توليفية أخرى</span>
            </span>
          </div>

          {/* Combinations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
            {filteredCombinations.map((combo, idx) => {
              const isDictWord = dictionaryStatus.get(combo);
              const hasFilterMatch = normalizedFilter && combo.includes(normalizedFilter);

              return (
                <div
                  key={idx}
                  id={`decode-combo-${idx}`}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-1 select-none ${
                    isDictWord
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-400 font-black'
                      : hasFilterMatch
                      ? 'border-indigo-400 bg-indigo-50/80 text-stone-900'
                      : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {isDictWord && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"
                        title="كلمة عربية في القاموس"
                      />
                    )}
                    <span className="text-sm tracking-wider break-all font-bold">
                      {combo}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(combo, `decode-combo-${idx}`)}
                    className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                      isDictWord
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
