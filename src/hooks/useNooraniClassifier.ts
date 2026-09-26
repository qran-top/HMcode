import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MergedNooraniFormulaItem,
  NooraniAlgorithmId,
  classifyAndMergeNooraniFormulasAsync,
  ClassifyProgressUpdate,
  NOORANI_ALGORITHMS,
} from '../utils/gematriaEngine';

interface UseNooraniClassifierOptions {
  targetMashriqi: number;
  targetMaghribi: number;
  algorithmId: NooraniAlgorithmId;
  uniqueNooraniOnly: boolean;
  queryText?: string;
  maxResults?: number;
  excludedLetters?: string[];
  onlyRepeated?: boolean;
}

export interface UseNooraniClassifierReturn {
  mergedNooraniFormulas: MergedNooraniFormulaItem[];
  isCalculating: boolean;
  progress: number;
  progressMessage: string;
  wasCancelled: boolean;
  currentAlgorithm: typeof NOORANI_ALGORITHMS[0];
  cancelCalculation: () => void;
  retryCalculation: () => void;
}

// In-memory cache to guarantee instantaneous (0ms) switching between already visited algorithms
const formulaCache = new Map<string, MergedNooraniFormulaItem[]>();

export function useNooraniClassifier({
  targetMashriqi,
  targetMaghribi,
  algorithmId,
  uniqueNooraniOnly,
  queryText = '',
  maxResults = 80,
  excludedLetters,
  onlyRepeated = false,
}: UseNooraniClassifierOptions): UseNooraniClassifierReturn {
  const [mergedNooraniFormulas, setMergedNooraniFormulas] = useState<MergedNooraniFormulaItem[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [wasCancelled, setWasCancelled] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const runCountRef = useRef<number>(0);

  const currentAlgorithm = useMemo(() => {
    return NOORANI_ALGORITHMS.find((a) => a.id === algorithmId) || NOORANI_ALGORITHMS[0];
  }, [algorithmId]);

  const cancelCalculation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsCalculating(false);
    setWasCancelled(true);
    setProgress(0);
    setProgressMessage('تم إلغاء المعالجة بناءً على طلبك لتوفير موارد المتصفح');
  }, []);

  // Stable serialized representation of excluded letters
  const excludedKey = (excludedLetters && excludedLetters.length > 0)
    ? [...excludedLetters].sort().join(',')
    : '';

  const stableExcludedLetters = useMemo(() => {
    return excludedKey ? excludedKey.split(',') : [];
  }, [excludedKey]);

  const executeClassification = useCallback(
    async (forceBypassCache: boolean = false) => {
      // Abort any ongoing calculation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (targetMashriqi <= 0 && targetMaghribi <= 0) {
        setMergedNooraniFormulas([]);
        setIsCalculating(false);
        setProgress(0);
        setProgressMessage('');
        setWasCancelled(false);
        return;
      }

      const cleanQuery = (queryText || '').trim();
      const cacheKey = `${targetMashriqi}_${targetMaghribi}_${algorithmId}_${uniqueNooraniOnly}_${excludedKey}_${onlyRepeated}_${cleanQuery}_${maxResults}`;

      if (!forceBypassCache && formulaCache.has(cacheKey)) {
        const cached = formulaCache.get(cacheKey)!;
        setMergedNooraniFormulas(cached);
        setIsCalculating(false);
        setProgress(100);
        setProgressMessage(`اكتملت المعالجة (من الذاكرة المؤقتة: ${cached.length} تركيبة)`);
        setWasCancelled(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRunId = ++runCountRef.current;

      setIsCalculating(true);
      setWasCancelled(false);
      setProgress(5);
      setProgressMessage(`جاري تحضير خوارزمية: ${currentAlgorithm.name}...`);

      try {
        const results = await classifyAndMergeNooraniFormulasAsync(
          targetMashriqi,
          targetMaghribi,
          {
            uniqueLettersOnly: uniqueNooraniOnly,
            maxResults,
            algorithmId,
            queryText: cleanQuery,
            excludedLetters: stableExcludedLetters,
            onlyRepeated,
            signal: controller.signal,
            onProgress: (update: ClassifyProgressUpdate) => {
              if (runCountRef.current === currentRunId && !controller.signal.aborted) {
                setProgress(update.percent);
                setProgressMessage(update.message);
              }
            },
          }
        );

        if (runCountRef.current === currentRunId && !controller.signal.aborted) {
          formulaCache.set(cacheKey, results);
          setMergedNooraniFormulas(results);
          setIsCalculating(false);
          setProgress(100);
          setProgressMessage(`اكتمل البحث بنجاح (تم العثور على ${results.length} تركيبة)`);
          setWasCancelled(false);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          if (runCountRef.current === currentRunId) {
            setIsCalculating(false);
            setWasCancelled(true);
            setProgressMessage('تم إلغاء المعالجة');
          }
        } else {
          console.error('Noorani classification error:', err);
          if (runCountRef.current === currentRunId) {
            setIsCalculating(false);
            setProgressMessage('حدث خطأ أثناء المعالجة');
          }
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [targetMashriqi, targetMaghribi, algorithmId, uniqueNooraniOnly, excludedKey, stableExcludedLetters, onlyRepeated, queryText, maxResults, currentAlgorithm]
  );

  const retryCalculation = useCallback(() => {
    executeClassification(true);
  }, [executeClassification]);

  useEffect(() => {
    executeClassification(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [executeClassification]);

  return {
    mergedNooraniFormulas,
    isCalculating,
    progress,
    progressMessage,
    wasCancelled,
    currentAlgorithm,
    cancelCalculation,
    retryCalculation,
  };
}
