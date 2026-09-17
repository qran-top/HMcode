import { useState, useMemo, useEffect, useRef } from 'react';
import {
  cleanText,
  VALID_CIPHER_LETTERS,
  LAYER_RAINBOW_COLORS,
  getLayerColor,
} from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';
import { CompactLayersIndicator } from './CompactLayersIndicator';
import { arabicDictionary } from '../utils/arabicDictionary';
import {
  quranicDictionary,
  QuranicWordMeta,
  QuranicNearestMatch,
  getQuranTopAyahUrl,
  getQuranTopSearchUrl,
} from '../utils/quranicDictionary';
import { QuranicMatchBadge } from './QuranicMatchBadge';
import { ResultsSummaryBox } from './ResultsSummaryBox';
import { QuranicCombinationsLexicon } from './QuranicCombinationsLexicon';
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

interface DecryptViewProps {
  cipherInput?: string;
  onCipherInputChange?: (val: string) => void;
}

export function DecryptView({
  cipherInput: externalCipherInput,
  onCipherInputChange,
}: DecryptViewProps = {}) {
  const { layers: cipherLayers, validCipherLetters } = useCipherLayers();
  const [internalCipherInput, setInternalCipherInput] = useState('طسم');
  const cipherInput = externalCipherInput !== undefined ? externalCipherInput : internalCipherInput;
  const setCipherInput = (val: string | ((prev: string) => string)) => {
    const nextVal = typeof val === 'function' ? val(cipherInput) : val;
    if (onCipherInputChange) {
      onCipherInputChange(nextVal);
    } else {
      setInternalCipherInput(nextVal);
    }
  };
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [onlyShowDictionaryWords, setOnlyShowDictionaryWords] = useState(false);
  const [onlyQuranicWords, setOnlyQuranicWords] = useState(false);
  const [dictLoaded, setDictLoaded] = useState(arabicDictionary.isLoaded());
  const [dictLoadProgress, setDictLoadProgress] = useState(arabicDictionary.getProgress());
  const [quranicCount, setQuranicCount] = useState<number>(quranicDictionary.getWordCount());

  // Async chunked generation for decrypted words & On-Demand trigger
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(48);
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

  // Strict input sanitizer: allow cipher letters configured in current table, space, or newline
  const handleInputChange = (raw: string) => {
    const cleaned = cleanText(raw);
    const filtered = Array.from(cleaned)
      .filter((char) => validCipherLetters.has(char) || char === ' ' || char === '\n')
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
        matchingLayers: [] as typeof cipherLayers,
        candidates: [] as string[],
      };
    }

    const matchingLayers = cipherLayers.filter(
      (l) =>
        Array.isArray(l.cipherLetters) &&
        l.cipherLetters.map((c) => (c || '').trim()).filter(Boolean).includes(char)
    );
    const matchingLayer = matchingLayers[0] || null;
    const candidates = Array.from(
      new Set(matchingLayers.flatMap((l) => l.arabicLetters).filter(Boolean))
    );

    return {
      char,
      isSpace: false,
      matchingLayer,
      matchingLayers,
      candidates,
    };
  });

  // Calculate active layers in decrypt input
  const activeLayersInDecrypt = useMemo(() => {
    const layers = new Set<number>();
    decodedItems.forEach((d) => {
      (d.matchingLayers || []).forEach((ml) => layers.add(ml.layer));
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
  const totalCombinationsPossible =
    meaningfulLettersCount > 0
      ? meaningfulItems.reduce((acc, item) => acc * Math.max(1, item.candidates.length), 1)
      : 0;
  // Cap target combinations to 2500 to keep DOM and memory extremely fast
  const maxTarget = Math.min(totalCombinationsPossible, 2500);

  // Progressive background generator with progress bar to guarantee ZERO page freezing
  const startGeneration = () => {
    if (meaningfulLettersCount === 0) {
      setGeneratedList([]);
      setProgressPercent(0);
      setIsGenerating(false);
      setHasGenerated(true);
      return;
    }

    const currentRunId = ++generationRef.current;
    setIsGenerating(true);
    setProgressPercent(0);
    setGeneratedList([]);
    setVisibleCount(48);

    const results: string[] = [];
    const stack: { index: number; str: string; candidateIdx: number }[] = [
      { index: 0, str: '', candidateIdx: 0 },
    ];

    function processChunk() {
      if (generationRef.current !== currentRunId) return;

      const startTime = performance.now();

      // Run up to 10ms per frame to keep UI butter-smooth (60-120fps)
      while (stack.length > 0 && results.length < maxTarget && performance.now() - startTime < 10) {
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

      if (results.length < maxTarget && stack.length > 0) {
        requestAnimationFrame(processChunk);
      } else {
        setGeneratedList(results);
        setIsGenerating(false);
        setProgressPercent(100);
        setHasGenerated(true);
      }
    }

    requestAnimationFrame(processChunk);
  };

  // Typing optimization:
  // For small inputs (<= 2 letters = max 16 combos), generate instantly.
  // For 3+ letters (64+ combos), do NOT auto-generate on typing to keep browser completely freeze-free!
  useEffect(() => {
    if (meaningfulLettersCount === 0) {
      generationRef.current++;
      setIsGenerating(false);
      setHasGenerated(false);
      setGeneratedList([]);
      setProgressPercent(0);
      setVisibleCount(48);
      return;
    }

    if (meaningfulLettersCount <= 2) {
      startGeneration();
    } else {
      generationRef.current++;
      setIsGenerating(false);
      setHasGenerated(false);
      setGeneratedList([]);
      setProgressPercent(0);
      setVisibleCount(48);
    }
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
    if (!dictLoaded && arabicDictionary.getWordCount() === 0) return statusMap;

    for (const item of processedCombinations) {
      if (!statusMap.has(item.word)) {
        statusMap.set(item.word, arabicDictionary.getMatchedWord(item.word));
      }
    }
    return statusMap;
  }, [processedCombinations, dictLoaded, dictLoadProgress]);

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

  // Quranic nearest vocabulary map (Optimized to top 40 non-exact candidates to avoid UI locking/freezing)
  const quranicNearestMap = useMemo(() => {
    const nearestMap = new Map<string, QuranicNearestMatch | null>();
    if (!hasGenerated && meaningfulLettersCount > 2) return nearestMap;
    let computedCount = 0;
    for (const item of processedCombinations) {
      if (computedCount >= 40) break;
      if (!nearestMap.has(item.word) && !quranicStatus.get(item.word)) {
        nearestMap.set(item.word, quranicDictionary.findClosestQuranicWord(item.word));
        computedCount++;
      }
    }
    return nearestMap;
  }, [processedCombinations, quranicCount, quranicStatus, hasGenerated, meaningfulLettersCount]);

  // List of nearest matches with good similarity
  const nearestQuranicList = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedCombinations) {
      const nearest = quranicNearestMap.get(item.word);
      if (nearest && nearest.similarity < 100 && nearest.similarity >= 58 && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ combo: item.word, nearest, isReversed: item.isReversed, original: item.original });
      }
    }
    return list.sort((a, b) => b.nearest.similarity - a.nearest.similarity);
  }, [processedCombinations, quranicNearestMap]);

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

  // Smart Priority Sorting (Option 4: Exact Quranic words first, Arabic dictionary words second, others third)
  const sortedCombinations = useMemo(() => {
    const list = [...processedCombinations];
    return list.sort((a, b) => {
      const aQuranic = quranicStatus.get(a.word) ? 1 : 0;
      const bQuranic = quranicStatus.get(b.word) ? 1 : 0;
      if (aQuranic !== bQuranic) return bQuranic - aQuranic;

      const aDict = dictionaryStatus.get(a.word) ? 1 : 0;
      const bDict = dictionaryStatus.get(b.word) ? 1 : 0;
      if (aDict !== bDict) return bDict - aDict;

      return 0;
    });
  }, [processedCombinations, quranicStatus, dictionaryStatus]);

  // Filtering: allows characters anywhere inside the word (middle, start, or end) + optional dictionary/Quranic filter
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return sortedCombinations.filter((item) => {
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
    sortedCombinations,
    normalizedFilter,
    onlyShowDictionaryWords,
    onlyQuranicWords,
    dictionaryStatus,
    quranicStatus,
  ]);

  // Batching / Pagination: display first 48 combinations to keep DOM extremely light
  const displayedCombinations = useMemo(() => {
    return filteredCombinations.slice(0, visibleCount);
  }, [filteredCombinations, visibleCount]);

  // Reset visibleCount when filter changes
  useEffect(() => {
    setVisibleCount(48);
  }, [combinationFilter, onlyQuranicWords, onlyShowDictionaryWords]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerDecryptGenerate = () => {
    if (!cipherInput.trim()) return;
    startGeneration();
    // Keep viewport in place without scrolling down
  };

  return (
    <div className="space-y-5">
      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-3.5 sm:p-5 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label htmlFor="cipher-input" className="text-sm sm:text-base font-bold text-stone-900">
            النص المشفر:
          </label>

          <div className="flex items-center gap-2 max-w-full overflow-x-auto py-0.5">
            {/* Compact Layers Indicator */}
            <CompactLayersIndicator activeLayerNumbers={activeLayersInDecrypt} />
          </div>
        </div>

        {/* Input container: responsive on mobile (flex-col-reverse on mobile, row on sm+) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch gap-2.5 w-full max-w-full">
          {/* Actions Column / Row on mobile */}
          <div className="shrink-0 flex flex-row sm:flex-col gap-1.5 w-full sm:w-36">
            {/* Smaller Clear button */}
            <button
              type="button"
              id="clear-cipher-input-btn"
              onClick={() => {
                setCipherInput('');
                setHasGenerated(false);
                setGeneratedList([]);
              }}
              disabled={!cipherInput}
              className={`flex-1 sm:w-full py-2 sm:py-1.5 px-2 rounded-lg font-bold text-xs inline-flex items-center justify-center gap-1 transition-all ${
                cipherInput
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer'
                  : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
              }`}
              title="مسح النص المشفر بالكامل"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-600" />
              <span>مسح</span>
            </button>

            {/* Generate & Show Combinations button under Clear */}
            <button
              type="button"
              id="generate-decrypt-input-btn"
              onClick={handleTriggerDecryptGenerate}
              disabled={!cipherInput.trim()}
              className={`flex-2 sm:w-full sm:flex-1 py-2 sm:py-2 px-2 rounded-xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all text-center leading-tight shadow-xs ${
                !cipherInput.trim()
                  ? 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
                  : isGenerating
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 cursor-wait'
                  : 'bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white border border-indigo-700/30 cursor-pointer'
              }`}
              title="توليد وعرض قائمة الاحتمالات (أو اضغط Enter في مربع النص)"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700 shrink-0" />
                  <span>جاري التوليد...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span>توليد وعرض الاحتمالات</span>
                </>
              )}
            </button>
          </div>

          <input
            id="cipher-input"
            type="text"
            value={cipherInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTriggerDecryptGenerate();
              }
            }}
            placeholder="اكتب أو انقر أحرف التشفير لفك التشفير (واضغط Enter لتوليد الاحتمالات)..."
            className="w-full sm:flex-1 min-w-0 max-w-full box-border text-base sm:text-xl font-bold p-3 sm:p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-stone-50/50 transition-all"
          />
        </div>

        {/* Cipher Buttons for Direct Clicking with Rainbow Colors */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap max-w-full">
          <span className="text-xs text-stone-500 ml-1">أحرف التشفير:</span>
          {cipherLayers.map((l) => {
            const color = getLayerColor(l.layer);
            const charsInLayer: string[] = [];
            (l.cipherLetters || []).forEach((c) => {
              const trimmed = (c || '').trim();
              if (trimmed) {
                const singleLetters = trimmed.replace(/[^ء-ي]/g, '').split('');
                if (singleLetters.length > 0) {
                  charsInLayer.push(...singleLetters);
                } else {
                  charsInLayer.push(trimmed);
                }
              }
            });
            const uniqueChars = Array.from(new Set(charsInLayer));
            if (uniqueChars.length === 0) return null;
            return (
              <div key={l.layer} className="flex items-center gap-1">
                {uniqueChars.map((c, cIdx) => (
                  <button
                    key={`${l.layer}-${c}-${cIdx}`}
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

      {/* Results Summary Box (shown when generated or for small input or while generating) */}
      {meaningfulLettersCount > 0 && (
        <ResultsSummaryBox
          exactQuranicList={exactQuranicList}
          exactDictList={exactDictList}
          nooraniMatchesCount={0}
          nearestQuranicList={nearestQuranicList}
          isGenerating={isGenerating}
          hasGenerated={hasGenerated || meaningfulLettersCount <= 2}
          onSelectWord={(word) => handleCopy(word, `summary-${word}`)}
          onGenerate={handleTriggerDecryptGenerate}
          totalCombinations={totalCombinationsPossible}
        />
      )}

      {/* Quranic Combinations Lexicon (Vocabulary & Nearest Matching) */}
      {meaningfulLettersCount > 0 && (
        <QuranicCombinationsLexicon
          exactMatches={exactQuranicList}
          nearestMatches={nearestQuranicList}
          onSelectCombo={(combo) => handleCopy(combo, `lexicon-${combo}`)}
          onFilterExact={() => setOnlyQuranicWords(!onlyQuranicWords)}
          isOnlyExactActive={onlyQuranicWords}
          onGenerate={handleTriggerDecryptGenerate}
          isGenerating={isGenerating}
          hasGenerated={hasGenerated || meaningfulLettersCount <= 2}
          totalCombinations={totalCombinationsPossible}
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
                  const matchingList = item.matchingLayers && item.matchingLayers.length > 0
                    ? item.matchingLayers
                    : item.matchingLayer ? [item.matchingLayer] : [];
                  const isMultiLayer = matchingList.length > 1;
                  const primaryLayer = matchingList[0] || null;
                  const layerNum = primaryLayer?.layer ?? 0;
                  const color = LAYER_RAINBOW_COLORS[layerNum] || {
                    activeBg: 'bg-stone-800',
                    activeText: 'text-white',
                    activeBorder: 'border-stone-900',
                  };

                  return (
                    <div
                      key={originalIndex}
                      className="w-[calc(50%-0.35rem)] sm:w-48 p-2.5 rounded-xl border border-stone-200 bg-white shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center shadow-xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                        >
                          {item.char}
                        </span>
                        {isMultiLayer ? (
                          <span
                            className="text-2xs font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300"
                            title="هذا الحرف موجود في عدة طبقات!"
                          >
                            الطبقات: {matchingList.map((ml) => ml.layer).join(' + ')}
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                          >
                            {layerNum > 0 ? `الطبقة ${layerNum}` : 'غير معروف'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center pt-1">
                        {item.candidates.map((cand, cIdx) => (
                          <div
                            key={cIdx}
                            className="py-1 rounded bg-stone-50 border border-stone-200 text-stone-900 font-bold text-sm font-['Amiri',serif]"
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
        <div id="decrypt-combinations-container" className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Layers className="w-4 h-4 text-stone-600" />
              <h4 id="all-decrypt-combinations-title" className="text-sm sm:text-base font-bold text-stone-900">
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

          {/* On-Demand Trigger Box for 3+ letters when not generated yet */}
          {!hasGenerated && !isGenerating && meaningfulLettersCount > 2 && (
            <div className="p-6 rounded-2xl border border-dashed border-indigo-300 bg-linear-to-b from-indigo-50/70 via-white to-indigo-50/70 text-center space-y-3.5 my-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center shadow-2xs">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm sm:text-base font-extrabold text-stone-900">
                  يوجد {totalCombinationsPossible.toLocaleString('ar-EG')} احتمال محتمل لفك التشفير
                </h5>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  تم تفعيل التوليد عند الطلب لضمان سرعة واستجابة المتصفح الفائقة أثناء الكتابة. اضغط الزر لتوليد قائمة الاحتمالات وفرز الكلمات القرآنية والمعجمية.
                </p>
              </div>
              <button
                type="button"
                id="generate-decrypt-combos-btn"
                onClick={startGeneration}
                className="inline-flex items-center gap-2 bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>توليد وعرض قائمة الاحتمالات ({maxTarget} احتمال)</span>
              </button>
            </div>
          )}

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

          {/* Combinations Grid (shown when generated or during small input) */}
          {(hasGenerated || isGenerating || meaningfulLettersCount <= 2) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
              {displayedCombinations.map((item, idx) => {
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
          )}

          {/* Pagination / Show More for light DOM */}
          {(hasGenerated || meaningfulLettersCount <= 2) && filteredCombinations.length > visibleCount && (
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-stone-100">
              <span className="text-xs text-stone-500">
                يتم عرض <strong className="text-stone-800">{displayedCombinations.length}</strong> من أصل{' '}
                <strong className="text-stone-800">{filteredCombinations.length}</strong> احتمال (الأولوية للمفردات القرآنية والمعجمية)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="show-more-decrypt-combos-btn"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 48, filteredCombinations.length))}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  عرض المزيد (+{Math.min(48, filteredCombinations.length - visibleCount)})
                </button>
                <button
                  type="button"
                  id="show-all-decrypt-combos-btn"
                  onClick={() => setVisibleCount(filteredCombinations.length)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  عرض الكل ({filteredCombinations.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
