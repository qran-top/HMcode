import { useState, useEffect, useRef, useMemo } from 'react';
import {
  EncryptedLetterDetail,
  cleanText,
  segmentIntoQuranicWords,
  QuranicSegmentationResult,
  QURANIC_WORDS,
} from '../cipherData';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import { QuranicMatchBadge } from './QuranicMatchBadge';
import { QuranicCombinationsLexicon } from './QuranicCombinationsLexicon';
import { arabicDictionary } from '../utils/arabicDictionary';
import {
  quranicDictionary,
  QuranicWordMeta,
  QuranicNearestMatch,
} from '../utils/quranicDictionary';
import { Copy, Check, Shuffle, RefreshCw, Layers, Loader2, AlertCircle, ArrowLeftRight, Sparkles, BookOpen, SpellCheck } from 'lucide-react';
import { ResultsSummaryBox } from './ResultsSummaryBox';
import { LetterAnalysisCard } from './LetterAnalysisCard';

interface EncryptionResultsProps {
  details: EncryptedLetterDetail[];
  selectedProbabilities: number[];
  onSetSelectedProbabilities: (probs: number[]) => void;
  onToggleProbability: (index: number) => void;
}

export function EncryptionResults({
  details,
  selectedProbabilities,
  onSetSelectedProbabilities,
  onToggleProbability,
}: EncryptionResultsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [onlyQuranicMatches, setOnlyQuranicMatches] = useState<boolean>(false);
  const [onlyQuranicVocab, setOnlyQuranicVocab] = useState<boolean>(false);
  const [onlyDictWords, setOnlyDictWords] = useState<boolean>(false);
  const [showNearestVocab, setShowNearestVocab] = useState<boolean>(true);
  const [quranicDictCount, setQuranicDictCount] = useState<number>(quranicDictionary.getWordCount());
  const [arabicDictCount, setArabicDictCount] = useState<number>(arabicDictionary.getWordCount());

  // Asynchronous chunked generation state
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const generationRef = useRef<number>(0);

  // Subscribe to Quranic & Arabic dictionary changes/loading
  useEffect(() => {
    const unsubQuranic = quranicDictionary.subscribe((_, count) => {
      setQuranicDictCount(count);
    });
    const unsubArabic = arabicDictionary.subscribe((_, count) => {
      setArabicDictCount(count);
    });
    return () => {
      unsubQuranic();
      unsubArabic();
    };
  }, []);

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

  // Handle selecting any combination as the active chosen probabilities
  const handleSelectCombo = (combo: string) => {
    const actualCombo = isReversed ? reverseString(combo) : combo;
    let comboLetterIdx = 0;
    const newProbs = details.map((d) => {
      if (d.isSpecialOrSpace) return 0;
      const targetChar = actualCombo[comboLetterIdx++];
      if (targetChar === d.prob2) return 1;
      return 0;
    });
    onSetSelectedProbabilities(newProbs);
  };

  // Exact Quranic Vocabulary Map
  const quranicVocabExactMap = useMemo(() => {
    const map = new Map<string, QuranicWordMeta | null>();
    for (const combo of processedCombinations) {
      if (!map.has(combo)) {
        map.set(combo, quranicDictionary.getWordDetails(combo));
      }
    }
    return map;
  }, [processedCombinations, quranicDictCount]);

  // Nearest Quranic Vocabulary Map
  const quranicNearestMap = useMemo(() => {
    const map = new Map<string, QuranicNearestMatch | null>();
    for (const combo of processedCombinations) {
      if (!map.has(combo)) {
        map.set(combo, quranicDictionary.findClosestQuranicWord(combo));
      }
    }
    return map;
  }, [processedCombinations, quranicDictCount]);

  // List of exact Quranic words found in combinations
  const exactQuranicList = useMemo(() => {
    const list: { combo: string; meta: QuranicWordMeta }[] = [];
    const seen = new Set<string>();
    for (const [combo, meta] of quranicVocabExactMap.entries()) {
      if (meta && !seen.has(combo)) {
        seen.add(combo);
        list.push({ combo, meta });
      }
    }
    return list;
  }, [quranicVocabExactMap]);

  // List of nearest matches with good similarity
  const nearestQuranicList = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch }[] = [];
    const seen = new Set<string>();
    for (const [combo, nearest] of quranicNearestMap.entries()) {
      if (nearest && nearest.similarity < 100 && nearest.similarity >= 65 && !seen.has(combo)) {
        seen.add(combo);
        list.push({ combo, nearest });
      }
    }
    return list.sort((a, b) => b.nearest.similarity - a.nearest.similarity);
  }, [quranicNearestMap]);

  // Arabic Dictionary Status Map
  const dictionaryStatus = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const combo of processedCombinations) {
      if (!map.has(combo)) {
        map.set(combo, arabicDictionary.getMatchedWord(combo));
      }
    }
    return map;
  }, [processedCombinations, arabicDictCount]);

  // List of exact Arabic dictionary words found in combinations
  const exactDictList = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const [combo, matchedWord] of dictionaryStatus.entries()) {
      if (matchedWord && !seen.has(combo)) {
        seen.add(combo);
        list.push(matchedWord);
      }
    }
    return list;
  }, [dictionaryStatus]);

  // Current selected cipher text display & its Quranic segmentation
  const displaySelectedCipher = isReversed
    ? reverseString(customStringNoSpaces || customStringWithSpaces)
    : customStringNoSpaces || customStringWithSpaces;

  const selectedCipherSegmentation = useMemo(() => {
    return segmentIntoQuranicWords(displaySelectedCipher);
  }, [displaySelectedCipher]);

  // Selected cipher Quranic metadata
  const selectedCipherQuranicMeta = useMemo(() => {
    return quranicDictionary.getWordDetails(displaySelectedCipher);
  }, [displaySelectedCipher, quranicDictCount]);

  const selectedCipherNearestMeta = useMemo(() => {
    return quranicDictionary.findClosestQuranicWord(displaySelectedCipher);
  }, [displaySelectedCipher, quranicDictCount]);

  // Filtering by substring, Quranic vocabulary, Arabic dictionary, or multi-letter opening words
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return processedCombinations.filter((combo) => {
      if (onlyQuranicVocab) {
        const meta = quranicVocabExactMap.get(combo);
        if (!meta) return false;
      }
      if (onlyDictWords) {
        const isDict = dictionaryStatus.get(combo);
        if (!isDict) return false;
      }
      if (onlyQuranicMatches) {
        const seg = segmentedMap.get(combo);
        if (!seg || seg.multiWordCount === 0) return false;
      }
      if (!normalizedFilter) return true;
      return combo.includes(normalizedFilter);
    });
  }, [
    processedCombinations,
    normalizedFilter,
    onlyQuranicMatches,
    onlyQuranicVocab,
    onlyDictWords,
    segmentedMap,
    quranicVocabExactMap,
    dictionaryStatus,
  ]);

  return (
    <div className="space-y-4">
      {/* 0. Summary Box Immediately Below Input */}
      <ResultsSummaryBox
        exactQuranicList={exactQuranicList}
        exactDictList={exactDictList}
        nooraniMatchesCount={quranicMatchesCount}
        isGenerating={isGenerating}
        onSelectWord={handleSelectCombo}
      />

      {/* 1. LetterAnalysisCard (Moved here to sit below summary) */}
      <LetterAnalysisCard
        details={details}
        selectedProbabilities={selectedProbabilities}
        onToggleProbability={onToggleProbability}
      />

      {/* 2. Quranic Combinations Lexicon (Vocabulary Matching) */}
      <QuranicCombinationsLexicon
        exactMatches={exactQuranicList}
        nearestMatches={nearestQuranicList}
        onSelectCombo={handleSelectCombo}
        onFilterExact={() => setOnlyQuranicVocab(!onlyQuranicVocab)}
        isOnlyExactActive={onlyQuranicVocab}
      />

      {/* 2. Combinations List with Noorani Dictionary & Quranic Vocabulary Matching */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-stone-600" />
            <h4 id="all-combinations-title" className="text-sm sm:text-base font-bold text-stone-900">
              قائمة الاحتمالات (معجم الأحرف النورانية والمفردات القرآنية)
            </h4>
            <span className="text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-md">
              {totalCombinationsPossible.toLocaleString('ar-EG')} إجمالي ممكن
            </span>

            {/* Exact Quranic Words Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>مفردات قرآنية متطابقة:</span>
              <span className="font-black text-amber-950">
                {exactQuranicList.length} كلمة
              </span>
            </div>

            {/* Arabic Dictionary Words Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold">
              <SpellCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>كلمات قاموسية:</span>
              <span className="font-black text-emerald-950">
                {exactDictList.length} كلمة
              </span>
            </div>

            {/* Noorani Dictionary Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>فواتح نورانية:</span>
              <span className="font-extrabold text-teal-900">
                {quranicMatchesCount} احتمال
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

            {/* Filter: Only exact Quranic vocabulary */}
            <button
              type="button"
              id="quranic-vocab-only-btn"
              onClick={() => setOnlyQuranicVocab(!onlyQuranicVocab)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                onlyQuranicVocab
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-amber-50 hover:border-amber-300'
              }`}
              title="عرض الكلمات التي تطابق تماماً ألفاظاً وردت في القرآن الكريم"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>مفردات قرآنية ({exactQuranicList.length})</span>
            </button>

            {/* Filter: Only Arabic dictionary words */}
            <button
              type="button"
              id="dict-words-only-btn"
              onClick={() => setOnlyDictWords(!onlyDictWords)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                onlyDictWords
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
              title="عرض الكلمات العربية الصحيحة الموثقة في المعجم اللغوي العربي"
            >
              <SpellCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>كلمات قاموسية ({exactDictList.length})</span>
            </button>

            {/* Filter to show only combinations with multi-letter Quranic words */}
            <button
              type="button"
              id="quranic-only-btn"
              onClick={() => setOnlyQuranicMatches(!onlyQuranicMatches)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                onlyQuranicMatches
                  ? 'bg-teal-700 text-white border-teal-800 shadow-2xs ring-2 ring-teal-300'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-teal-50 hover:border-teal-200'
              }`}
              title="عرض الاحتمالات التي تتضمن فواتح قرآنية مركبة فقط (مثل حم، طسم، الم...)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>فواتح مركبة ({quranicMatchesCount})</span>
            </button>

            {/* Toggle Show Nearest */}
            <button
              type="button"
              onClick={() => setShowNearestVocab(!showNearestVocab)}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                showNearestVocab
                  ? 'bg-stone-200 text-stone-800 border-stone-300'
                  : 'bg-stone-100 text-stone-500 border-stone-200'
              }`}
              title="إظهار أو إخفاء أقرب لفظ قرآني في البطاقات"
            >
              <span>أقرب لفظ {showNearestVocab ? '✓' : ''}</span>
            </button>

            {/* Filter Input: searches anywhere inside words */}
            <input
              type="text"
              placeholder="تصفية بحرف أو مقطع..."
              value={combinationFilter}
              onChange={(e) => setCombinationFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-44 text-right bg-stone-50/50"
            />
          </div>
        </div>

        {/* Progress Bar (visible during generation) */}
        {isGenerating && (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>جاري معالجة وتوليد ومطابقة الاحتمالات مع المعجمين القرآني واللغوي...</span>
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
        {(normalizedFilter || onlyQuranicMatches || onlyQuranicVocab || onlyDictWords || isReversed) && (
          <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50/60 border border-amber-200 px-3 py-1.5 rounded-lg flex-wrap gap-2">
            <span>
              {isReversed && <strong className="text-amber-800 ml-1">(الوضع المعكوس)</strong>}
              {onlyQuranicVocab && (
                <strong className="text-amber-900 ml-1">(المفردات القرآنية المعتمدة فقط)</strong>
              )}
              {onlyDictWords && (
                <strong className="text-emerald-900 ml-1">(الكلمات العربية القاموسية فقط)</strong>
              )}
              {onlyQuranicMatches && (
                <strong className="text-teal-800 ml-1">(فواتح قرآنية مركبة فقط)</strong>
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
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 inline-block shadow-2xs" />
            <strong className="text-amber-950">ذهبي:</strong> مفردة وردت في القرآن الكريم
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs" />
            <strong className="text-emerald-900">أخضر:</strong> كلمة عربية موثقة في القاموس
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-teal-600 border border-teal-700 inline-block" />
            <strong className="text-teal-900">تركواز:</strong> فاتحة قرآنية مركبة ({QURANIC_WORDS.filter((w) => w.length > 1).join('، ')})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-stone-100 border border-stone-300 inline-block" />
            <span>احتمال توليفي</span>
          </span>
        </div>

        {/* Combinations Grid with Quranic Vocabulary & Noorani Segmented Breakdown per Item */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1">
          {filteredCombinations.map((combo, idx) => {
            const hasMatch = normalizedFilter && combo.includes(normalizedFilter);
            const segmentation = segmentedMap.get(combo) || segmentIntoQuranicWords(combo);
            const hasMultiQuranic = segmentation.multiWordCount > 0;
            const exactMeta = quranicVocabExactMap.get(combo);
            const nearestMeta = quranicNearestMap.get(combo);
            const isDictWord = dictionaryStatus.get(combo);

            return (
              <div
                key={idx}
                id={`combo-item-${idx}`}
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 select-none group ${
                  exactMeta
                    ? 'border-amber-400 bg-linear-to-b from-amber-50 to-white shadow-xs ring-1 ring-amber-300'
                    : isDictWord
                    ? 'border-emerald-400 bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-300 hover:bg-emerald-50'
                    : hasMultiQuranic
                    ? 'border-teal-300 bg-teal-50/70 shadow-2xs hover:bg-teal-50'
                    : hasMatch
                    ? 'border-amber-400 bg-amber-50/80 shadow-2xs'
                    : 'border-stone-200 bg-stone-50/70 hover:bg-amber-50/60 hover:border-amber-300'
                }`}
              >
                {/* Header: Combo String, Quranic/Dictionary indicator & Copy Button */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {exactMeta ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300 shrink-0 animate-pulse"
                        title="لفظ قرآني كريم"
                      />
                    ) : isDictWord ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-1 ring-emerald-300 shrink-0"
                        title="كلمة عربية في المعجم القاموسي"
                      />
                    ) : hasMultiQuranic ? (
                      <span
                        className="w-2 h-2 rounded-full bg-teal-600 shrink-0"
                        title="يتضمن فاتحة قرآنية مركبة"
                      />
                    ) : null}
                    <span
                      className={`font-black text-base tracking-wider break-all ${
                        exactMeta
                          ? 'text-amber-950 text-lg'
                          : isDictWord
                          ? 'text-emerald-950 text-base font-extrabold'
                          : 'text-stone-900'
                      }`}
                      title={exactMeta ? `التركيب الأصلي: ${combo}` : typeof isDictWord === 'string' ? `التركيب الأصلي: ${combo}` : undefined}
                    >
                      {exactMeta ? exactMeta.word : (typeof isDictWord === 'string' ? isDictWord : combo)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectCombo(combo)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity text-2xs font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                        exactMeta
                          ? 'text-amber-800 bg-amber-100 hover:bg-amber-200'
                          : isDictWord
                          ? 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200'
                          : 'text-stone-700 bg-stone-200/80 hover:bg-stone-300'
                      }`}
                      title="اعتماد هذا المشفر في النص المعتمد"
                    >
                      تحديد
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(combo, `combo-${idx}`)}
                      className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
                      title="نسخ هذا الاحتمال"
                    >
                      {copiedKey === `combo-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Quranic & Dictionary Vocabulary Match Details */}
                <div className="space-y-1">
                  {isDictWord && !exactMeta && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/90 text-emerald-800 border border-emerald-300 text-2xs font-bold w-fit">
                      <SpellCheck className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span>كلمة عربية قاموسية</span>
                    </div>
                  )}

                  <QuranicMatchBadge
                    exactMeta={exactMeta || null}
                    nearestMeta={nearestMeta || null}
                    showNearest={showNearestVocab}
                    compact={true}
                  />

                  {/* Noorani Segmentation Badges & Division */}
                  <div className="pt-1.5 border-t border-stone-200/60 flex items-center justify-between gap-1 text-2xs">
                    <NooraniSegmentsBadge segmentation={segmentation} />
                    <span className="text-stone-400 font-mono shrink-0">
                      {segmentation.formattedDisplay}
                    </span>
                  </div>
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

      {/* 3. Current Selected Cipher String Display with Noorani Breakdown (نقل إلى أسفل الصفحة) */}
      <div id="adopted-cipher-section" className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3">
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

          {/* Quranic Lexicon Meta for Selected Cipher */}
          {(selectedCipherQuranicMeta || selectedCipherNearestMeta) && (
            <div className="w-full pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-stone-400">
                المطابقة في معجم مفردات القرآن الكريم:
              </span>
              <QuranicMatchBadge
                exactMeta={selectedCipherQuranicMeta}
                nearestMeta={selectedCipherNearestMeta}
                showNearest={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

