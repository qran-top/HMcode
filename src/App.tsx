import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { LetterAnalysisCard } from './components/LetterAnalysisCard';
import { EncryptionResults } from './components/EncryptionResults';
import { LayersTable } from './components/LayersTable';
import { DecryptView } from './components/DecryptView';
import { CompactLayersIndicator } from './components/CompactLayersIndicator';
import { Footer, PolicyModalType } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { analyzeWord } from './cipherData';
import { Eraser, Sparkles, Loader2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'table'>('encrypt');
  const [inputText, setInputText] = useState('بقرة');
  const [selectedProbabilities, setSelectedProbabilities] = useState<number[]>([]);
  const [activeLegalModal, setActiveLegalModal] = useState<PolicyModalType>(null);
  const [generateSignal, setGenerateSignal] = useState<number>(0);
  const [encryptGenStatus, setEncryptGenStatus] = useState<{ isGenerating: boolean; hasGenerated: boolean }>({
    isGenerating: false,
    hasGenerated: false,
  });

  // Detailed analysis of letters in the input string
  const details = useMemo(() => {
    return analyzeWord(inputText);
  }, [inputText]);

  // Ensure selected probabilities array length matches input length
  const currentProbabilities = useMemo(() => {
    return details.map((_, i) => selectedProbabilities[i] ?? 0);
  }, [details, selectedProbabilities]);

  // Toggle choice (0 or 1) for a specific letter index
  const handleToggleProbability = (index: number, probIndex: number) => {
    const next = [...currentProbabilities];
    next[index] = probIndex;
    setSelectedProbabilities(next);
  };

  const handleClear = () => {
    setInputText('');
    setSelectedProbabilities([]);
    setEncryptGenStatus({ isGenerating: false, hasGenerated: false });
  };

  // Trigger combinations generation and display
  const handleTriggerGenerate = () => {
    if (!inputText.trim()) return;
    setGenerateSignal((s) => s + 1);
  };

  // List of active layer numbers in current text for highlighting
  const activeLayersInText = useMemo(() => {
    const layers = new Set<number>();
    details.forEach((d) => {
      if (d.layer) {
        layers.add(d.layer.layer);
      }
    });
    return Array.from(layers);
  }, [details]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-stone-900" dir="rtl">
      {/* Header with simple title without long explanation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstructions={() => setActiveLegalModal('instructions')}
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 flex-1 space-y-4">
        {/* Tab 1: Encryption */}
        {activeTab === 'encrypt' && (
          <div className="space-y-4">
            {/* Input Card with Compact 7-Layer Rainbow Squares */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="arabic-input"
                    className="text-sm sm:text-base font-bold text-stone-900"
                  >
                    النص المراد تشفيره:
                  </label>
                  <span className="text-xs text-stone-400">
                    ({details.filter((d) => !d.isSpecialOrSpace).length} حرفاً)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* 7 Compact Rainbow Numbered Squares */}
                  <CompactLayersIndicator activeLayerNumbers={activeLayersInText} />
                </div>
              </div>

              {/* Input container: smaller Clear button on top, Generate button directly below it */}
              <div className="flex items-stretch gap-2.5">
                {/* Actions Column: smaller Clear button on top + Generate button underneath */}
                <div className="shrink-0 flex flex-col gap-1.5 justify-between w-32 sm:w-36">
                  {/* Smaller Clear button */}
                  <button
                    type="button"
                    id="clear-input-btn"
                    onClick={handleClear}
                    disabled={!inputText}
                    className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs inline-flex items-center justify-center gap-1 transition-all ${
                      inputText
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer'
                        : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
                    }`}
                    title="مسح النص بالكامل"
                  >
                    <Eraser className="w-3.5 h-3.5 text-rose-600" />
                    <span>مسح</span>
                  </button>

                  {/* Generate & Show Combinations button under Clear */}
                  <button
                    type="button"
                    id="generate-input-combos-btn"
                    onClick={handleTriggerGenerate}
                    disabled={!inputText.trim()}
                    className={`w-full flex-1 py-1.5 sm:py-2 px-2 rounded-xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all text-center leading-tight shadow-xs ${
                      !inputText.trim()
                        ? 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
                        : encryptGenStatus.isGenerating
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-wait'
                        : 'bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white border border-amber-700/30 cursor-pointer'
                    }`}
                    title="توليد وعرض قائمة الاحتمالات (أو اضغط Enter في مربع النص)"
                  >
                    {encryptGenStatus.isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
                        <span>جاري التوليد...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                        <span>توليد وعرض الاحتمالات</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  id="arabic-input"
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTriggerGenerate();
                    }
                  }}
                  placeholder="اكتب هنا بالعربية (واضغط Enter لتوليد الاحتمالات)..."
                  className="flex-1 text-xl sm:text-2xl font-bold p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right bg-stone-50/50 resize-none transition-all"
                />
              </div>
            </div>

            {/* Letter by letter analysis & Results */}
            {details.length > 0 && (
              <EncryptionResults
                details={details}
                selectedProbabilities={currentProbabilities}
                onSetSelectedProbabilities={setSelectedProbabilities}
                onToggleProbability={handleToggleProbability}
                generateSignal={generateSignal}
                onGenerationStateChange={setEncryptGenStatus}
              />
            )}
          </div>
        )}

        {/* Tab 2: Full 7-Layers Reference Table */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            <LayersTable
              highlightedLayerNumbers={activeLayersInText}
              onSelectLetter={(char) => {
                setInputText((prev) => prev + char);
                setActiveTab('encrypt');
              }}
            />
          </div>
        )}

        {/* Tab 3: Decryption */}
        {activeTab === 'decrypt' && (
          <div>
            <DecryptView />
          </div>
        )}
      </main>

      {/* Footer with Legal, Policies, Instructions & AI Honest Attribution */}
      <Footer onOpenModal={(type) => setActiveLegalModal(type)} />

      {/* Modal Dialog for Policies & Instructions */}
      <LegalModal
        type={activeLegalModal}
        onClose={() => setActiveLegalModal(null)}
      />
    </div>
  );
}
export default App;
