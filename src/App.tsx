import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { LetterAnalysisCard } from './components/LetterAnalysisCard';
import { EncryptionResults } from './components/EncryptionResults';
import { LayersTable } from './components/LayersTable';
import { DecryptView } from './components/DecryptView';
import { DualTranslator } from './components/DualTranslator';
import { SettingsView } from './components/SettingsView';
import { CompactLayersIndicator } from './components/CompactLayersIndicator';
import { Footer, PolicyModalType } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { PWAPrompt } from './components/PWAPrompt';
import { analyzeWord } from './cipherData';
import { useCipherLayers } from './context/CipherLayersContext';
import { Eraser, Sparkles, Loader2, Settings2 } from 'lucide-react';

export function App() {
  const { analyzeText, isCustomized } = useCipherLayers();
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'table' | 'dual' | 'settings'>('dual');
  const [inputText, setInputText] = useState('');
  const [decryptCipherInput, setDecryptCipherInput] = useState('');
  const [selectedProbabilities, setSelectedProbabilities] = useState<number[]>([]);
  const [activeLegalModal, setActiveLegalModal] = useState<PolicyModalType>(null);
  const [generateSignal, setGenerateSignal] = useState<number>(0);
  const [encryptGenStatus, setEncryptGenStatus] = useState<{ isGenerating: boolean; hasGenerated: boolean }>({
    isGenerating: false,
    hasGenerated: false,
  });

  // Detailed analysis of letters in the input string using active layers table
  const details = useMemo(() => {
    return analyzeText(inputText);
  }, [inputText, analyzeText]);

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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-stone-900 transition-colors duration-200" dir="rtl">
      {/* Header with simple title without long explanation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstructions={() => setActiveLegalModal('instructions')}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 flex-1 space-y-4 overflow-x-hidden">
        {/* Tab 1: Encryption (Preserved across tab switches) */}
        <div className={activeTab === 'encrypt' ? 'space-y-4' : 'hidden'}>
          {/* Input Card with Compact 7-Layer Rainbow Squares */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-3.5 sm:p-5 max-w-full overflow-hidden transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="arabic-input"
                  className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100"
                >
                  النص المراد تشفيره:
                </label>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  ({details.filter((d) => !d.isSpecialOrSpace).length} حرفاً)
                </span>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('table')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                    title="يتم تطبيق جدول الطبقات المخصص - انقر لعرضه أو تعديله"
                  >
                    <Settings2 className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>جدول مخصص نشط</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 max-w-full flex-wrap py-0.5">
                {/* Compact Rainbow Numbered Squares */}
                <CompactLayersIndicator activeLayerNumbers={activeLayersInText} />
              </div>
            </div>

            {/* Input container: responsive on mobile (flex-col-reverse on mobile, row on sm+) */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch gap-2.5 w-full max-w-full">
              {/* Actions Column / Row on mobile */}
              <div className="shrink-0 flex flex-row sm:flex-col gap-1.5 w-full sm:w-36">
                {/* Smaller Clear button */}
                <button
                  type="button"
                  id="clear-input-btn"
                  onClick={handleClear}
                  disabled={!inputText}
                  className={`flex-1 sm:w-full py-2 sm:py-1.5 px-2 rounded-lg font-bold text-xs inline-flex items-center justify-center gap-1 transition-all ${
                    inputText
                      ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer'
                      : 'bg-stone-100 dark:bg-stone-800/40 text-stone-300 dark:text-stone-600 border border-stone-200 dark:border-stone-800 cursor-not-allowed opacity-60'
                  }`}
                  title="مسح النص بالكامل"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>مسح</span>
                </button>

                {/* Generate & Show Combinations button */}
                <button
                  type="button"
                  id="generate-input-combos-btn"
                  onClick={handleTriggerGenerate}
                  disabled={!inputText.trim()}
                  className={`flex-2 sm:w-full sm:flex-1 py-2 sm:py-2 px-2 rounded-xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all text-center leading-tight shadow-xs ${
                    !inputText.trim()
                      ? 'bg-stone-100 dark:bg-stone-800/40 text-stone-300 dark:text-stone-600 border border-stone-200 dark:border-stone-800 cursor-not-allowed opacity-60'
                      : encryptGenStatus.isGenerating
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-wait'
                      : 'bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white border border-amber-700/30 cursor-pointer shadow-amber-900/20'
                  }`}
                  title="توليد وعرض قائمة الاحتمالات (أو اضغط Enter في مربع النص)"
                >
                  {encryptGenStatus.isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 dark:text-amber-400 shrink-0" />
                      <span>جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                      <span>توليد وعرض الاحتمالات</span>
                    </>
                  )}
                </button>
              </div>

              <input
                id="arabic-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTriggerGenerate();
                  }
                }}
                placeholder="اكتب كلمة أو كلمتين هنا..."
                className="w-full sm:flex-1 min-w-0 max-w-full box-border text-base sm:text-xl font-bold p-3 sm:p-3.5 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-all"
              />
            </div>
          </div>

          {/* Letter by letter analysis & Results */}
          {details.length > 0 && details.some(d => d.layer === null && !d.isSpecialOrSpace) ? (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 font-bold text-lg">
              لا توجد حروف في الجدول تقابل هذه الكلمة
            </div>
          ) : details.length > 0 ? (
            <EncryptionResults
              details={details}
              selectedProbabilities={currentProbabilities}
              onSetSelectedProbabilities={setSelectedProbabilities}
              onToggleProbability={handleToggleProbability}
              generateSignal={generateSignal}
              onGenerationStateChange={setEncryptGenStatus}
            />
          ) : null}
        </div>

        {/* Tab 2: Full Layers Reference Table (Preserved across tab switches) */}
        <div className={activeTab === 'table' ? 'space-y-4' : 'hidden'}>
          <LayersTable
            highlightedLayerNumbers={activeLayersInText}
            onSelectLetter={(char) => {
              setInputText((prev) => prev + char);
            }}
          />
        </div>

        {/* Tab 3: Decryption (Preserved across tab switches) */}
        <div className={activeTab === 'decrypt' ? 'block' : 'hidden'}>
          <DecryptView
            cipherInput={decryptCipherInput}
            onCipherInputChange={setDecryptCipherInput}
          />
        </div>

        {/* Tab 4: Dual Translator */}
        <div className={activeTab === 'dual' ? 'block' : 'hidden'}>
          <DualTranslator 
            onNavigateToEncrypt={(text) => {
              setInputText(text);
              setActiveTab('encrypt');
            }}
            onNavigateToDecrypt={(text) => {
              setDecryptCipherInput(text);
              setActiveTab('decrypt');
            }}
          />
        </div>

        {/* Tab 5: Settings */}
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsView />
        </div>
      </main>

      {/* Footer with Legal, Policies, Instructions & AI Honest Attribution */}
      <Footer onOpenModal={(type) => setActiveLegalModal(type)} />

      {/* Modal Dialog for Policies & Instructions */}
      <PWAPrompt />
      <LegalModal
        type={activeLegalModal}
        onClose={() => setActiveLegalModal(null)}
      />
    </div>
  );
}
export default App;
