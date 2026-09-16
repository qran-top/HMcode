import { useState, useEffect, useRef, useMemo } from 'react';
import {
  EncryptedLetterDetail,
  cleanText,
  segmentIntoQuranicWords,
  QuranicSegmentationResult,
  QURANIC_WORDS,
} from '../cipherData';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import {
  Copy,
  Check,
  Shuffle,
  RefreshCw,
  Layers,
  Loader2,
  AlertCircle,
  ArrowLeftRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface EncryptionResultsProps {
  details: EncryptedLetterDetail[];
  selectedProbabilities: number[];
  onSetSelectedProbabilities: (probs: number[]) => void;
}

export function EncryptionResults({
  details,
  selectedProbabilities,
  onSetSelectedProbabilities,
}: EncryptionResultsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [onlyQuranicMatches, setOnlyQuranicMatches] = useState<boolean>(false);

  // Asynchronous chunked generation state
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const generationRef = useRef<number>(0);

  if (details.length === 0) return null;

  // Selected string without spaces as well for display & copy options
  const customStringWithSpaces = details
    .map((d, i) => {
      if (d.isSpecialOrSpace) return d.originalChar;
      const choice = selectedProbabilities[i] ?? 0;
      return choice === 0 ? d.prob1 : d.prob2;
    })
    .join('');

  // Also build clean without spaces
  const customStringNoSpaces = details
    .filter((d) => !d.isSpecialOrSpace)
    .map((d) => {
      const originalIdx = details.indexOf(d);
      const choice = selectedProbabilities[originalIdx] ?? 0;
      return choice === 0 ? d.prob1 : d.prob2;
    })
    .join('');

  const lettersOnly = details.filter((d) => !d.isSpecialOrSpace && d.layer);
  const lettersCount = lettersOnly.length;
  const totalCombinationsPossible = lettersCount > 0 ? Math.pow(2, lettersCount) : 0;
  const maxTarget = Math.min(totalCombinationsPossible, 2048);

  // Chunked Async Backtracking Generation to prevent browser lag & show progress bar
  useEffect(() => {
    if (lettersCount === 0) {
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
    const stack: { index: number; str: string; choiceIdx: number }[] = [
      { index: 0, str: '', choiceIdx: 0 },
    ];

    function processChunk() {
      if (generationRef.current !== currentRunId) return;

      const startTime = performance.now();

      while (stack.length > 0 && results.length < maxTarget && performance.now() - startTime < 8) {
        const frame = stack[stack.length - 1];

        if (frame.index === lettersOnly.length) {
          results.push(frame.str);
          stack.pop();
          continue;
        }

        const item = lettersOnly[frame.index];
        const choices = [item.prob1, item.prob2];

        if (frame.choiceIdx < choices.length) {
          const picked = choices[frame.choiceIdx];
          frame.choiceIdx++;
          stack.push({
            index: frame.index + 1,
            str: frame.str + picked,
            choiceIdx: 0,
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
  }, [lettersCount, details]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleRandomize = () => {
    const randomized = details.map((d) => {
      if (d.isSpecialOrSpace) return 0;
      return Math.random() > 0.5 ? 1 : 0;
    });
    onSetSelectedProbabilities(randomized);
  };

  const handleInvert = () => {
    const inverted = details.map((d, i) => {
      if (d.isSpecialOrSpace) return 0;
      const current = selectedProbabilities[i] ?? 0;
      return current === 0 ? 1 : 0;
    });
    onSetSelectedProbabilities(inverted);
  };

  // Helper to reverse words
  const reverseString = (str: string) => Array.from(str).reverse().join('');

  // Process combinations (supports reverse mode)
  const processedCombinations = useMemo(() => {
    return generatedList.map((combo) => (isReversed ? reverseString(combo) : combo));
  }, [generatedList, isReversed]);

  // Segment each combination into Quranic Opening Words as much as possible
  const segmentedMap = useMemo(() => {
    const map = new Map<string, QuranicSegmentationResult>();
    for (const combo of processedCombinations) {
      if (!map.has(combo)) {
        map.set(combo, segmentIntoQuranicWords(combo));
      }
    }
    return map;
  }, [processedCombinations]);

  // Count combinations containing multi-letter Quranic words (e.g. حم, طسم, الم, كهيعص)
  const quranicMatchesCount = useMemo(() => {
    let count = 0;
    for (const seg of segmentedMap.values()) {
      if (seg.multiWordCount > 0) count++;
    }
    return count;
  }, [segmentedMap]);

  // Current selected cipher text display & its Quranic segmentation
  const displaySelectedCipher = isReversed
    ? reverseString(customStringNoSpaces || customStringWithSpaces)
    : customStringNoSpaces || customStringWithSpaces;

  const selectedCipherSegmentation = useMemo(() => {
    return segmentIntoQuranicWords(displaySelectedCipher);
  }, [displaySelectedCipher]);

  // Filtering by substring and/or Quranic matches only
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return processedCombinations.filter((combo) => {
      if (onlyQuranicMatches) {
        const seg = segmentedMap.get(combo);
        if (!seg || seg.multiWordCount === 0) return false;
      }
      if (!normalizedFilter) return true;
      return combo.includes(normalizedFilter);
    });
  }, [processedCombinations, normalizedFilter, onlyQuranicMatches, segmentedMap]);

  return (
    <div className="space-y-4">
      {/* Current Selected Cipher String Display with Noorani Breakdown */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              النص المشفر المعتمد (بدون فراغات) {isReversed && <span className="text-amber-600">(معكوس)</span>}:
            </span>
            {selectedCipherSegmentation.multiWordCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                <span>يتضمن فواتح قرآنية</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="randomize-cipher-btn"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="توليف عشوائي بين الاحتمالين"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-600" />
              <span>توليف عشوائي</span>
            </button>

            <button
              type="button"
              id="invert-cipher-btn"
              onClick={handleInvert}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="عكس الاحتمال الأول والثاني"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>عكس الاختيارات</span>
            </button>

            <button
              type="button"
              id="copy-custom-btn"
              onClick={() => handleCopy(displaySelectedCipher, 'custom')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="نسخ المشفر بدون فراغات"
            >
              {copiedKey === 'custom' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ المشفر</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hero Display */}
        <div className="bg-stone-900 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center border border-stone-800 gap-3">
          <div
            dir="rtl"
            className="text-2xl sm:text-4xl font-extrabold text-amber-400 tracking-widest select-all break-all text-center"
          >
            {displaySelectedCipher}
          </div>

          {/* Noorani Segmentation Breakdown of Selected Cipher */}
          {selectedCipherSegmentation.segments.length > 0 && (
            <div className="w-full pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-stone-400">
                تقسيم المشفر المعتمد إلى أحرف وفواتح نورانية قدر الإمكان:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <NooraniSegmentsBadge segmentation={selectedCipherSegmentation} />
                <span className="text-stone-500 text-2xs font-mono mr-1">
                  ({selectedCipherSegmentation.formattedDisplay})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combinations List with Noorani Dictionary & Segmentation */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-stone-600" />
            <h4 id="all-combinations-title" className="text-sm sm:text-base font-bold text-stone-900">
              قائمة الاحتمالات (معجم الأحرف النورانية والتقسيم)
            </h4>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
              {totalCombinationsPossible.toLocaleString('ar-EG')} إجمالي ممكن
            </span>

            {/* Noorani Dictionary Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>قاموس الفواتح النورانية:</span>
              <span className="font-extrabold text-emerald-900">
                {quranicMatchesCount} احتمال يحوي فواتح مركبة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Reverse Combinations Toggle */}
            <button
              type="button"
              id="reverse-cipher-combos-btn"
              onClick={() => setIsReversed(!isReversed)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isReversed
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
              }`}
              title="عكس ترتيب أحرف كل كلمة بالكامل وتقسيمها نورانياً"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>الاحتمالات العكسية {isReversed ? '(مفعل)' : ''}</span>
            </button>

            {/* Filter to show only combinations with multi-letter Quranic words */}
            <button
              type="button"
              id="quranic-only-btn"
              onClick={() => setOnlyQuranicMatches(!onlyQuranicMatches)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                onlyQuranicMatches
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-emerald-50 hover:border-emerald-200'
              }`}
              title="عرض الاحتمالات التي تتضمن فواتح قرآنية مركبة فقط (مثل حم، طسم، الم...)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>فواتح مركبة فقط ({quranicMatchesCount})</span>
            </button>

            {/* Filter Input: searches anywhere inside words */}
            <input
              type="text"
              placeholder="تصفية بحرف أو مقطع..."
              value={combinationFilter}
              onChange={(e) => setCombinationFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-48 text-right bg-stone-50/50"
            />
          </div>
        </div>

        {/* Progress Bar (visible during generation) */}
        {isGenerating && (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>جاري معالجة وتوليد وتقسيم الاحتمالات النورانية...</span>
              </span>
              <span className="font-bold text-stone-700">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Filter Indicator */}
        {(normalizedFilter || onlyQuranicMatches || isReversed) && (
          <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50/60 border border-amber-200 px-3 py-1.5 rounded-lg flex-wrap gap-2">
            <span>
              {isReversed && <strong className="text-amber-800 ml-1">(الوضع المعكوس)</strong>}
              {onlyQuranicMatches && (
                <strong className="text-emerald-800 ml-1">(الاحتمالات التي تحوي فواتح قرآنية مركبة فقط)</strong>
              )}
              {normalizedFilter && (
                <span>
                  مطابقة المقطع &quot;<strong className="text-amber-800">{normalizedFilter}</strong>&quot;
                </span>
              )}
            </span>
            <span className="font-bold text-amber-900">{filteredCombinations.length} احتمال</span>
          </div>
        )}

        {/* Legend for Quranic & Noorani colors */}
        <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700 inline-block" />
            <strong className="text-emerald-900">أخضر:</strong> فاتحة قرآنية مركبة ({QURANIC_WORDS.filter((w) => w.length > 1).join('، ')})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-teal-200 border border-teal-400 inline-block" />
            <span>فاتحة مفردة (ق، ص، ن)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>أحرف نورانية مفردة</span>
          </span>
        </div>

        {/* Combinations Grid with Noorani Segmented Breakdown per Item */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1">
          {filteredCombinations.map((combo, idx) => {
            const hasMatch = normalizedFilter && combo.includes(normalizedFilter);
            const segmentation = segmentedMap.get(combo) || segmentIntoQuranicWords(combo);
            const hasMultiQuranic = segmentation.multiWordCount > 0;

            return (
              <div
                key={idx}
                id={`combo-item-${idx}`}
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 select-none ${
                  hasMultiQuranic
                    ? 'border-emerald-300 bg-emerald-50/70 shadow-2xs hover:bg-emerald-50'
                    : hasMatch
                    ? 'border-amber-400 bg-amber-50/80 shadow-2xs'
                    : 'border-stone-200 bg-stone-50/70 hover:bg-amber-50/60 hover:border-amber-300'
                }`}
              >
                {/* Header: Combo String & Copy Button */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {hasMultiQuranic && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"
                        title="يتضمن فاتحة قرآنية مركبة"
                      />
                    )}
                    <span className="font-black text-stone-900 text-base tracking-wider break-all">
                      {combo}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(combo, `combo-${idx}`)}
                    className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                    title="نسخ هذا الاحتمال"
                  >
                    {copiedKey === `combo-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Noorani Segmentation Badges & Division */}
                <div className="pt-1.5 border-t border-stone-200/60 flex items-center justify-between gap-1 text-2xs">
                  <NooraniSegmentsBadge segmentation={segmentation} />
                  <span className="text-stone-400 font-mono shrink-0">
                    {segmentation.formattedDisplay}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCombinations.length === 0 && !isGenerating && (
            <div className="col-span-full py-8 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-stone-300" />
              <span>لا توجد احتمالات مطابقة لشروط التصفية المدخلة</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

