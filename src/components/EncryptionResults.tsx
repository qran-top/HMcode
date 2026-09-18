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
  onToggleProbability: (index: number, probIndex: number) => void;
  generateSignal?: number;
  onGenerationStateChange?: (state: { isGenerating: boolean; hasGenerated: boolean }) => void;
  isDualMode?: boolean;
}

export function EncryptionResults({
  details,
  selectedProbabilities,
  onSetSelectedProbabilities,
  onToggleProbability,
  generateSignal,
  onGenerationStateChange,
  isDualMode = false,
}: EncryptionResultsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [combinationFilter, setCombinationFilter] = useState('');
  const [onlyQuranicMatches, setOnlyQuranicMatches] = useState<boolean>(false);
  const [onlyQuranicVocab, setOnlyQuranicVocab] = useState<boolean>(false);
  const [onlyDictWords, setOnlyDictWords] = useState<boolean>(false);
  const [showNearestVocab, setShowNearestVocab] = useState<boolean>(true);
  const [quranicDictCount, setQuranicDictCount] = useState<number>(quranicDictionary.getWordCount());
  const [arabicDictCount, setArabicDictCount] = useState<number>(arabicDictionary.getWordCount());

  // Asynchronous chunked generation state & On-demand trigger
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(48);
  const generationRef = useRef<number>(0);

  // Subscribe to Quranic & Arabic dictionary changes/loading
  useEffect(() => {
    const unsubQuranic = quranicDictionary.subscribe((_, count) => {
      setQuranicDictCount(count);
    });
    const unsubArabic = arabicDictionary.subscribe((_progress, _done, count) => {
      setArabicDictCount(count || arabicDictionary.getWordCount());
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
      const opts = d.cipherOptions && d.cipherOptions.length > 0 ? d.cipherOptions : [d.prob1, d.prob2];
      const choice = selectedProbabilities[i] ?? 0;
      return opts[choice] ?? opts[0] ?? '؟';
    })
    .join('');

  // Also build clean without spaces
  const customStringNoSpaces = details
    .filter((d) => !d.isSpecialOrSpace)
    .map((d) => {
      const originalIdx = details.indexOf(d);
      const opts = d.cipherOptions && d.cipherOptions.length > 0 ? d.cipherOptions : [d.prob1, d.prob2];
      const choice = selectedProbabilities[originalIdx] ?? 0;
      return opts[choice] ?? opts[0] ?? '؟';
    })
    .join('');

  const lettersOnly = details.filter((d) => !d.isSpecialOrSpace && d.layer);
  const lettersCount = lettersOnly.length;
  const totalCombinationsPossible =
    lettersCount > 0
      ? lettersOnly.reduce((acc, item) => {
          const uniqueChoices = new Set(
            item.cipherOptions && item.cipherOptions.length > 0 ? item.cipherOptions : [item.prob1, item.prob2]
          ).size;
          return acc * Math.max(1, uniqueChoices);
        }, 1)
      : 0;
  const maxTarget = Math.min(totalCombinationsPossible, 2048);

  // On-demand generator function
  const startGeneration = () => {
    if (lettersCount === 0) {
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
    const stack: { index: number; str: string; choiceIdx: number }[] = [
      { index: 0, str: '', choiceIdx: 0 },
    ];

    function processChunk() {
      if (generationRef.current !== currentRunId) return;

      const startTime = performance.now();

      while (stack.length > 0 && results.length < maxTarget && performance.now() - startTime < 12) {
        const frame = stack[stack.length - 1];

        if (frame.index === lettersOnly.length) {
          results.push(frame.str);
          stack.pop();
          continue;
        }

        const item = lettersOnly[frame.index];
        const choices = Array.from(
          new Set(
            item.cipherOptions && item.cipherOptions.length > 0
              ? item.cipherOptions
              : [item.prob1, item.prob2]
          )
        );

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

      if (results.length < maxTarget && stack.length > 0) {
        requestAnimationFrame(processChunk);
      } else {
        // Complete! Only set final list to avoid intermediate re-render lock
        setGeneratedList(results);
        setIsGenerating(false);
        setProgressPercent(100);
        setHasGenerated(true);
      }
    }

    requestAnimationFrame(processChunk);
  };

  // Text change handler: auto-generate for small inputs (<= 3 letters = 8 combos),
  // but for 4+ letters, decouple typing so typing stays 100% instant and butter-smooth!
  useEffect(() => {
    if (lettersCount <= 3 || isDualMode) {
      startGeneration();
    } else {
      generationRef.current++;
      setIsGenerating(false);
      setHasGenerated(false);
      setGeneratedList([]);
      setProgressPercent(0);
      setVisibleCount(48);
    }
  }, [lettersCount, details]);

  // Listen to external generate signal (from Enter key or Generate button under Clear)
  useEffect(() => {
    if (generateSignal && generateSignal > 0) {
      startGeneration();
      // Keep viewport in place without scrolling down
    }
  }, [generateSignal]);

  // Notify parent of generation status for button syncing
  useEffect(() => {
    onGenerationStateChange?.({ isGenerating, hasGenerated });
  }, [isGenerating, hasGenerated, onGenerationStateChange]);

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
      const len = d.cipherOptions?.length || 2;
      return Math.floor(Math.random() * len);
    });
    onSetSelectedProbabilities(randomized);
  };

  const handleInvert = () => {
    const inverted = details.map((d, i) => {
      if (d.isSpecialOrSpace) return 0;
      const len = d.cipherOptions?.length || 2;
      const current = selectedProbabilities[i] ?? 0;
      return (current + 1) % len;
    });
    onSetSelectedProbabilities(inverted);
  };

  // Helper to reverse words
  const reverseString = (str: string) => Array.from(str).reverse().join('');

  // Process combinations (combines normal and reversed)
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

  // Segment each combination into Quranic Opening Words as much as possible
  const segmentedMap = useMemo(() => {
    const map = new Map<string, QuranicSegmentationResult>();
    for (const item of processedCombinations) {
      if (!map.has(item.word)) {
        map.set(item.word, segmentIntoQuranicWords(item.word));
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
  // "combo" is the original normal-order string that generated the selection
  const handleSelectCombo = (originalCombo: string) => {
    let comboLetterIdx = 0;
    const newProbs = details.map((d) => {
      if (d.isSpecialOrSpace) return 0;
      const targetChar = originalCombo[comboLetterIdx++];
      if (targetChar === d.prob2) return 1;
      return 0;
    });
    onSetSelectedProbabilities(newProbs);
  };

  // Exact Quranic Vocabulary Map
  const quranicVocabExactMap = useMemo(() => {
    const map = new Map<string, QuranicWordMeta | null>();
    for (const item of processedCombinations) {
      if (!map.has(item.word)) {
        map.set(item.word, quranicDictionary.getWordDetails(item.word));
      }
    }
    return map;
  }, [processedCombinations, quranicDictCount]);

  // Nearest Quranic Vocabulary Map (Calculated on top 40 non-exact candidates to avoid UI locking)
  const quranicNearestMap = useMemo(() => {
    const map = new Map<string, QuranicNearestMatch | null>();
    if (!hasGenerated || processedCombinations.length === 0) return map;
    let computedCount = 0;
    for (const item of processedCombinations) {
      if (computedCount >= 40) break;
      if (!map.has(item.word) && !quranicVocabExactMap.get(item.word)) {
        map.set(item.word, quranicDictionary.findClosestQuranicWord(item.word));
        computedCount++;
      }
    }
    return map;
  }, [processedCombinations, quranicDictCount, quranicVocabExactMap, hasGenerated]);

  // List of exact Quranic words found in combinations
  const exactQuranicList = useMemo(() => {
    const list: { combo: string; meta: QuranicWordMeta; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedCombinations) {
      const meta = quranicVocabExactMap.get(item.word);
      if (meta && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ combo: item.word, meta, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedCombinations, quranicVocabExactMap]);

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

  // Arabic Dictionary Status Map
  const dictionaryStatus = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of processedCombinations) {
      if (!map.has(item.word)) {
        map.set(item.word, arabicDictionary.getMatchedWord(item.word));
      }
    }
    return map;
  }, [processedCombinations, arabicDictCount]);

  // List of exact Arabic dictionary words found in combinations
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

  // Current selected cipher text display & its Quranic segmentation
  const displaySelectedCipher = customStringNoSpaces || customStringWithSpaces;

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

  // Smart Priority Sorting (Option 4):
  // 1. Exact Quranic Vocabulary matches first
  // 2. Arabic Dictionary words second
  // 3. Noorani multi-letter opening words third
  // 4. Other combinations
  const sortedCombinations = useMemo(() => {
    const list = [...processedCombinations];
    return list.sort((a, b) => {
      const aQuranic = quranicVocabExactMap.get(a.word) ? 1 : 0;
      const bQuranic = quranicVocabExactMap.get(b.word) ? 1 : 0;
      if (aQuranic !== bQuranic) return bQuranic - aQuranic;

      const aDict = dictionaryStatus.get(a.word) ? 1 : 0;
      const bDict = dictionaryStatus.get(b.word) ? 1 : 0;
      if (aDict !== bDict) return bDict - aDict;

      const aMulti = (segmentedMap.get(a.word)?.multiWordCount ?? 0) > 0 ? 1 : 0;
      const bMulti = (segmentedMap.get(b.word)?.multiWordCount ?? 0) > 0 ? 1 : 0;
      if (aMulti !== bMulti) return bMulti - aMulti;

      return 0;
    });
  }, [processedCombinations, quranicVocabExactMap, dictionaryStatus, segmentedMap]);

  // Filtering by substring, Quranic vocabulary, Arabic dictionary, or multi-letter opening words
  const normalizedFilter = cleanText(combinationFilter).trim();
  const filteredCombinations = useMemo(() => {
    return sortedCombinations.filter((item) => {
      if (onlyQuranicVocab) {
        const meta = quranicVocabExactMap.get(item.word);
        if (!meta) return false;
      }
      if (onlyDictWords) {
        const isDict = dictionaryStatus.get(item.word);
        if (!isDict) return false;
      }
      if (onlyQuranicMatches) {
        const seg = segmentedMap.get(item.word);
        if (!seg || seg.multiWordCount === 0) return false;
      }
      if (!normalizedFilter) return true;
      return item.word.includes(normalizedFilter);
    });
  }, [
    sortedCombinations,
    onlyQuranicVocab,
    onlyDictWords,
    onlyQuranicMatches,
    normalizedFilter,
    quranicVocabExactMap,
    dictionaryStatus,
    segmentedMap,
  ]);

  // Batching / Pagination: display first 48 combinations to keep DOM super light
  const displayedCombinations = useMemo(() => {
    return filteredCombinations.slice(0, visibleCount);
  }, [filteredCombinations, visibleCount]);

  // Reset visibleCount when filter changes
  useEffect(() => {
    setVisibleCount(48);
  }, [combinationFilter, onlyQuranicVocab, onlyDictWords, onlyQuranicMatches]);

  return (
    <div className="space-y-4">
      {/* 0. Summary Box Immediately Below Input */}
      <ResultsSummaryBox
        exactQuranicList={exactQuranicList}
        exactDictList={exactDictList}
        nooraniMatchesCount={quranicMatchesCount}
        nearestQuranicList={nearestQuranicList}
        isGenerating={isGenerating}
        hasGenerated={hasGenerated || lettersCount <= 3}
        onSelectWord={handleSelectCombo}
        onGenerate={startGeneration}
        totalCombinations={totalCombinationsPossible}
      />

      {!isDualMode && (
        <>
          {/* 1. LetterAnalysisCard (Moved here to sit below summary) */}
          <LetterAnalysisCard
            details={details}
            selectedProbabilities={selectedProbabilities}
            onToggleProbability={onToggleProbability}
          />
        </>
      )}

      {/* 2. Quranic Combinations Lexicon (Vocabulary Matching) */}
      {!isDualMode && lettersCount > 0 && (
        <QuranicCombinationsLexicon
          exactMatches={exactQuranicList}
          nearestMatches={nearestQuranicList}
          onSelectCombo={handleSelectCombo}
          onFilterExact={() => setOnlyQuranicVocab(!onlyQuranicVocab)}
          isOnlyExactActive={onlyQuranicVocab}
          onGenerate={startGeneration}
          isGenerating={isGenerating}
          hasGenerated={hasGenerated || lettersCount <= 3}
          totalCombinations={totalCombinationsPossible}
          isDualMode={isDualMode}
        />
      )}

      {/* 2. Combinations List with Noorani Dictionary & Quranic Vocabulary Matching */}
      {!isDualMode && (
      <div id="all-combinations-card" className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <h4 id="all-combinations-title" className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              قائمة الاحتمالات (معجم الأحرف النورانية والمفردات القرآنية)
            </h4>
            <span className="text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded-md">
              {totalCombinationsPossible.toLocaleString('ar-EG')} إجمالي ممكن
            </span>

            {/* Exact Quranic Words Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>مفردات قرآنية متطابقة:</span>
              <span className="font-black text-amber-950 dark:text-amber-200">
                {exactQuranicList.length} كلمة
              </span>
            </div>

            {/* Arabic Dictionary Words Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
              <SpellCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>كلمات قاموسية:</span>
              <span className="font-black text-emerald-950 dark:text-emerald-200">
                {exactDictList.length} كلمة
              </span>
            </div>

            {/* Noorani Dictionary Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>فواتح نورانية:</span>
              <span className="font-extrabold text-teal-900 dark:text-teal-200">
                {quranicMatchesCount} احتمال
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Filter: Only exact Quranic vocabulary */}
            <button
              type="button"
              id="quranic-vocab-only-btn"
              onClick={() => setOnlyQuranicVocab(!onlyQuranicVocab)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                onlyQuranicVocab
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300 dark:ring-amber-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700'
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
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300 dark:ring-emerald-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700'
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
                  ? 'bg-teal-700 text-white border-teal-800 shadow-2xs ring-2 ring-teal-300 dark:ring-teal-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-200 dark:hover:border-teal-700'
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
                  ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-600'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
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
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-44 text-right bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
            />
          </div>
        </div>

        {/* On-Demand Trigger Box for 4+ letters when not generated yet */}
        {!hasGenerated && !isGenerating && lettersCount > 3 && (
          <div className="p-6 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-linear-to-b from-amber-50/70 via-white to-amber-50/70 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900 text-center space-y-3.5 my-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 mx-auto flex items-center justify-center shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                يوجد {totalCombinationsPossible.toLocaleString('ar-EG')} احتمال تشفيري ممكن
              </h5>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                تم تفعيل التوليد عند الطلب لضمان سرعة واستجابة المتصفح الفائقة أثناء الكتابة. اضغط الزر لتوليد قائمة الاحتمالات وفرز الكلمات القرآنية والمعجمية.
              </p>
            </div>
            <button
              type="button"
              id="generate-encryption-combos-btn"
              onClick={startGeneration}
              className="inline-flex items-center gap-2 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>توليد وعرض قائمة الاحتمالات ({maxTarget} احتمال)</span>
            </button>
          </div>
        )}

        {/* Progress Bar (visible during generation) */}
        {isGenerating && (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                <span>جاري معالجة وتوليد ومطابقة الاحتمالات مع المعجمين القرآني واللغوي...</span>
              </span>
              <span className="font-bold text-stone-700 dark:text-stone-300">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-200 dark:border-stone-700">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Filter Indicator */}
        {(normalizedFilter || onlyQuranicMatches || onlyQuranicVocab || onlyDictWords) && (
          <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg flex-wrap gap-2">
            <span>
              {onlyQuranicVocab && (
                <strong className="text-amber-900 dark:text-amber-300 ml-1">(المفردات القرآنية المعتمدة فقط)</strong>
              )}
              {onlyDictWords && (
                <strong className="text-emerald-900 dark:text-emerald-300 ml-1">(الكلمات العربية القاموسية فقط)</strong>
              )}
              {onlyQuranicMatches && (
                <strong className="text-teal-800 dark:text-teal-300 ml-1">(فواتح قرآنية مركبة فقط)</strong>
              )}
              {normalizedFilter && (
                <span>
                  مطابقة المقطع &quot;<strong className="text-amber-800 dark:text-amber-300">{normalizedFilter}</strong>&quot;
                </span>
              )}
            </span>
            <span className="font-bold text-amber-900 dark:text-amber-300">{filteredCombinations.length} احتمال</span>
          </div>
        )}

        {/* Legend for Quranic & Noorani colors */}
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 inline-block shadow-2xs" />
            <strong className="text-amber-950 dark:text-amber-300">ذهبي:</strong> مفردة وردت في القرآن الكريم
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs" />
            <strong className="text-emerald-900 dark:text-emerald-300">أخضر:</strong> كلمة عربية موثقة في القاموس
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-teal-600 border border-teal-700 inline-block" />
            <strong className="text-teal-900 dark:text-teal-300">تركواز:</strong> فاتحة قرآنية مركبة ({QURANIC_WORDS.filter((w) => w.length > 1).join('، ')})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 inline-block" />
            <span>احتمال توليفي</span>
          </span>
        </div>

        {/* Combinations Grid (shown when generated or during small input) */}
        {(hasGenerated || isGenerating || lettersCount <= 3) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1">
            {displayedCombinations.map((item, idx) => {
              const hasMatch = normalizedFilter && item.word.includes(normalizedFilter);
              const segmentation = segmentedMap.get(item.word) || segmentIntoQuranicWords(item.word);
              const hasMultiQuranic = segmentation.multiWordCount > 0;
              const exactMeta = quranicVocabExactMap.get(item.word);
              const nearestMeta = quranicNearestMap.get(item.word);
              const isDictWord = dictionaryStatus.get(item.word);

              return (
                <div
                  key={idx}
                  id={`combo-item-${idx}`}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 select-none group relative ${
                    exactMeta
                      ? 'border-amber-400 dark:border-amber-600 bg-linear-to-b from-amber-50 to-white dark:from-amber-950/50 dark:to-stone-900 shadow-xs ring-1 ring-amber-300 dark:ring-amber-800'
                      : isDictWord
                      ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-2xs ring-1 ring-emerald-300 dark:ring-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                      : hasMultiQuranic
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50/70 dark:bg-teal-950/40 shadow-2xs hover:bg-teal-50 dark:hover:bg-teal-950/60'
                      : hasMatch
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50/80 dark:bg-amber-950/50 shadow-2xs'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800 hover:bg-amber-50/60 dark:hover:bg-stone-700 hover:border-amber-300 dark:hover:border-stone-700'
                  }`}
                >
                  {/* Reversed Indicator Badge */}
                  {item.isReversed && (
                    <div className="absolute top-0 right-0 -mt-1.5 -mr-1.5 bg-stone-700 dark:bg-stone-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 z-10">
                      معكوس
                    </div>
                  )}
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
                            ? 'text-amber-950 dark:text-amber-200 text-lg'
                            : isDictWord
                            ? 'text-emerald-950 dark:text-emerald-200 text-base font-extrabold'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                        title={exactMeta ? `التركيب الأصلي: ${item.word}` : typeof isDictWord === 'string' ? `التركيب الأصلي: ${item.word}` : undefined}
                      >
                        {exactMeta ? exactMeta.word : (typeof isDictWord === 'string' ? isDictWord : item.word)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectCombo(item.original)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-2xs font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                          exactMeta
                            ? 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800'
                            : isDictWord
                            ? 'text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800'
                            : 'text-stone-700 dark:text-stone-300 bg-stone-200/80 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600'
                        }`}
                        title="اعتماد هذا المشفر في النص المعتمد"
                      >
                        تحديد
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.word, `combo-${idx}`)}
                        className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title="نسخ هذا الاحتمال"
                      >
                        {copiedKey === `combo-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quranic & Dictionary Vocabulary Match Details */}
                  <div className="space-y-1">
                    {isDictWord && !exactMeta && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-2xs font-bold w-fit">
                        <SpellCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
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
                    <div className="pt-1.5 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-1 text-2xs">
                      <NooraniSegmentsBadge segmentation={segmentation} />
                      <span className="text-stone-400 dark:text-stone-500 font-mono shrink-0">
                        {segmentation.formattedDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCombinations.length === 0 && !isGenerating && (
              <div className="col-span-full py-8 text-center text-xs text-stone-400 dark:text-stone-500 flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-stone-300 dark:text-stone-600" />
                <span>لا توجد احتمالات مطابقة لشروط التصفية المدخلة</span>
              </div>
            )}
          </div>
        )}

        {/* Pagination / Show More for light DOM */}
        {(hasGenerated || lettersCount <= 3) && filteredCombinations.length > visibleCount && (
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              يتم عرض <strong className="text-stone-800 dark:text-stone-200">{displayedCombinations.length}</strong> من أصل{' '}
              <strong className="text-stone-800 dark:text-stone-200">{filteredCombinations.length}</strong> احتمال (الأولوية للكلمات القرآنية والمعجمية)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="show-more-encryption-combos-btn"
                onClick={() => setVisibleCount((prev) => Math.min(prev + 48, filteredCombinations.length))}
                className="px-3.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer"
              >
                عرض المزيد (+{Math.min(48, filteredCombinations.length - visibleCount)})
              </button>
              <button
                type="button"
                id="show-all-encryption-combos-btn"
                onClick={() => setVisibleCount(filteredCombinations.length)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                عرض الكل ({filteredCombinations.length})
              </button>
            </div>
          </div>
        )}
      </div>
      )}
      {/* 3. Current Selected Cipher String Display with Noorani Breakdown (نقل إلى أسفل الصفحة) */}
      {!isDualMode && (
      <div id="adopted-cipher-section" className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              النص المشفر المعتمد (بدون فراغات):
            </span>
            {selectedCipherSegmentation.multiWordCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                <span>يتضمن فواتح قرآنية</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="randomize-cipher-btn"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="توليف عشوائي بين الاحتمالين"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>توليف عشوائي</span>
            </button>

            <button
              type="button"
              id="invert-cipher-btn"
              onClick={handleInvert}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="عكس الاحتمال الأول والثاني"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span>عكس الاختيارات</span>
            </button>

            <button
              type="button"
              id="copy-custom-btn"
              onClick={() => handleCopy(displaySelectedCipher, 'custom')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
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
      )}
    </div>
  );
}

