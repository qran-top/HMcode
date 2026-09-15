import { useState } from 'react';
import { EncryptedLetterDetail, getAllCombinations } from '../cipherData';
import { Copy, Check, Shuffle, Sparkles, ChevronDown, ChevronUp, Layers, RefreshCw } from 'lucide-react';

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
  const [showAllCombinations, setShowAllCombinations] = useState(false);
  const [combinationFilter, setCombinationFilter] = useState('');

  if (details.length === 0) return null;

  // Compute probability 1 string
  const prob1String = details
    .map((d) => (d.isSpecialOrSpace ? d.originalChar : d.prob1))
    .join('');

  // Compute probability 2 string
  const prob2String = details
    .map((d) => (d.isSpecialOrSpace ? d.originalChar : d.prob2))
    .join('');

  // Compute current custom/mixed string
  const customString = details
    .map((d, i) => {
      if (d.isSpecialOrSpace) return d.originalChar;
      const choice = selectedProbabilities[i] ?? 0;
      return choice === 0 ? d.prob1 : d.prob2;
    })
    .join('');

  const lettersCount = details.filter((d) => !d.isSpecialOrSpace).length;
  const totalCombinationsCount = Math.pow(2, lettersCount);
  const combinationsList = showAllCombinations ? getAllCombinations(details, 256) : [];

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

  const handleAllProb1 = () => {
    onSetSelectedProbabilities(details.map(() => 0));
  };

  const handleAllProb2 = () => {
    onSetSelectedProbabilities(details.map(() => 1));
  };

  const filteredCombinations = combinationsList.filter((c) =>
    combinationFilter ? c.includes(combinationFilter) : true
  );

  return (
    <div className="space-y-4">
      {/* Primary Results Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Full Probability 1 */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                الاحتمال الأول (لكافة الحروف)
              </span>
              <button
                type="button"
                id="copy-prob1-btn"
                onClick={() => handleCopy(prob1String, 'prob1')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'prob1' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              استخدام الحرف الأول من كل طبقة لجميع حروف الكلمة
            </p>
          </div>

          <div className="bg-stone-900 rounded-xl p-4 text-center border border-stone-800">
            <div
              dir="rtl"
              className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-wider select-all break-all"
            >
              {prob1String}
            </div>
          </div>
        </div>

        {/* Option 2: Full Probability 2 */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                الاحتمال الثاني (لكافة الحروف)
              </span>
              <button
                type="button"
                id="copy-prob2-btn"
                onClick={() => handleCopy(prob2String, 'prob2')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'prob2' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              استخدام الحرف الثاني من كل طبقة لجميع حروف الكلمة
            </p>
          </div>

          <div className="bg-stone-900 rounded-xl p-4 text-center border border-stone-800">
            <div
              dir="rtl"
              className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-wider select-all break-all"
            >
              {prob2String}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Selected Mix Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                التشفير المخصص / التوليفة النشطة
              </span>
              <span className="text-xs text-stone-400">
                (يمكنك تبديل أي حرف من بطاقات التحليل أعلاه)
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              التشفير الناتج عن اختيارك لكل حرف سواء الاحتمال الأول أو الثاني
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="randomize-cipher-btn"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="توزيع عشوائي بين الاحتمالين"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-600" />
              <span>توليف عشوائي</span>
            </button>

            <button
              type="button"
              id="invert-cipher-btn"
              onClick={handleInvert}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="عكس الاختيارات الحالية"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>عكس الاختيارات</span>
            </button>

            <button
              type="button"
              id="copy-custom-btn"
              onClick={() => handleCopy(customString, 'custom')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {copiedKey === 'custom' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التشفير</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-stone-950 rounded-xl p-4 sm:p-5 flex items-center justify-center border border-stone-800">
          <div
            dir="rtl"
            className="text-2xl sm:text-4xl font-black text-amber-300 tracking-widest select-all break-all text-center"
          >
            {customString}
          </div>
        </div>
      </div>

      {/* All Theoretical Combinations Explorer */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 id="all-combinations-title" className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-600" />
              <span>جميع الاحتمالات الممكنة للكلمة</span>
              <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                2^{lettersCount} = {totalCombinationsCount.toLocaleString('ar-EG')} احتمالاً
              </span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              بما أن كل حرف له احتمالان، فإن أي كلمة يتشكل لها (2 أس عدد الأحرف) تشفيراً ممكناً.
            </p>
          </div>

          <button
            type="button"
            id="toggle-combinations-btn"
            onClick={() => setShowAllCombinations(!showAllCombinations)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-800 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>{showAllCombinations ? 'إخفاء القائمة' : 'عرض قائمة الاحتمالات'}</span>
            {showAllCombinations ? (
              <ChevronUp className="w-4 h-4 text-stone-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-500" />
            )}
          </button>
        </div>

        {showAllCombinations && (
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-stone-500">
                {totalCombinationsCount > 256
                  ? `يتم عرض أول 256 احتمالاً من إجمالي ${totalCombinationsCount.toLocaleString('ar-EG')}`
                  : `يتم عرض جميع الاحتمالات (${combinationsList.length})`}
              </div>

              {combinationsList.length > 8 && (
                <input
                  type="text"
                  placeholder="تصفية حسب أحرف معينة..."
                  value={combinationFilter}
                  onChange={(e) => setCombinationFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-48 text-right"
                />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1">
              {filteredCombinations.map((combo, idx) => (
                <div
                  key={idx}
                  id={`combo-item-${idx}`}
                  className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-amber-50/60 hover:border-amber-300 transition-colors flex items-center justify-between gap-1 group"
                >
                  <span className="font-extrabold text-stone-800 text-sm tracking-wider">
                    {combo}
                  </span>
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
