import { useState, useEffect, useRef, useMemo } from 'react';
import { EncryptedLetterDetail, cleanText } from '../cipherData';
import {
  Copy,
  Check,
  Shuffle,
  RefreshCw,
  Layers,
  Loader2,
  AlertCircle,
  ArrowLeftRight,
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

  // Apply reversal option and filtering
  const normalizedFilter = cleanText(combinationFilter).trim();
  const processedCombinations = useMemo(() => {
    return generatedList.map((combo) => (isReversed ? reverseString(combo) : combo));
  }, [generatedList, isReversed]);

  const filteredCombinations = useMemo(() => {
    return processedCombinations.filter((combo) => {
      if (!normalizedFilter) return true;
      return combo.includes(normalizedFilter);
    });
  }, [processedCombinations, normalizedFilter]);

  const displaySelectedCipher = isReversed
    ? reverseString(customStringNoSpaces || customStringWithSpaces)
    : customStringNoSpaces || customStringWithSpaces;

  return (
    <div className="space-y-4">
      {/* Current Selected Cipher String Display */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            النص المشفر المعتمد (بدون فراغات) {isReversed && <span className="text-amber-600">(معكوس)</span>}:
          </span>

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

        <div className="bg-stone-900 rounded-xl p-4 sm:p-5 flex items-center justify-center border border-stone-800">
          <div
            dir="rtl"
            className="text-2xl sm:text-4xl font-extrabold text-amber-400 tracking-widest select-all break-all text-center"
          >
            {displaySelectedCipher}
          </div>
        </div>
      </div>

      {/* Permanently Open Combinations List with Progress Bar & Middle Filtering & Reverse Mode */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-stone-600" />
            <h4 id="all-combinations-title" className="text-sm sm:text-base font-bold text-stone-900">
              قائمة الاحتمالات (بدون فراغات)
            </h4>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
              {totalCombinationsPossible.toLocaleString('ar-EG')} إجمالي ممكن
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
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
              title="عكس ترتيب أحرف كل كلمة بالكامل (من اليسار لليمين والعكس)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>الاحتمالات العكسية {isReversed ? '(مفعل)' : ''}</span>
            </button>

            {/* Filter Input: searches anywhere inside words */}
            <input
              type="text"
              placeholder="تصفية بأي حرف (في أي موضع)..."
              value={combinationFilter}
              onChange={(e) => setCombinationFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-56 text-right bg-stone-50/50"
            />
          </div>
        </div>

        {/* Progress Bar (visible during generation or when large) */}
        {isGenerating && (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>جاري معالجة وتوليد الاحتمالات بسلاسة...</span>
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

        {/* Filter Stats */}
        {normalizedFilter && (
          <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50/60 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span>
              النتائج المطابقة للمقطع &quot;<strong className="text-amber-800">{normalizedFilter}</strong>&quot; في أي موضع:
            </span>
            <span className="font-bold text-amber-900">{filteredCombinations.length} احتمال</span>
          </div>
        )}

        {/* Combinations Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto p-1">
          {filteredCombinations.map((combo, idx) => {
            const hasMatch = normalizedFilter && combo.includes(normalizedFilter);

            return (
              <div
                key={idx}
                id={`combo-item-${idx}`}
                className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-1 select-none ${
                  hasMatch
                    ? 'border-amber-400 bg-amber-50/80 shadow-2xs'
                    : 'border-stone-200 bg-stone-50/70 hover:bg-amber-50/60 hover:border-amber-300'
                }`}
              >
                <span className="font-extrabold text-stone-800 text-sm tracking-wider break-all">
                  {combo}
                </span>
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
            );
          })}

          {filteredCombinations.length === 0 && !isGenerating && (
            <div className="col-span-full py-8 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-stone-300" />
              <span>لا توجد احتمالات مطابقة لحروف التصفية المدخلة</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
