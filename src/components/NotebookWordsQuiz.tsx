import { useState, useMemo } from 'react';
import {
  Sparkles,
  Shuffle,
  RotateCcw,
  Copy,
  Check,
  Download,
  Bot,
  ExternalLink,
  BookOpen,
  ArrowLeft,
  Share2,
  HelpCircle,
} from 'lucide-react';
import { NotebookEntry } from '../context/NotebookContext';
import {
  groupNotebookEntriesByOriginalWord,
  generateAIPromptForSentenceMaking,
  WordGroup,
} from '../utils/aiPromptGenerator';
import { calculateGematriaSum } from '../utils/gematriaEngine';

interface NotebookWordsQuizProps {
  entries: NotebookEntry[];
  onAddSampleData?: () => void;
  onOpenQuickAdd?: () => void;
}

export function NotebookWordsQuiz({
  entries,
  onAddSampleData,
  onOpenQuickAdd,
}: NotebookWordsQuizProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [promptStyle, setPromptStyle] = useState<'all' | 'spiritual' | 'wisdom' | 'poetic'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'builder' | 'prompt'>('builder');

  // Group entries by original word sequence
  const wordGroups: WordGroup[] = useMemo(() => {
    return groupNotebookEntriesByOriginalWord(entries);
  }, [entries]);

  // Track the selected candidate index for each original word group
  // e.g. { [groupId]: candidateIndex }
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, number>>({});

  // Auto-initialize first candidate for each group if not set
  useMemo(() => {
    setSelectedCandidates((prev) => {
      const next = { ...prev };
      let changed = false;
      wordGroups.forEach((grp) => {
        if (next[grp.id] === undefined && grp.candidates.length > 0) {
          next[grp.id] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [wordGroups]);

  // The constructed sentence from user's selections
  const constructedSentenceWords = useMemo(() => {
    return wordGroups
      .map((grp) => {
        const selectedIdx = selectedCandidates[grp.id] ?? 0;
        const candidate = grp.candidates[selectedIdx];
        return candidate ? candidate.resultWord : '';
      })
      .filter(Boolean);
  }, [wordGroups, selectedCandidates]);

  const constructedSentence = useMemo(() => {
    return constructedSentenceWords.join(' ');
  }, [constructedSentenceWords]);

  // Calculate Gematria value of the assembled sentence
  const sentenceGematria = useMemo(() => {
    if (!constructedSentence) return 0;
    return calculateGematriaSum(constructedSentence);
  }, [constructedSentence]);

  // AI Prompt generated from current notebook entries
  const generatedAIPrompt = useMemo(() => {
    return generateAIPromptForSentenceMaking(entries, {
      style: promptStyle,
      includeQuranicNotes: true,
    });
  }, [entries, promptStyle]);

  // Handle Copy helper
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  // Download file helper
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Shuffle / Randomize candidates to generate an unexpected sentence
  const handleShuffle = () => {
    const next: Record<string, number> = {};
    wordGroups.forEach((grp) => {
      if (grp.candidates.length > 0) {
        const randomIdx = Math.floor(Math.random() * grp.candidates.length);
        next[grp.id] = randomIdx;
      }
    });
    setSelectedCandidates(next);
  };

  // Reset to first candidate
  const handleReset = () => {
    const next: Record<string, number> = {};
    wordGroups.forEach((grp) => {
      if (grp.candidates.length > 0) {
        next[grp.id] = 0;
      }
    });
    setSelectedCandidates(next);
  };

  if (entries.length === 0 || wordGroups.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center space-y-4 max-w-lg mx-auto py-10" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-black text-stone-800 dark:text-stone-100">
            كويز وتوليف الجمل من دفتر الكلمات
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            الدفتر فارغ حالياً. احفظ الكلمات والنتائج أثناء البحث وفك التشفير لتوليد الجمل واختبار الترابط، أو قم بإنشاء برومبت موجه للذكاء الاصطناعي.
          </p>
        </div>

        {onAddSampleData && (
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onAddSampleData}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تجربة مثال لكلمات ونتائج جاهزة</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50/50 dark:bg-stone-900/50" dir="rtl">
      {/* Top Navigation Sub-Tabs */}
      <div className="p-2 sm:p-2.5 border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('builder')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'builder'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>كويز التوليف اليدوي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('prompt')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'prompt'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            <span>برومبت الذكاء الاصطناعي (AI Prompt)</span>
          </button>
        </div>

        <div className="text-3xs font-bold text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
          {wordGroups.length} كلمات أصلية | {entries.length} نتيجة
        </div>
      </div>

      {/* SUB-TAB 1: INTERACTIVE BUILDER */}
      {activeSubTab === 'builder' && (
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3">
          {/* Assembled Sentence Display Box */}
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 bg-white dark:bg-stone-900 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-3xs font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>الجملة المُشكَّلة من النتائج المختارة:</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-3xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                  title="توليف عشوائي مفاجئ للنتائج"
                >
                  <Shuffle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>توليفة عشوائية</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  title="إعادة تعيين للأول"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Formed Sentence Display */}
            <div className="min-h-[50px] flex items-center justify-center p-2 rounded-lg bg-amber-50/50 dark:bg-stone-950/60 border border-amber-200/60 dark:border-amber-900/40 text-center">
              {constructedSentence ? (
                <span className="font-['Amiri',serif] text-base sm:text-lg font-bold text-stone-900 dark:text-amber-200 leading-relaxed selection:bg-amber-300">
                  {constructedSentence}
                </span>
              ) : (
                <span className="text-xs text-stone-400 italic">
                  اختر كلمة واحدة من نتائج كل مجموعة لتشكيل الجملة
                </span>
              )}
            </div>

            {/* Sentence Meta Toolbar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/40 dark:border-amber-900/40 flex-wrap text-3xs font-bold">
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                <span>العدد: {constructedSentenceWords.length} كلمات</span>
                {sentenceGematria > 0 && (
                  <span className="font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    مجموع الجُمَّل: {sentenceGematria}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(constructedSentence, 'sentence')}
                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title="نسخ الجملة"
                >
                  {copiedType === 'sentence' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'sentence' ? 'تم النسخ!' : 'نسخ الجملة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('prompt')}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                  title="تصدير برومبت ذكاء اصطناعي"
                >
                  <Bot className="w-3 h-3" />
                  <span>برومبت AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step Word Selector Columns */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-2xs font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>اختر مفردة واحدة لكل كلمة أصلية بالترتيب:</span>
              </span>
              <span className="text-3xs text-stone-400">انقر على المفردة لتضمينها في الجملة</span>
            </div>

            <div className="space-y-2">
              {wordGroups.map((grp, gIdx) => {
                const selectedIdx = selectedCandidates[grp.id] ?? 0;

                return (
                  <div
                    key={grp.id}
                    className="p-2 sm:p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs space-y-1.5"
                  >
                    {/* Header: Original Word */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-3xs shrink-0 font-mono">
                          {gIdx + 1}
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-3xs text-stone-400 font-medium">الكلمة الأصلية:</span>
                          <span className="font-['Amiri',serif] font-bold text-sm text-stone-900 dark:text-stone-100">
                            {grp.originalWord}
                          </span>
                        </div>
                      </div>

                      <span className="text-3xs text-stone-400 font-mono">
                        {grp.candidates.length} نتائج
                      </span>
                    </div>

                    {/* Candidates Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {grp.candidates.map((c, cIdx) => {
                        const isSelected = selectedIdx === cIdx;

                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => {
                              setSelectedCandidates((prev) => ({
                                ...prev,
                                [grp.id]: cIdx,
                              }));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-2xs border border-amber-700 scale-102'
                                : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-750'
                            }`}
                          >
                            <span className="font-['Amiri',serif]">{c.resultWord}</span>
                            {c.isReversed && (
                              <span
                                className={`text-4xs px-1 py-0.1 rounded font-normal ${
                                  isSelected ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                                }`}
                              >
                                معكوسة
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI PROMPT EXPORTER */}
      {activeSubTab === 'prompt' && (
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3">
          {/* Prompt Explanation & AI Controls */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-extrabold">
                <Bot className="w-4 h-4" />
                <span>برومبت الذكاء الاصطناعي الجاهز لتأليف الجمل</span>
              </div>

              {/* Style Selector */}
              <div className="flex items-center gap-1 text-3xs font-bold">
                <span className="text-stone-500 dark:text-stone-400">الطابع:</span>
                <select
                  value={promptStyle}
                  onChange={(e) => setPromptStyle(e.target.value as any)}
                  className="py-0.5 px-1.5 rounded border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-bold"
                >
                  <option value="all">شامل ومتنوع (جميع الأنماط)</option>
                  <option value="spiritual">روحاني وإيماني قرآني</option>
                  <option value="wisdom">حكم وأمثال تأملية</option>
                  <option value="poetic">أدبي وشاعري فصيح</option>
                </select>
              </div>
            </div>

            <p className="text-3xs text-stone-600 dark:text-stone-300 leading-relaxed">
              هذا البرومبت يشرح للذكاء الاصطناعي (مثل ChatGPT أو Gemini أو Claude) أن الكلمات الأصلية مرتبة، ولكل كلمة أصلية قائمة من النتائج، ويطلب منه بدقة اختيار كلمة من نتائج كل كلمة أصلية لصياغة جمل عربية مفيدة وبليغة مكتملة الأركان.
            </p>
          </div>

          {/* Quick AI Launch Links */}
          <div className="flex items-center gap-1.5 flex-wrap text-2xs font-bold">
            <span className="text-stone-400 text-3xs">فتح في:</span>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => handleCopy(generatedAIPrompt, 'copied_to_clipboard')}
              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 inline-flex items-center gap-1 transition-all"
            >
              <span>ChatGPT</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
            </a>

            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => handleCopy(generatedAIPrompt, 'copied_to_clipboard')}
              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 inline-flex items-center gap-1 transition-all"
            >
              <span>Gemini</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
            </a>

            <a
              href="https://claude.ai"
              target="_blank"
              rel="noreferrer"
              onClick={() => handleCopy(generatedAIPrompt, 'copied_to_clipboard')}
              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 inline-flex items-center gap-1 transition-all"
            >
              <span>Claude</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
            </a>
          </div>

          {/* Prompt Content Preview Box */}
          <div className="relative rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-2xs">
            <pre className="text-2xs font-mono text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-all">
              {generatedAIPrompt}
            </pre>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                handleDownload(
                  generatedAIPrompt,
                  `برومبت_الذكاء_الاصطناعي_لتأليف_الجمل_${new Date().toISOString().slice(0, 10)}.txt`
                )
              }
              className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border border-stone-200 dark:border-stone-700 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>تحميل البرومبت كملف TXT</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(generatedAIPrompt, 'full_prompt')}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              {copiedType === 'full_prompt' ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedType === 'full_prompt' ? 'تم نسخ البرومبت بنجاح! ✓' : 'نسخ البرومبت للذكاء الاصطناعي'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
