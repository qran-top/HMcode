import { useState, useMemo } from 'react';
import {
  SentenceCandidate,
  scanMultiWordCoherence,
} from '../utils/advancedCipherAnalysis';
import { quranicDictionary, QuranicWordMeta } from '../utils/quranicDictionary';
import { arabicDictionary } from '../utils/arabicDictionary';
import {
  analyzeWord,
  getAllCombinations,
  decryptCipherChar,
  getDecryptionCombinations,
  cleanText,
  LayerInfo,
} from '../cipherData';
import { Sparkles, BookOpen, Copy, Check, Layers, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { AddToNotebookButton } from './AddToNotebookButton';
import { useCipherLayers } from '../context/CipherLayersContext';

interface MultiWordCoherenceCardProps {
  inputText: string;
  layers: LayerInfo[];
  mode?: 'encryption' | 'decryption';
}

export function MultiWordCoherenceCard({
  inputText,
  layers,
  mode = 'encryption',
}: MultiWordCoherenceCardProps) {
  const { activeTableName } = useCipherLayers();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedSentence, setCopiedSentence] = useState<string | null>(null);

  const rawWords = useMemo(() => {
    return inputText
      .split(/\s+/)
      .map((w) => cleanText(w).replace(/[^ء-ي]/g, ''))
      .filter(Boolean);
  }, [inputText]);

  // Generate candidates per word
  const sentenceCandidates = useMemo(() => {
    if (rawWords.length < 2) return [];

    const wordCandidatesMap = new Map<
      string,
      { combo: string; meta?: QuranicWordMeta | null; isDict?: boolean }[]
    >();

    for (const w of rawWords) {
      if (!w) continue;
      // Generate combinations for single word
      let combos: string[] = [];
      if (mode === 'encryption') {
        const details = analyzeWord(w, layers);
        combos = getAllCombinations(details, 48, true);
      } else {
        const charList: string[] = Array.from(w);
        const details = charList.map((c: string) => ({
          char: c,
          isSpace: false,
          candidates: decryptCipherChar(c, layers).possibleLetters,
        }));
        combos = getDecryptionCombinations(details, 48, true);
      }

      const candidates = combos.map((combo) => {
        const exactMeta = quranicDictionary.getWordDetails(combo);
        const isDict = Boolean(arabicDictionary.getMatchedWord(combo));
        return {
          combo,
          meta: exactMeta,
          isDict,
        };
      });

      // Also include original word as fallback candidate
      candidates.unshift({
        combo: w,
        meta: quranicDictionary.getWordDetails(w),
        isDict: Boolean(arabicDictionary.getMatchedWord(w)),
      });

      wordCandidatesMap.set(w, candidates);
    }

    return scanMultiWordCoherence(inputText, wordCandidatesMap);
  }, [rawWords, layers, inputText, mode]);

  if (rawWords.length < 2 || sentenceCandidates.length === 0) {
    return null;
  }

  const handleCopy = (sentenceText: string) => {
    navigator.clipboard.writeText(sentenceText);
    setCopiedSentence(sentenceText);
    setTimeout(() => setCopiedSentence(null), 1800);
  };

  return (
    <div
      id="multi-word-coherence-card"
      className="bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-stone-900/60 dark:to-emerald-950/40 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 shadow-xs p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-amber-200/70 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <span>ماسح الجمل والعبارات المتكاملة (Coherence Scanner)</span>
              <span className="text-3xs px-2 py-0.5 rounded-full bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-extrabold">
                {sentenceCandidates.length} جمل مقترحة
              </span>
            </h4>
            <p className="text-2xs text-stone-600 dark:text-stone-400 mt-0.5">
              تركيب جمل متناسقة دلالياً حيث تتطابق كل كلمة مع مفردات القرآن الكريم والمعجم العربي في آنٍ واحد
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-stone-500 hover:bg-amber-100/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title={isExpanded ? 'طي القسم' : 'توسيع القسم'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2.5 pt-1">
          {sentenceCandidates.map((item, idx) => {
            const isCopied = copiedSentence === item.sentence;
            return (
              <div
                key={idx}
                className="bg-white/90 dark:bg-stone-900/90 rounded-xl border border-amber-200/80 dark:border-stone-700/80 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-all group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-black text-stone-950 dark:text-stone-100 tracking-wide font-serif">
                      {item.sentence}
                    </span>

                    {item.quranicCount > 0 && (
                      <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        {item.quranicCount} قرآنية
                      </span>
                    )}

                    {item.overallPurity >= 70 && (
                      <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        نورانية: {item.overallPurity}%
                      </span>
                    )}
                  </div>

                  {/* Word by word breakdown */}
                  <div className="flex items-center gap-1.5 flex-wrap text-2xs text-stone-500 dark:text-stone-400">
                    {item.words.map((w, wIdx) => (
                      <span
                        key={wIdx}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                          w.isQuranic
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold'
                            : w.isDict
                            ? 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 text-stone-500'
                        }`}
                      >
                        <span>{w.chosen}</span>
                        {w.surahName && <span className="text-3xs opacity-80">({w.surahName})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.sentence)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="نسخ الجملة بالكامل"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الجملة</span>
                      </>
                    )}
                  </button>

                  <AddToNotebookButton
                    word={mode === 'encryption' ? inputText : item.sentence}
                    cipher={mode === 'encryption' ? item.sentence : inputText}
                    systemName={activeTableName || undefined}
                    type="quranic"
                    variant="icon-only"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
