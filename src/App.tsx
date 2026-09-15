import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { LayersTable } from './components/LayersTable';
import { LetterAnalysisCard } from './components/LetterAnalysisCard';
import { EncryptionResults } from './components/EncryptionResults';
import { DecryptView } from './components/DecryptView';
import { analyzeWord, CIPHER_LAYERS } from './cipherData';
import {
  Sparkles,
  Eraser,
  HelpCircle,
  Layers as LayersIcon,
  ArrowDown,
  Info,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'table' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState('سلام');
  const [selectedProbabilities, setSelectedProbabilities] = useState<number[]>([0, 0, 0, 0]);

  // Analyze word to get layer details for each character
  const details = useMemo(() => {
    const analyzed = analyzeWord(inputText);
    return analyzed;
  }, [inputText]);

  // Keep selectedProbabilities synchronized with length of details
  const currentProbabilities = useMemo(() => {
    return details.map((_, i) => selectedProbabilities[i] ?? 0);
  }, [details, selectedProbabilities]);

  const handleToggleProbability = (index: number, probIndex: number) => {
    const updated = [...currentProbabilities];
    updated[index] = probIndex;
    setSelectedProbabilities(updated);
  };

  const handleClear = () => {
    setInputText('');
    setSelectedProbabilities([]);
  };

  const sampleWords = ['سلام', 'قمر', 'المشفر', 'نور', 'أبجد'];

  // List of active layer numbers in current text for highlighting in table
  const activeLayersInText = useMemo(() => {
    const layers = new Set<number>();
    details.forEach((d) => {
      if (d.layer) layers.add(d.layer.layer);
    });
    return Array.from(layers);
  }, [details]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-['Cairo',sans-serif]">
      {/* Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab 1: Encryption and Probabilities */}
        {activeTab === 'encrypt' && (
          <div className="space-y-6">
            {/* Input Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label
                  htmlFor="arabic-input"
                  className="text-base font-bold text-stone-900 flex items-center gap-2"
                >
                  <span>أدخل الكلمة أو الجملة المراد تشفيرها:</span>
                  <span className="text-xs font-normal text-stone-500">
                    ({details.filter((d) => !d.isSpecialOrSpace).length} حرفاً عربياً)
                  </span>
                </label>

                {inputText && (
                  <button
                    type="button"
                    id="clear-input-btn"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>مسح النص</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  id="arabic-input"
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب كلمة بالعربية هنا... مثلاً: قمر أو سلام"
                  className="w-full text-xl sm:text-2xl font-bold p-4 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right bg-stone-50/50 resize-none transition-all"
                />
              </div>

              {/* Sample Words Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  كلمات تجريبية:
                </span>
                {sampleWords.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setInputText(sample);
                      setSelectedProbabilities(new Array(sample.length).fill(0));
                    }}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                      inputText === sample
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                    }`}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* If no input */}
            {details.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center text-stone-500 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <LayersIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-800">اكتب كلمة بالعربية لبدء التشفير</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  يقوم المشفر بتحديد طبقة كل حرف (من الطبقات السبع) وعرض الاحتمالين المشفرين له،
                  ثم يولد التشفيرات الممكنة.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Letter by letter analysis with probabilities */}
                <LetterAnalysisCard
                  details={details}
                  selectedProbabilities={currentProbabilities}
                  onToggleProbability={handleToggleProbability}
                />

                {/* 2. Encryption Results (Option 1, Option 2, Mixed, Combinations) */}
                <EncryptionResults
                  details={details}
                  selectedProbabilities={currentProbabilities}
                  onSetSelectedProbabilities={setSelectedProbabilities}
                />

                {/* 3. Embedded Mini Table of Active Layers */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" />
                      <span>الطبقات المستخدمة في تشفير هذه الكلمة ({activeLayersInText.length} طبقات)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('table')}
                      className="text-xs text-amber-700 hover:text-amber-900 font-semibold cursor-pointer underline"
                    >
                      عرض الجدول الكامل لجميع الطبقات
                    </button>
                  </div>
                  <LayersTable
                    highlightedLayerNumbers={activeLayersInText}
                    onSelectLetter={(char) => setInputText((prev) => prev + char)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Full 7-Layers Reference Table */}
        {activeTab === 'table' && (
          <div className="space-y-6">
            <LayersTable
              highlightedLayerNumbers={activeLayersInText}
              onSelectLetter={(char) => {
                setInputText((prev) => prev + char);
                setActiveTab('encrypt');
              }}
            />

            {/* Explanation Guide */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>كيف يعمل نظام "المشفر السباعي"؟</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <span className="font-bold text-stone-900 block text-sm">
                    ١. الطبقات السبع والأحرف الأربعة
                  </span>
                  <p>
                    تتوزع الحروف العربية الـ 28 بالترتيب الأبجدي التاريخي (أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ)
                    على 7 طبقات بمعدل 4 أحرف لكل طبقة، تبدأ بالطبقة السابعة (أ ب ج د) وتصل للطبقة الأولى (ذ ض ظ غ).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <span className="font-bold text-stone-900 block text-sm">
                    ٢. حرفا التشفير (الاحتمالان)
                  </span>
                  <p>
                    تحتوي كل طبقة على حرفين مشفرين ثابتين. عند تشفير أي حرف عربي، فإنه يستبدل بأحد حرفي طبقته؛
                    لذلك يمتلك كل حرف احتمالين اثنين دائمين.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <span className="font-bold text-stone-900 block text-sm">
                    ٣. التوليفات والتنوع
                  </span>
                  <p>
                    للكلمة المكونة من N أحرف يوجد 2^N احتمالاً مختلفاً للتشفير، مما يوفر تنوعاً كبيراً
                    في الرسائل المشفرة مع بقاء إمكانية فكها إلى الطبقات الأصلية.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Decryption & Layer Decoder */}
        {activeTab === 'decrypt' && (
          <div>
            <DecryptView />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>برنامج المشفر السباعي — تشفير الحروف العربية بنظام الطبقات والأبجدية القديمة</p>
          <p className="text-stone-400">7 طبقات × 4 أحرف = 28 حرفاً عربياً</p>
        </div>
      </footer>
    </div>
  );
}
